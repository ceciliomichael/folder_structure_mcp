#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
// Get the directory where the script is located
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Define parameter types
interface ListStructureParams {
  dir: string;
}

// Get the directory where this script is located
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default excludes to use if no .listignore file is found
const defaultExcludes = [
  "node_modules", 
  ".git", 
  ".svn", 
  "dist", 
  "build", 
  "coverage", 
  "bin", 
  "obj", 
  ".vs", 
  ".vscode", 
  "__pycache__", 
  "*.pyc", 
  "*.pyo"
];

// Function to read and parse .listignore file from the script's directory
async function readListIgnore(): Promise<string[]> {
  try {
    // Look for .listignore in the same directory as this script
    const scriptDir = path.resolve(__dirname, '..');
    const ignoreFilePath = path.join(scriptDir, '.listignore');
    console.error(`[list_structure] Looking for .listignore at: ${ignoreFilePath}`);
    
    const content = await fs.readFile(ignoreFilePath, 'utf-8');
    
    // Parse the .listignore file content
    const patterns = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#')); // Remove empty lines and comments
    
    console.error(`[list_structure] Found .listignore file with ${patterns.length} patterns`);
    return patterns;
  } catch (error) {
    // If file doesn't exist or can't be read, use default excludes
    console.error(`[list_structure] No .listignore file found or error reading it, using default excludes`);
    return defaultExcludes;
  }
}

// Function to check if a path matches a glob pattern
function matchesPattern(name: string, pattern: string): boolean {
  // Simple glob matching for common patterns
  if (pattern.startsWith('*') && pattern.endsWith('*')) {
    // *text* pattern (contains)
    const substring = pattern.slice(1, -1);
    return name.includes(substring);
  } else if (pattern.startsWith('*')) {
    // *.ext pattern (extension)
    const suffix = pattern.slice(1);
    return name.endsWith(suffix);
  } else if (pattern.endsWith('*')) {
    // prefix* pattern (starts with)
    const prefix = pattern.slice(0, -1);
    return name.startsWith(prefix);
  } else if (pattern.includes('*')) {
    // Complex pattern with * in the middle
    const parts = pattern.split('*');
    return parts.every((part, index) => {
      if (index === 0) return name.startsWith(part);
      if (index === parts.length - 1) return name.endsWith(part);
      return name.includes(part);
    });
  } else {
    // Exact match
    return name === pattern;
  }
}

// Utility function to resolve paths relative to the current working directory
function resolvePath(inputPath: string): string {
  try {
    // First, try to decode any URL-encoded characters in the path
    let correctedPath = decodeURIComponent(inputPath);
    console.error(`[Path Decoding] Input path: "${inputPath}" → Decoded: "${correctedPath}"`);
    
    // Correct paths like /c/ to C:/ (missing colon)
    if (correctedPath.match(/^\/[a-zA-Z]\//)) {
      const driveLetter = correctedPath.charAt(1).toUpperCase();
      correctedPath = `${driveLetter}:${correctedPath.substring(2)}`;
      console.error(`[Path Correction] Fixed missing colon: "${inputPath}" → "${correctedPath}"`);
    }
    
    // Correct common Windows path issue /c:/ -> C:/
    if (correctedPath.match(/^\/[a-zA-Z]:\//)) {
      correctedPath = correctedPath.substring(1);
      console.error(`[Path Correction] Fixed malformed path: "${inputPath}" → "${correctedPath}"`);
    }
    
    // Handle paths with %3A that weren't properly decoded (fallback)
    if (correctedPath.includes('%3A')) {
      correctedPath = correctedPath.replace(/%3A/g, ':');
      console.error(`[Path Correction] Fixed encoded colon: "${inputPath}" → "${correctedPath}"`);
    }
    
    // If path is absolute, return as is
    if (path.isAbsolute(correctedPath)) {
      return correctedPath;
    }
    
    // Otherwise, resolve relative to the current working directory
    const resolvedPath = path.resolve(process.cwd(), correctedPath);
    console.error(`[Path Resolution] Relative path "${correctedPath}" resolved to "${resolvedPath}"`);
    return resolvedPath;
  } catch (error) {
    console.error(`[Path Resolution Error] Failed to process path "${inputPath}":`, error);
    // If decoding fails, try to use the original path as a fallback
    if (path.isAbsolute(inputPath)) {
      return inputPath;
    }
    return path.resolve(process.cwd(), inputPath);
  }
}

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
      
      return {
        content: [{ 
          type: "text", 
          text: `Directory structure for ${resolvedDir}:\n\n${formattedStructure}` 
        }]
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
        const resolvedFilePath = resolvePath(filePath); // Using the existing resolvePath function
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

// Start the server using stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[MCP Server] FileSystemStructureTool running on stdio"); 