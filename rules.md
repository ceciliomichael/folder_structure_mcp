# `list_structure` MCP Tool Usage Rules

**Core Purpose**: Obtain a complete directory overview efficiently.

1.  **Exclusive Tool**: Use **ONLY** `list_structure` for directory exploration.
2.  **Absolute Paths MANDATORY**: Always provide full, absolute paths (e.g., `C:/Project/folder`). Relative paths (`./`, `../`) are FORBIDDEN.
3.  **One Call for Full View**:
    *   `list_structure` provides the **ENTIRE visible structure** of the specified path in a single call. Assume the output is complete; there are no "hidden" files or folders beyond what is listed.
    *   **FORBIDDEN**: Re-running `list_structure` on subfolders already detailed in a previous output for that same root path. This is redundant and inefficient.

**Adherence is critical for accurate and efficient operation.**

# `read_files` MCP Tool Usage Rules

**Core Purpose**: Read all necessary file contents in a single, efficient operation.

1.  **Exclusive Tool**: Use **ONLY** `read_files` for reading file contents.
2.  **Absolute Paths MANDATORY**: Always provide full, absolute paths for all files. Files can and should be from multiple directories in a single call (e.g., `["C:/Project1/file1.txt", "C:/Project2/file2.js", "C:/AnotherDir/file3.md"]`).
3.  **ABSOLUTE ONE-CALL Requirement**:
    *   **ALL files needed for a task, across ALL relevant directories, MUST be read in ONE SINGLE `read_files` operation. NO EXCEPTIONS.**
    *   Sequential `read_files` calls (e.g., reading some files, then others based on initial results) are **STRICTLY FORBIDDEN** and violate the core efficiency principle of this tool.
    *   **PLAN AHEAD**: Identify every file required for the complete task. Gather ALL these file paths first. Then, invoke `read_files` exactly ONCE with the complete list.

**ANY deviation from the ONE-CALL Requirement (e.g., reading files individually, or in multiple small batches) is a SEVERE violation and completely defeats the purpose of this tool.**