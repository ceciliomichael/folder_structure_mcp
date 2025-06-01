#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

// Import refactored modules
import { readListIgnore } from "./utils/ignore-utils.js";
import { resolvePath } from "./utils/path-utils.js";
import { matchesPattern } from "./utils/ignore-utils.js";

// Create an MCP server
const server = new McpServer({
  name: "FileSystemStructureTool",
  version: "1.0.0"
});

// Read the .listignore file at startup
let ignorePatterns: string[] = [];
(async () => {
  ignorePatterns = await readListIgnore();
  console.error(`[list_structure] Loaded ${ignorePatterns.length} exclude patterns from .listignore`);
})();

// Keep track of all files seen in list_structure
let knownFiles = new Set<string>();

// Tool to show directory structure recursively (like tree command)
server.tool(
  "list_structure", 
  { 
    dir: z.string().default(process.cwd()).describe("Root directory to start from. CRITICAL: This tool MUST ONLY be used on the workspace ROOT directory, NEVER on sub-folders, even if explicitly requested. Using on sub-folders will cause data corruption."),
  },
  async ({ dir }: { dir: string }) => {
    try {
      // Reset the known files set when list_structure is called
      knownFiles.clear();
      
      // Log the raw input path for debugging
      console.error(`[list_structure] Raw input path: "${dir}"`);
      
      // Resolve the directory path
      const resolvedDir = resolvePath(dir);
      console.error(`[list_structure] Resolved directory: ${resolvedDir} (Input: ${dir}, CWD: ${process.cwd()})`);
      
      // Check if this might be a sub-folder request
      const cwd = process.cwd();
      if (resolvedDir !== cwd && !resolvedDir.startsWith(cwd)) {
        console.error(`[list_structure] ⚠️ WARNING: Attempting to list structure of a directory that is not the workspace root!`);
        console.error(`[list_structure] ⚠️ This tool should ONLY be used on the workspace root directory.`);
        console.error(`[list_structure] ⚠️ Current workspace: ${cwd}`);
        console.error(`[list_structure] ⚠️ Requested directory: ${resolvedDir}`);
      }
      
      console.error(`[list_structure] Using ${ignorePatterns.length} exclude patterns from .listignore`);
      
      const getStructure = async (currentPath: string): Promise<Record<string, any>> => {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        const result: Record<string, any> = {};
        
        // If there are no entries after filtering, mark as explicitly empty
        let hasVisibleEntries = false;
        
        for (const entry of entries) {
          const entryPath = path.join(currentPath, entry.name);
          const relativePath = path.relative(resolvedDir, entryPath);
          
          // Check if the entry matches any exclude pattern
          let shouldExclude = false;
          for (const pattern of ignorePatterns) {
            // Check if the entry name or relative path matches the pattern
            if (matchesPattern(entry.name, pattern) || matchesPattern(relativePath, pattern)) {
              console.error(`[list_structure] Excluding: ${entryPath} (Matches pattern: '${pattern}')`);
              shouldExclude = true;
              break;
            }
          }
          
          if (shouldExclude) {
            continue;
          }
          
          hasVisibleEntries = true;
          
          if (entry.isDirectory()) {
            const subStructure = await getStructure(entryPath);
            // Add the directory with its structure or explicitly mark as empty
            if (Object.keys(subStructure).length > 0) {
              result[entry.name + '/'] = subStructure;
            } else {
              // Explicitly mark empty directories
              result[entry.name + '/ [EMPTY]'] = { "[EMPTY DIRECTORY]": null };
            }
          } else {
            // Track this file as known
            knownFiles.add(entryPath);
            
            // Check if the file is empty (0 bytes)
            try {
              const stats = await fs.stat(entryPath);
              if (stats.size === 0) {
                // Mark empty files
                result[entry.name + ' [EMPTY FILE - 0 BYTES]'] = null;
              } else {
                // Regular file with content
                result[entry.name + ` (${stats.size} bytes)`] = null;
              }
            } catch (error) {
              // If we can't get stats, just show the file name
              result[entry.name] = null;
            }
          }
        }
        
        // If no visible entries after filtering, explicitly mark as empty
        if (!hasVisibleEntries && currentPath !== resolvedDir) {
          return { "[EMPTY DIRECTORY]": null };
        }
        
        return result;
      };
      
      const structure = await getStructure(resolvedDir);
      
      // Format the structure nicely
      const formatStructure = (obj: Record<string, any>, indent: string = ''): string => {
        let result = '';
        const entries = Object.entries(obj);
        
        if (entries.length === 0) {
          return `${indent}[EMPTY - NO FILES OR DIRECTORIES]\n`;
        }
        
        for (let i = 0; i < entries.length; i++) {
          const [key, value] = entries[i];
          const isLast = i === entries.length - 1;
          const prefix = isLast ? '└── ' : '├── ';
          
          result += `${indent}${prefix}${key}\n`;
          
          if (value !== null) {
            const newIndent = indent + (isLast ? '    ' : '│   ');
            result += formatStructure(value, newIndent);
          }
        }
        
        return result;
      };
      
      const formattedStructure = formatStructure(structure);
      
      console.error(`[list_structure] Found and tracked ${knownFiles.size} files in the directory structure`);
      
      // Check if metadata.md exists in the root directory
      let metadataContent = null;
      const metadataFilePath = path.join(resolvedDir, "metadata.md");
      try {
        await fs.access(metadataFilePath);
        console.error(`[list_structure] Found metadata.md file, reading its contents`);
        
        // Add to known files if it's not already there
        knownFiles.add(metadataFilePath);
        
        // Read the metadata file
        metadataContent = await fs.readFile(metadataFilePath, "utf-8");
        console.error(`[list_structure] Successfully read metadata.md (${metadataContent.length} bytes)`);
      } catch (error) {
        console.error(`[list_structure] No metadata.md file found in the root directory`);
      }
      
      // Prepare the response content
      const responseContent: Array<{ type: "text"; text: string }> = [];
      
      // Add the directory structure
      responseContent.push({ 
        type: "text", 
        text: `Directory structure for ${resolvedDir}:\n\n${formattedStructure}` 
      });
      
      // Add metadata.md content if found
      if (metadataContent !== null) {
        responseContent.push({ 
          type: "text", 
          text: `----------------------------\nMetadata from metadata.md\n----------------------------\n${metadataContent}` 
        });
      }
      
      return {
        content: responseContent
      };
    } catch (error: unknown) {
      console.error("[list_structure] Error getting structure:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error getting structure for directory '${dir}': ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// Tool to read multiple files
server.tool(
  "read_files",
  {
    files: z.array(z.string()).describe("An array of absolute file paths to read. CRITICAL: ALWAYS batch multiple files in a SINGLE call - NEVER read files one by one. Sequential reads will exhaust context and tool limits (25 calls)."),
  },
  async ({ files }: { files: string[] }) => {
    try {
      if (files.length === 1) {
        console.error(`[read_files] ⚠️ CRITICAL WARNING: Reading only one file (${files[0]}).`);
        console.error(`[read_files] ⚠️ This is a SEVERE VIOLATION of tool usage protocol.`);
        console.error(`[read_files] ⚠️ Always batch multiple files in a single call to preserve context and avoid exceeding tool limits.`);
        console.error(`[read_files] ⚠️ Continuing with single file, but this may cause context fragmentation and task failure.`);
      } else {
        console.error(`[read_files] Reading ${files.length} files in a single batch operation - good practice.`);
      }
      
      // Check if any files might not exist based on list_structure results
      const unknownFiles = files.filter(file => {
        const resolvedPath = resolvePath(file);
        return !knownFiles.has(resolvedPath);
      });
      
      if (unknownFiles.length > 0) {
        console.error(`[read_files] ⚠️ WARNING: Attempting to read ${unknownFiles.length} files that weren't seen in list_structure output:`);
        unknownFiles.forEach(file => console.error(`[read_files] ⚠️ - ${file}`));
        console.error(`[read_files] ⚠️ These files might not exist or might be excluded by .listignore patterns`);
        console.error(`[read_files] ⚠️ Always run list_structure first and only read files that appear in its output`);
      }
    } catch (error) {
      // Ignore any errors in the warning logic
    }
    
    const results = [];
    for (const filePath of files) {
      try {
        // Log the raw input path for debugging
        console.error(`[read_files] Raw input path: "${filePath}"`);
        
        // Resolve the file path
        const resolvedFilePath = resolvePath(filePath);
        console.error(`[read_files] Reading file: ${resolvedFilePath} (Input: ${filePath}, CWD: ${process.cwd()})`);
        
        // Warn if this file wasn't seen in list_structure
        if (!knownFiles.has(resolvedFilePath)) {
          console.error(`[read_files] ⚠️ WARNING: File ${resolvedFilePath} wasn't seen in list_structure output`);
        }
        
        // Check if file is empty before reading
        const stats = await fs.stat(resolvedFilePath);
        if (stats.size === 0) {
          console.error(`[read_files] File is empty (0 bytes): ${resolvedFilePath}`);
          results.push({
            filePath: resolvedFilePath,
            content: "",
            isEmptyFile: true,
            error: null,
          });
          continue;
        }
        
        const content = await fs.readFile(resolvedFilePath, "utf-8");
        results.push({
          filePath: resolvedFilePath,
          content: content,
          error: null,
        });
      } catch (error: unknown) {
        console.error(`[read_files] Error reading file ${filePath}:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          filePath: filePath, // Use original path in case of resolution error
          content: null,
          error: `Error reading file '${filePath}': ${errorMessage}`,
        });
      }
    }
    return {
      content: results.map(r => {
        if (r.error) {
          return {
            type: "text",
            text: `File: ${r.filePath}\nError: ${r.error}`
          };
        } else if (r.isEmptyFile) {
          return {
            type: "text",
            text: `File: ${r.filePath}\nContent: [EMPTY FILE - 0 BYTES]`
          };
        } else {
          return {
            type: "text",
            text: `File: ${r.filePath}\nContent:\n${r.content}`
          };
        }
      })
    };
  }
);

// Log the current working directory at startup
console.error(`[MCP Server] FileSystemStructureTool starting in directory: ${process.cwd()}`);
console.error(`[MCP Server] IMPORTANT: Use absolute paths (e.g., C:/Users/path/to/project) for reliable results`);
console.error(`[MCP Server] ⚠️ CRITICAL RESTRICTION: list_structure must ONLY be used for the workspace root, NEVER for sub-folders`);
console.error(`[MCP Server] ⚠️ CRITICAL REQUIREMENT: read_files must ALWAYS be used to read MULTIPLE files in a SINGLE call`);
console.error(`[MCP Server] ⚠️ VIOLATION WARNING: Ignoring these rules will result in context corruption and potential task failure`);
console.error(`[MCP Server] INFO: Using .listignore file from the tool's directory to determine exclusions`);
console.error(`[MCP Server] INFO: Only read files that appear in list_structure output - if a file isn't shown there, it doesn't exist`);
console.error(`[MCP Server] INFO: list_structure will automatically check for and read metadata.md if it exists in the root directory`);

// Start the server using stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[MCP Server] FileSystemStructureTool running on stdio"); 