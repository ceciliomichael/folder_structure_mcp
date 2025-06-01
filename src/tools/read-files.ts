import fs from "fs/promises";
import { ReadFilesParams, FileReadResult } from "../types.js";
import { resolvePath } from "../utils/path-utils.js";
import { knownFiles } from "./list-structure.js";

/**
 * Implementation of the read_files tool
 * Reads multiple files in a single operation
 */
export async function readFiles({ files }: ReadFilesParams) {
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
  
  const results: FileReadResult[] = [];
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