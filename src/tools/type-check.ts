import { exec } from "child_process";
import { promisify } from "util";
import { TypeCheckParams } from "../types.js";
import { resolvePath } from "../utils/path-utils.js";

const execPromise = promisify(exec);

/**
 * Implementation of the type_check tool
 * Executes TypeScript compiler to check for type errors
 */
export async function typeCheck({ dir }: TypeCheckParams) {
  // Log the raw input path for debugging
  console.error(`[type_check] Raw input path: "${dir}"`);
  
  // Resolve the directory path
  const resolvedDir = resolvePath(dir);
  console.error(`[type_check] Resolved directory: ${resolvedDir} (Input: ${dir}, CWD: ${process.cwd()})`);
  
  // Set a timeout for the command execution (30 seconds)
  const timeoutMs = 30000;
  
  console.error(`[type_check] Executing tsc --noEmit --pretty in ${resolvedDir}`);

  try {
    // If execPromise resolves, it means tsc exited with 0, so no type errors were found.
    await execPromise('tsc --noEmit --pretty', { 
      cwd: resolvedDir,
      timeout: timeoutMs,
      maxBuffer: 1024 * 5120 // 5MB buffer for large outputs
    });
    
    console.error(`[type_check] TypeScript compiler completed successfully`);
    return {
      content: [{ type: "text" as const, text: "TypeScript type check completed successfully. No type errors found." }]
    };

  } catch (error: any) { 
    // If execPromise rejects, it's either because tsc found type errors (and exited with a non-zero code)
    // or because of an actual execution error.
    
    // Case 1: tsc ran and found type errors. The output is in `stdout`.
    // This is the expected behavior for a project with type errors.
    if (error.stdout) {
      console.error(`[type_check] TypeScript compiler found issues.`);
      return {
        content: [{ 
          type: "text" as const, 
          text: `TypeScript type check found issues:\n\n${error.stdout}` 
        }]
      };
    }
    
    // Case 2: An actual execution error occurred.
    console.error("[type_check] Unhandled error executing TypeScript compiler:", error);
    
    let errorMessage: string;
    
    if (error.code === 'ETIMEDOUT') {
      errorMessage = "TypeScript type check timed out. The project might be too large or complex to check within 30 seconds.";
    } 
    else if (error.code === 'ENOENT') {
      errorMessage = "TypeScript compiler (tsc) not found. Make sure TypeScript is installed in the project (`npm install -g typescript` or in local `devDependencies`).";
    } 
    else {
      // For other errors, provide stderr if available, otherwise the raw error.
      const details = error.stderr || error.message || String(error);
      errorMessage = `An unexpected error occurred while running the TypeScript compiler: ${details}`;
    }
    
    return {
      content: [{ type: "text" as const, text: errorMessage }],
      isError: true
    };
  }
} 