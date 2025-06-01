import fs from "fs/promises";
import path from "path";
import { ListStructureParams, DirectoryStructure } from "../types.js";
import { resolvePath } from "../utils/path-utils.js";
import { matchesPattern } from "../utils/ignore-utils.js";

// Set of known files discovered during list_structure operation
export const knownFiles = new Set<string>();

/**
 * Implementation of the list_structure tool
 * Shows directory structure recursively (like tree command)
 */
export async function listStructure({ dir }: ListStructureParams) {
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
    
    // Get the ignore patterns from the module that registers this tool
    const ignorePatterns = (global as any).ignorePatterns || [];
    console.error(`[list_structure] Using ${ignorePatterns.length} exclude patterns from .listignore`);
    
    const getStructure = async (currentPath: string): Promise<DirectoryStructure> => {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      const result: DirectoryStructure = {};
      
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
    const formatStructure = (obj: DirectoryStructure, indent: string = ''): string => {
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