import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory where this script is located
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default excludes to use if no .listignore file is found
export const defaultExcludes = [
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

/**
 * Function to read and parse .listignore file from the script's directory
 * @returns Array of patterns to ignore
 */
export async function readListIgnore(): Promise<string[]> {
  try {
    // Look for .listignore in the root directory (two levels up from utils)
    const scriptDir = path.resolve(__dirname, '../..');
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

/**
 * Function to check if a path matches a glob pattern
 * @param name The name or path to check
 * @param pattern The glob pattern to match against
 * @returns True if the name matches the pattern
 */
export function matchesPattern(name: string, pattern: string): boolean {
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