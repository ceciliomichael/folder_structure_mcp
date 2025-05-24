#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

// Define parameter types
interface ListStructureParams {
  dir: string;
  depth: number;
  exclude: string[];
}

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

// Utility function to resolve paths relative to the current working directory
function resolvePath(inputPath: string): string {
  let correctedPath = inputPath;
  // Correct common Windows path issue /c:/ -> C:/
  if (correctedPath.match(/^\/[a-zA-Z]:\//)) {
    correctedPath = correctedPath.substring(1);
    console.error(`[Path Correction] Fixed malformed path: "${inputPath}" → "${correctedPath}"`);
  }

  // If path is absolute, return as is
  if (path.isAbsolute(correctedPath)) {
    return correctedPath;
  }
  
  // Otherwise, resolve relative to the current working directory
  const resolvedPath = path.resolve(process.cwd(), correctedPath);
  console.error(`[Path Resolution] Relative path "${correctedPath}" resolved to "${resolvedPath}"`);
  return resolvedPath;
}

// Create an MCP server
const server = new McpServer({
  name: "FileSystemStructureTool",
  version: "1.0.0"
});

// Tool to show directory structure recursively (like tree command)
server.tool(
  "list_structure", 
  { 
    dir: z.string().default(process.cwd()).describe("Root directory to start from. IMPORTANT: Prefer absolute paths (e.g., C:/Users/path/to/project) over relative paths to avoid resolution issues."),
    depth: z.number().default(3).describe("Maximum depth to traverse"),
    exclude: z.array(z.string()).default(defaultExcludes).describe("Directories/patterns to exclude")
  },
  async ({ dir, depth, exclude }: ListStructureParams) => {
    try {
      // Resolve the directory path
      const resolvedDir = resolvePath(dir);
      console.error(`[list_structure] Resolved directory: ${resolvedDir} (Input: ${dir}, CWD: ${process.cwd()})`);
      
      const getStructure = async (currentPath: string, currentDepth: number): Promise<Record<string, any>> => {
        if (currentDepth > depth) return {};
        
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        const result: Record<string, any> = {};
        
        for (const entry of entries) {
          const entryPath = path.join(currentPath, entry.name);
          
          // Check for directory exclusion first
          if (entry.isDirectory()) {
            if (exclude.includes(entry.name)) {
              console.error(`[list_structure] Excluding directory: ${entryPath} (Matches exclude list: '${entry.name}')`);
              continue;
            }
          } else { // It's a file, apply file-specific patterns from 'exclude'
            let shouldExcludeFile = false;
            for (const pattern of exclude) {
              if (pattern.startsWith("*.")) { // Handle glob like *.pyc
                if (entry.name.endsWith(pattern.substring(1))) {
                  console.error(`[list_structure] Excluding file: ${entryPath} (Matches glob pattern: '${pattern}')`);
                  shouldExcludeFile = true;
                  break;
                }
              }
              // Note: Other types of file patterns (e.g., exact match for a file name if it were in defaultExcludes)
              // are not explicitly handled here as current defaultExcludes uses directory names or *.ext globs.
              // Directory names are handled by the check above.
            }
            if (shouldExcludeFile) {
              continue;
            }
          }
          
          if (entry.isDirectory()) {
            const subStructure = await getStructure(entryPath, currentDepth + 1);
            if (Object.keys(subStructure).length > 0 || currentDepth < depth) {
              result[entry.name + '/'] = subStructure;
            }
          } else {
            result[entry.name] = null;
          }
        }
        
        return result;
      };
      
      const structure = await getStructure(resolvedDir, 0);
      
      // Format the structure nicely
      const formatStructure = (obj: Record<string, any>, indent: string = ''): string => {
        let result = '';
        const entries = Object.entries(obj);
        
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
    files: z.array(z.string()).describe("An array of absolute file paths to read."),
  },
  async ({ files }: { files: string[] }) => {
    const results = [];
    for (const filePath of files) {
      try {
        // Resolve the file path
        const resolvedFilePath = resolvePath(filePath); // Using the existing resolvePath function
        console.error(`[read_files] Reading file: ${resolvedFilePath} (Input: ${filePath}, CWD: ${process.cwd()})`);
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
      content: results.map(r => ({
        type: "text",
        text: r.error 
              ? `File: ${r.filePath}\nError: ${r.error}` 
              : `File: ${r.filePath}\nContent:\n${r.content}`
      }))
    };
  }
);

// Log the current working directory at startup
console.error(`[MCP Server] FileSystemStructureTool starting in directory: ${process.cwd()}`);
console.error(`[MCP Server] IMPORTANT: Use absolute paths (e.g., C:/Users/path/to/project) for reliable results`);

// Start the server using stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[MCP Server] FileSystemStructureTool running on stdio"); 