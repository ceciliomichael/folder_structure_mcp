# MCP FileSystem Structure Tool

An MCP (Model Context Protocol) server that provides a tool for exploring directory structures. This allows AI assistants to view and understand the organization of file systems through standardized tool calls.

## Features

- **list_structure**: Shows directory structure recursively (like a tree command) with customizable depth and exclusion filters

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. If you encounter module resolution issues with the MCP SDK, you may need to install it globally:
   ```
   npm install -g @modelcontextprotocol/sdk
   npm link @modelcontextprotocol/sdk
   ```
4. Build the project:
   ```
   npm run build
   ```

## Usage

### Running the Server

The server uses stdio for communication, so it needs to be started by an MCP client:

```bash
node dist/index.js
```

### AI Usage Guidelines

This project includes a `rules.md` file that defines strict usage rules for AI assistants. These rules ensure consistent and reliable operation of the `list_structure` tool.

**Example of correct usage for AI assistants:**

```javascript
// CORRECT: Using absolute paths
mcp_invoke("list_structure", {
  "dir": "C:/Users/Administrator/Desktop/my-project",
  "depth": 3,
  "exclude": ["node_modules", ".git"]
});

// INCORRECT: Using relative paths - will cause errors
// mcp_invoke("list_structure", { "dir": "." });
// mcp_invoke("list_structure", { "dir": "./" });
// mcp_invoke("list_structure", { "dir": "/c:/Users/path" }); // Malformed path
```

The `list_structure` tool is the **exclusive** tool for directory exploration in this project. Other directory listing tools should not be used.

### Path Resolution

**IMPORTANT:** For reliable results, always use absolute paths (e.g., `C:/Users/path/to/project` or `C:\Users\path\to\project`) when specifying directories.

The server handles paths in the following way:

1. When you provide no path (using the default), it uses the current working directory of the Node.js process.
2. Absolute paths are used as-is. The server attempts to correct a common malformed Windows path pattern from `/c:/path/to/file` to `C:/path/to/file` before processing, but providing paths in the standard format (e.g., `C:\path\to\file` or `C:/path/to/file`) is strongly recommended.
3. Relative paths are resolved against the process's current working directory, which may not be what you expect depending on how the server is launched.

Due to potential inconsistencies in how paths are resolved, **using absolute paths is strongly recommended**.

### Configuring an MCP Client (e.g., Claude Desktop)

To use this MCP server with an MCP client like Claude Desktop, you need to manually configure the client. This typically involves editing the client's global configuration file (often named `mcp.json` or similar, located in a user-specific directory).

Add an entry for this server, for example:

**Example for client's configuration:**
```json
{
  "mcpServers": {
    "fileStructure": {  // This is an alias you choose for the server
      "command": "node", // Or the full path to node.exe on Windows
      "args": ["/absolute/path/to/your/project/folderlist/dist/index.js"], // Absolute path to the compiled server script
      "env": {}
    }
    // ... other servers ...
  }
}
```
**Important:**
*   Replace `"/absolute/path/to/your/project/folderlist/dist/index.js"` with the actual absolute path to the `dist/index.js` file of this project on your system after you build it.
*   On Windows, if `node` is not in your PATH for the client, you might need to specify the full path to `node.exe`, e.g., `"C:\\Program Files\\nodejs\\node.exe"`.
*   The server will use the directory from which it's launched as the base directory for resolving relative paths.

### Tool Usage

#### list_structure

Shows directory structure recursively:

```javascript
// Parameters:
{
  "dir": "C:/Users/path/to/project", // Root directory (ALWAYS USE ABSOLUTE PATHS)
  "depth": 3, // Maximum depth to traverse (default: 3)
  "exclude": [ // Directories/patterns to exclude (default: see list below)
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
  ]
}
```

## Troubleshooting

### Module Resolution Issues

If you encounter errors related to module resolution:

1. Make sure you have the latest version of Node.js (16.x or higher)
2. Try installing the MCP SDK globally:
   ```
   npm install -g @modelcontextprotocol/sdk
   npm link @modelcontextprotocol/sdk
   ```
3. Check that your tsconfig.json has the correct module resolution settings

### Path Resolution Issues

If the tool isn't finding the correct files or directories:

1. **Always use absolute paths** (e.g., `C:/Users/path/to/project`) instead of relative paths.
2. Check the server startup logs (prefixed with `[MCP Server]` or `[list_structure]`) to see what working directory it's using and how paths are resolved.
3. Ensure your MCP client configuration launches the server from the intended project directory.
4. If you see errors about directories not found, verify that the path exists and is accessible from the server's working directory.

## License

MIT 