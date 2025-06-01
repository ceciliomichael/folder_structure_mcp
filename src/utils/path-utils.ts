import path from "path";

/**
 * Utility function to resolve paths relative to the current working directory
 * Handles various path formats and encoding issues
 */
export function resolvePath(inputPath: string): string {
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