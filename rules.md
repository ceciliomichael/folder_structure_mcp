# `list_structure` MCP Tool Usage Rules

**Core Purpose**: Efficiently explore directory structures and their contents.

1.  **Exclusive Tool**: `list_structure` is the **ONLY** permitted tool for directory exploration. Built-in tools like `list_dir` are strictly prohibited.
    *   *Benefit*: Optimizes interactions, leverages custom features (e.g., default exclusions, tree-like output).

2.  **Path Requirement**: **ALWAYS use ABSOLUTE PATHS** when invoking `list_structure`.
    *   *Example (Windows)*: `C:/Users/YourUser/Projects/MyProject` or `C:\Users\YourUser\Projects\MyProject`
    *   **STRICTLY PROHIBITED**: Relative paths (`.` , `./`, `../`) or malformed paths (`/c:/...`). These cause unpredictable behavior and errors.

**Adherence to these rules is critical for stable and accurate operation.**

# `read_files` MCP Tool Usage Rules

**Core Purpose**: Efficiently read multiple files at once.

1.  **Exclusive Tool**: `read_files` is the **ONLY** permitted tool for reading file contents. Built-in tools like `read_file` are strictly prohibited.
    *   *Benefit*: Optimizes interactions by reading multiple files in a single call, reducing the number of tool calls needed.

2.  **Path Requirement**: **ALWAYS use ABSOLUTE PATHS** when invoking `read_files`.
    *   *Example (Windows)*: `C:/Users/YourUser/Projects/MyProject/file.txt` or `C:\Users\YourUser\Projects\MyProject\file.txt`
    *   **STRICTLY PROHIBITED**: Relative paths (`.` , `./`, `../`) or malformed paths (`/c:/...`). These cause unpredictable behavior and errors.

3.  **Batch Reading Requirement**: **ALWAYS READ MULTIPLE FILES TOGETHER** in a single `read_files` call. Reading files one by one is **STRICTLY PROHIBITED** and defeats the entire purpose of this tool.
    *   **CORRECT**: `read_files(["C:/path/to/file1.txt", "C:/path/to/file2.txt", "C:/path/to/file3.txt"])`
    *   **STRICTLY PROHIBITED**: Making separate calls to read each file individually - this creates unnecessary overhead and latency
    *   This rule applies even when only a single file is needed initially - you should anticipate and batch read related files that might be needed later

**Adherence to these rules is critical for stable and accurate operation.** 