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
2.  **Absolute Paths MANDATORY**: Always provide full, absolute paths for all files (e.g., `["C:/Project/file1.txt", "C:/Project/file2.js"]`). Relative paths are FORBIDDEN.
3.  **Consolidated Reading – ONE CALL Strategy**:
    *   **ALWAYS read ALL relevant files for the current task or analysis in a SINGLE `read_files` call.**
    *   Identify all files needed upfront and batch them.
    *   **FORBIDDEN**: Reading files individually or in small, sequential batches. This drastically increases tool calls and is inefficient.
    *   **Trust File Content**: If `read_files` returns empty content for a file, accept it as truly empty. Do not re-read assuming missing data.

**Adherence is critical for minimizing tool calls and ensuring efficient operation.**