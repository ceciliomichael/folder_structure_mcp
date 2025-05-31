# MCP FileSystem Tools

An MCP (Model Context Protocol) server that provides tools for AI assistants to interact with the file system through a single, efficient tool call.

## Primary Purpose

This project is designed with one core goal: **reducing multiple tool calls to a single, efficient operation** when interacting with the file system.

Traditional approaches often require multiple separate calls to explore directories or read files, which is inefficient and increases latency. This project solves this problem by providing:

1. **`list_structure`**: Retrieves an entire directory structure in one call, eliminating the need for repeated directory listing operations.

2. **`read_files`**: Reads multiple files in a single operation, replacing numerous individual file read requests.

Both tools require absolute paths and follow strict usage guidelines in `rules.md` to ensure optimal performance.

## Key Benefits

- **Maximum Efficiency**: Complete complex file operations with just one tool call
- **Reduced Latency**: Eliminate the overhead of multiple back-and-forth communications
- **Simplified Workflows**: Streamline AI interactions with the file system
- **Consistent Results**: Standardized approach to path handling and error management

## Recommended Agents

Based on testing, this project works optimally with advanced AI agents such as Gemini 2.5 Pro and Claude 3.7. These agents are adept at leveraging the efficient, single-call nature of the provided tools.

## License

MIT 