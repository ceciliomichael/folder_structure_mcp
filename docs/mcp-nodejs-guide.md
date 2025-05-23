# Comprehensive Guide to Building MCP Servers with Node.js

## Table of Contents
- [Introduction to Model Context Protocol (MCP)](#introduction-to-model-context-protocol-mcp)
- [Setting Up Your Development Environment](#setting-up-your-development-environment)
- [Creating Your First MCP Server](#creating-your-first-mcp-server)
- [Understanding MCP Core Concepts](#understanding-mcp-core-concepts)
  - [Tools](#tools)
  - [Resources](#resources)
  - [Prompts](#prompts)
- [Advanced Features](#advanced-features)
  - [Image Injection](#image-injection)
  - [Error Handling](#error-handling)
  - [Authentication and Security](#authentication-and-security)
- [Deployment Options](#deployment-options)
  - [Local Development](#local-development)
  - [Remote Hosting](#remote-hosting)
- [Debugging and Testing](#debugging-and-testing)
- [Best Practices](#best-practices)
- [Reference Examples](#reference-examples)

## Introduction to Model Context Protocol (MCP)

The Model Context Protocol (MCP) is an open standard that standardizes how applications provide context and tools to Large Language Models (LLMs). Think of MCP as a plugin system that allows you to extend an LLM's capabilities by connecting it to various data sources and tools through standardized interfaces.

MCP follows a client-server architecture:

- **MCP Clients**: Applications like Claude Desktop, Cursor AI IDE, or other AI assistants that can connect to MCP servers to access data and functionality.
- **MCP Servers**: Lightweight programs that expose specific capabilities via the standardized Model Context Protocol. They act as intermediaries between LLMs and external data sources or tools.

Key benefits of using MCP include:

- Standardized interface for AI tool integration
- Secure, controlled access to external data and services
- Separation of concerns between AI and external functionality
- Reusable, modular approach to extending AI capabilities

## Setting Up Your Development Environment

Before building your MCP server, you'll need to set up your development environment:

1. **Install Node.js**: Ensure you have Node.js v16.0.0 or higher installed
2. **Create a new project directory**:
   ```bash
   mkdir my-mcp-server
   cd my-mcp-server
   ```
3. **Initialize a new npm project**:
   ```bash
   npm init -y
   ```
4. **Install essential dependencies**:
   ```bash
   npm install @modelcontextprotocol/sdk zod
   npm install -D typescript @types/node
   ```
5. **Create a TypeScript configuration file** (`tsconfig.json`):
   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "Node16",
       "moduleResolution": "Node16",
       "outDir": "./dist",
       "rootDir": "./src",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules"]
   }
   ```
6. **Update package.json** to add build scripts:
   ```json
   {
     "type": "module",
     "scripts": {
       "build": "tsc && chmod +x dist/index.js",
       "watch": "tsc --watch"
     }
   }
   ```

## Creating Your First MCP Server

Let's create a basic MCP server that provides a simple calculator tool:

1. **Create a `src` directory and index file**:
   ```bash
   mkdir src
   touch src/index.ts
   ```

2. **Implement the server**:

```typescript
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create an MCP server
const server = new McpServer({
  name: "Calculator",
  version: "1.0.0"
});

// Add a calculator tool
server.tool(
  "calculate", 
  { 
    operation: z.enum(["add", "subtract", "multiply", "divide"]),
    a: z.number(),
    b: z.number()
  },
  async ({ operation, a, b }) => {
    let result: number;
    
    switch (operation) {
      case "add":
        result = a + b;
        break;
      case "subtract":
        result = a - b;
        break;
      case "multiply":
        result = a * b;
        break;
      case "divide":
        if (b === 0) {
          return {
            content: [{ type: "text", text: "Error: Division by zero" }],
            isError: true
          };
        }
        result = a / b;
        break;
    }
    
    return {
      content: [{ type: "text", text: `Result: ${result}` }]
    };
  }
);

// Start the server using stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Calculator MCP server running on stdio");
```

3. **Build the server**:
   ```bash
   npm run build
   ```

4. **Configure a client like Claude Desktop**:
   Add your MCP server to the Claude Desktop configuration:
   ```json
   {
     "mcpServers": {
       "calculator": {
         "command": "node",
         "args": ["/absolute/path/to/your/dist/index.js"]
       }
     }
   }
   ```

## Understanding MCP Core Concepts

### Tools

Tools in MCP are functions that LLMs can call to perform actions. They're similar to API endpoints and should be designed to handle a specific task:

```typescript
server.tool(
  "toolName",             // Name of the tool
  {                       // Parameter schema using Zod
    param1: z.string(),
    param2: z.number()
  },
  async ({ param1, param2 }) => {
    // Implementation logic
    return {
      content: [{ type: "text", text: "Result" }]
    };
  }
);
```

Key aspects of tools:
- They have a unique name
- Parameters are validated using Zod schemas
- They return structured responses
- They can perform side effects (API calls, database operations, etc.)

### Resources

Resources provide data to LLMs. They're used for read-only access to data sources:

```typescript
// Static resource
server.resource(
  "staticResource",
  "resource://static",
  async (uri) => ({
    contents: [{
      uri: uri.href,
      text: "Static resource content"
    }]
  })
);

// Dynamic resource with parameters
server.resource(
  "dynamicResource",
  new ResourceTemplate("resource://{id}", { list: undefined }),
  async (uri, { id }) => ({
    contents: [{
      uri: uri.href,
      text: `Content for resource ${id}`
    }]
  })
);
```

Key aspects of resources:
- They provide read-only data
- They can be static or dynamic (with parameters)
- They are accessed by URIs
- They should not perform significant computation

### Prompts

Prompts are reusable templates for LLM interactions:

```typescript
server.prompt(
  "promptName",
  { parameter: z.string() },
  ({ parameter }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Prompt template with ${parameter}`
      }
    }]
  })
);
```

Key aspects of prompts:
- They define reusable interaction patterns
- They can include parameters
- They structure messages for the LLM

## Advanced Features

### Image Injection

One of the most powerful features of MCP is the ability to return images as context to the LLM. This is particularly useful for tools that generate visualizations, screenshots, diagrams, or other visual content.

#### Image Injection Basics

To return an image in your MCP server response, you need to:
1. Encode the image as base64
2. Return it with the appropriate MIME type

Here's an example of a tool that generates and returns an image:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs/promises";

const server = new McpServer({
  name: "ImageProvider",
  version: "1.0.0"
});

// Tool that returns an image
server.tool(
  "generate_image",
  { type: z.enum(["circle", "square"]) },
  async ({ type }) => {
    // In a real implementation, you would dynamically generate or fetch an image
    // Here we're reading from a file for simplicity
    const imagePath = type === "circle" ? "./circle.jpg" : "./square.jpg";
    
    try {
      // Read the image file
      const imageBuffer = await fs.readFile(imagePath);
      
      // Convert to base64
      const base64Image = imageBuffer.toString("base64");
      
      return {
        content: [
          {
            type: "image",
            data: base64Image,
            mimeType: "image/jpeg",
          }
        ]
      };
    } catch (error) {
      console.error("Error loading image:", error);
      return {
        content: [{ type: "text", text: "Error loading image" }],
        isError: true
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Image Provider MCP server running on stdio");
```

#### Dynamic Image Generation Example

For a more advanced example, let's create a tool that dynamically generates a chart using a third-party library:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";

// First, install the necessary dependency:
// npm install chartjs-node-canvas

const server = new McpServer({
  name: "ChartGenerator",
  version: "1.0.0"
});

server.tool(
  "generate_chart",
  {
    chartType: z.enum(["bar", "line", "pie"]),
    title: z.string(),
    labels: z.array(z.string()),
    data: z.array(z.number())
  },
  async ({ chartType, title, labels, data }) => {
    try {
      // Configure chart
      const width = 800;
      const height = 600;
      const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });
      
      const configuration = {
        type: chartType,
        data: {
          labels: labels,
          datasets: [{
            label: title,
            data: data,
            backgroundColor: [
              'rgba(255, 99, 132, 0.5)',
              'rgba(54, 162, 235, 0.5)',
              'rgba(255, 206, 86, 0.5)',
              'rgba(75, 192, 192, 0.5)',
              'rgba(153, 102, 255, 0.5)',
            ],
            borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)',
            ],
            borderWidth: 1
          }]
        },
        options: {
          scales: {
            y: {
              beginAtZero: true
            }
          },
          plugins: {
            title: {
              display: true,
              text: title
            }
          }
        }
      };
      
      // Generate chart
      const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
      const base64Image = imageBuffer.toString("base64");
      
      return {
        content: [
          {
            type: "image",
            data: base64Image,
            mimeType: "image/png",
          },
          {
            type: "text",
            text: `Chart generated with ${data.length} data points`
          }
        ]
      };
    } catch (error) {
      console.error("Error generating chart:", error);
      return {
        content: [{ type: "text", text: `Error generating chart: ${error.message}` }],
        isError: true
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Chart Generator MCP server running on stdio");
```

#### Image Optimization Tips

When working with images in MCP:

1. **Optimize Size**: Large images can slow down responses, so resize and compress images when possible
2. **Use Appropriate Format**: Choose the right format (PNG for graphics, JPEG for photos)
3. **Support Multiple Content Types**: You can return both image and text in the same response
4. **Error Handling**: Always include fallback text content when image generation fails
5. **Cache When Possible**: If generating images is expensive, consider caching results

### Error Handling

Proper error handling ensures your MCP server remains robust and provides helpful feedback:

```typescript
server.tool(
  "errorProneAction",
  { input: z.string() },
  async ({ input }) => {
    try {
      const result = await riskyOperation(input);
      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error) {
      console.error("Operation failed:", error);
      return {
        content: [{ 
          type: "text", 
          text: `The operation failed: ${error.message || "Unknown error"}` 
        }],
        isError: true  // Mark as error response
      };
    }
  }
);
```

Best practices:
- Log detailed errors on the server side
- Return user-friendly error messages
- Use the `isError: true` flag to mark error responses
- Include actionable information when possible

### Authentication and Security

For MCP servers exposed over HTTP, you'll often need authentication:

```typescript
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

const app = express();
app.use(express.json());

// Simple API key validation middleware
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  const validKeys = process.env.VALID_API_KEYS?.split(",") || [];
  
  if (!apiKey || !validKeys.includes(apiKey)) {
    return res.status(401).json({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message: "Unauthorized: Invalid API key"
      },
      id: null
    });
  }
  
  next();
};

// Apply authentication to all MCP endpoints
app.use("/mcp", validateApiKey);

// MCP request handling (similar to previous examples)
app.post("/mcp", async (req, res) => {
  // ... MCP server logic here ...
});
```

For OAuth-based authentication, you can use the built-in auth utilities:

```typescript
import { ProxyOAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";

// Set up OAuth provider
const oauthProvider = new ProxyOAuthServerProvider({
  endpoints: {
    authorizationUrl: "https://auth.service.com/oauth2/authorize",
    tokenUrl: "https://auth.service.com/oauth2/token",
    revocationUrl: "https://auth.service.com/oauth2/revoke",
  },
  verifyAccessToken: async (token) => {
    // Validate token logic
    return {
      token,
      clientId: "client-id-here",
      scopes: ["read", "write"],
    };
  },
  getClient: async (clientId) => {
    // Return client configuration
    return {
      client_id: clientId,
      redirect_uris: ["http://localhost:3000/callback"],
    };
  }
});

// Add auth routes
app.use(mcpAuthRouter({
  provider: oauthProvider,
  issuerUrl: new URL("https://auth.service.com"),
  baseUrl: new URL("https://my-mcp-server.com"),
  serviceDocumentationUrl: new URL("https://docs.example.com/"),
}));
```

## Deployment Options

### Local Development

For local development and testing, use the stdio transport:

```typescript
const transport = new StdioServerTransport();
await server.connect(transport);
```

Configure a client like Claude Desktop:
```json
{
  "mcpServers": {
    "myServer": {
      "command": "node",
      "args": ["/path/to/dist/index.js"]
    }
  }
}
```

### Remote Hosting

For remote hosting, use the Streamable HTTP transport:

1. **Setup an Express server**:
```typescript
import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const app = express();
app.use(express.json());

// Session management
const transports = {};

// MCP endpoint
app.post('/mcp', async (req, res) => {
  // ... session and transport management ...
  await transport.handleRequest(req, res, req.body);
});

app.listen(3000, () => {
  console.log("MCP server listening on port 3000");
});
```

2. **Container deployment**:
   Create a Dockerfile for containerizing your MCP server:
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm ci
   
   COPY . .
   RUN npm run build
   
   EXPOSE 3000
   
   CMD ["node", "dist/index.js"]
   ```

3. **Deploy to a cloud provider**:
   - Azure Container Apps
   - AWS App Runner
   - Google Cloud Run
   - or any Kubernetes cluster

## Debugging and Testing

### Using the MCP Inspector

The official MCP Inspector is a powerful tool for testing and debugging MCP servers:

1. **Install the inspector**:
   ```bash
   npm install -g @modelcontextprotocol/inspector
   ```

2. **Run inspector against your server**:
   ```bash
   mcp-inspector node /path/to/your/server.js
   ```

3. **Inspect and test**:
   - View available tools, resources, and prompts
   - Test tools with custom parameters
   - View request and response logs

### Adding Server Logging

Enhance your server with detailed logging:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "LoggingExample",
  version: "1.0.0"
});

// Add your tools, resources, prompts...

// Add logging
server.server.onLoggingMessage = async (message) => {
  console.error(`MCP Log [${message.level}]: ${JSON.stringify(message.data)}`);
};

// Custom logging within tools
server.tool(
  "exampleTool",
  { input: z.string() },
  async ({ input }) => {
    // Log within tool execution
    server.server.sendLoggingMessage({
      level: "info",
      data: `Processing input: ${input}`
    });
    
    // Logic here...
    
    return {
      content: [{ type: "text", text: `Processed: ${input}` }]
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

## Best Practices

### Tool Design

1. **Keep it focused**: Each tool should do one thing well
2. **Validate inputs**: Use Zod schemas to enforce proper input validation
3. **Provide meaningful descriptions**: Help the LLM understand what your tool does
4. **Return structured data**: Format responses in a way that's easy for LLMs to understand
5. **Handle edge cases**: Anticipate and handle error conditions gracefully

### Resource Design

1. **Use logical URIs**: Create a consistent URI scheme for your resources
2. **Optimize for context**: Resources should provide relevant context to the LLM
3. **Keep responses concise**: Avoid unnecessary verbosity in resource content
4. **Cache when possible**: Avoid redundant data fetching

### Server Architecture

1. **Modular code**: Organize your server code into logical modules
2. **Separate concerns**: Keep business logic separate from MCP protocol handling
3. **Environment configuration**: Use environment variables for configuration
4. **Secure by design**: Implement proper authentication and authorization
5. **Logging strategy**: Implement comprehensive logging for debugging

### Performance Considerations

1. **Minimize response times**: Optimize expensive operations
2. **Cache when appropriate**: Avoid redundant computations
3. **Consider stateless design**: For horizontal scaling
4. **Handle connection limits**: Manage resources for concurrent connections

## Reference Examples

### Weather API Integration

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_KEY = process.env.WEATHER_API_KEY;

const server = new McpServer({
  name: "WeatherAPI",
  version: "1.0.0"
});

server.tool(
  "get_weather",
  {
    location: z.string().describe("City name or coordinates"),
    units: z.enum(["metric", "imperial"]).default("metric").describe("Temperature units")
  },
  async ({ location, units }) => {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&units=${units}&appid=${API_KEY}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      const weather = {
        location: `${data.name}, ${data.sys.country}`,
        temperature: data.main.temp,
        conditions: data.weather[0].description,
        humidity: data.main.humidity,
        wind: {
          speed: data.wind.speed,
          direction: data.wind.deg
        }
      };
      
      return {
        content: [{ type: "text", text: JSON.stringify(weather, null, 2) }]
      };
    } catch (error) {
      console.error("Weather API error:", error);
      return {
        content: [{ type: "text", text: `Error fetching weather: ${error.message}` }],
        isError: true
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Weather API MCP server running on stdio");
```

### Database Integration

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Pool } from "pg";

// Setup database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const server = new McpServer({
  name: "DatabaseConnector",
  version: "1.0.0"
});

// Resource to get schema information
server.resource(
  "dbSchema",
  "db://schema",
  async (uri) => {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT table_name, column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = 'public'
          ORDER BY table_name, ordinal_position
        `);
        
        // Format schema information
        const tables = {};
        for (const row of result.rows) {
          if (!tables[row.table_name]) {
            tables[row.table_name] = [];
          }
          tables[row.table_name].push({
            column: row.column_name,
            type: row.data_type
          });
        }
        
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(tables, null, 2)
          }]
        };
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("DB schema error:", error);
      return {
        contents: [{
          uri: uri.href,
          text: `Error fetching schema: ${error.message}`
        }]
      };
    }
  }
);

// Tool to execute SQL queries
server.tool(
  "execute_query",
  {
    query: z.string().describe("SQL query to execute"),
    params: z.array(z.any()).optional().describe("Query parameters")
  },
  async ({ query, params = [] }) => {
    try {
      // Add safety checks for queries
      if (/^\s*(DELETE|UPDATE|DROP|CREATE|ALTER|INSERT)/i.test(query)) {
        return {
          content: [{ 
            type: "text", 
            text: "Error: Only SELECT queries are allowed for safety reasons." 
          }],
          isError: true
        };
      }
      
      const client = await pool.connect();
      try {
        const result = await client.query(query, params);
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({
              rowCount: result.rowCount,
              rows: result.rows
            }, null, 2) 
          }]
        };
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Query execution error:", error);
      return {
        content: [{ 
          type: "text", 
          text: `Error executing query: ${error.message}` 
        }],
        isError: true
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Database Connector MCP server running on stdio");
```

By following this guide, you should now have a solid understanding of how to build powerful MCP servers with Node.js. From basic concepts to advanced features like image injection, you have the knowledge needed to extend LLM capabilities with custom tools and data sources.

Happy building! 