# MCP-Enabled Agent Example

This example demonstrates how to create agents that use MCP (Model Context Protocol) servers for tool calling.

## Overview

The agent connects to MCP servers and can discover and call tools dynamically. This enables agents to:

- Access file system operations
- Query databases
- Perform web searches
- Use any other MCP-compatible tools

## Running the Example

### 1. Generate the Agent

```bash
bun run examples/mcp/mcp-agent.ts
```

This creates `examples/mcp/mcp-agent.html`.

### 2. Set Up MCP Servers

You need MCP servers running locally. Here are some options:

#### Option A: Use Existing MCP Servers

Install and run MCP servers from the ecosystem:

```bash
# Example: File system MCP server
npm install -g @modelcontextprotocol/server-filesystem
mcp-server-filesystem --port 3000 --path /tmp

# Example: SQLite MCP server
npm install -g @modelcontextprotocol/server-sqlite
mcp-server-sqlite --port 3001 --database ./test.db
```

#### Option B: Create a Simple Test Server

Create `test-mcp-server.ts`:

```typescript
// Simple MCP server for testing
Bun.serve({
  port: 3000,
  async fetch(req) {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const body = await req.json();

    // Handle initialize
    if (body.method === 'initialize') {
      return Response.json({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          protocolVersion: '2025-06-18',
          serverInfo: {
            name: 'test-server',
            version: '1.0.0'
          },
          capabilities: {
            tools: {}
          }
        }
      });
    }

    // Handle tools/list
    if (body.method === 'tools/list') {
      return Response.json({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          tools: [
            {
              name: 'echo',
              description: 'Echo back the input',
              inputSchema: {
                type: 'object',
                properties: {
                  message: { type: 'string' }
                },
                required: ['message']
              }
            },
            {
              name: 'time',
              description: 'Get current time',
              inputSchema: {
                type: 'object',
                properties: {}
              }
            }
          ]
        }
      });
    }

    // Handle tools/call
    if (body.method === 'tools/call') {
      const { name, arguments: args } = body.params;

      if (name === 'echo') {
        return Response.json({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            content: [{
              type: 'text',
              text: args.message
            }]
          }
        });
      }

      if (name === 'time') {
        return Response.json({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            content: [{
              type: 'text',
              text: new Date().toISOString()
            }]
          }
        });
      }
    }

    // Handle notifications
    if (!body.id) {
      return new Response(null, { status: 204 });
    }

    return Response.json({
      jsonrpc: '2.0',
      id: body.id,
      error: {
        code: -32601,
        message: 'Method not found'
      }
    });
  }
});

console.log('Test MCP server running on http://localhost:3000');
```

Run it:

```bash
bun test-mcp-server.ts
```

### 3. Open the Agent

Open `examples/mcp/mcp-agent.html` in a web browser. The agent will:

1. Connect to the configured MCP servers
2. Discover available tools
3. Display them in the UI

### 4. Use the Agent

Try these commands in the agent input:

```
# List tools (leave input empty and press Send)

# Call echo tool
echo message=Hello

# Call time tool
time

# Call file system tools (if using filesystem server)
read_file path=/etc/hosts
```

## Agent Configuration

The agent manifest includes MCP configuration:

```typescript
{
  mcp: {
    servers: [
      {
        name: 'filesystem',
        url: 'http://localhost:3000/mcp',
        description: 'File system operations',
        auth: {
          type: 'none'
        }
      }
    ]
  }
}
```

## How It Works

1. **Initialization**: When the agent loads, it automatically connects to all configured MCP servers
2. **Tool Discovery**: The agent queries each server for available tools
3. **Tool Calling**: When you call a tool, the agent sends a request to the appropriate MCP server
4. **Response Handling**: Results are displayed in the console

## Security

- MCP server URLs are automatically allowed in the network permissions
- All fetch requests are still validated against the security policy
- Agents can only connect to explicitly configured MCP servers

## Troubleshooting

### CORS Errors

If you see CORS errors in the console, your MCP server needs to allow cross-origin requests:

```typescript
// Add CORS headers to your MCP server
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, MCP-Protocol-Version, Mcp-Session-Id'
};
```

### Connection Failures

- Ensure MCP servers are running on the configured ports
- Check browser console for detailed error messages
- Verify the server URLs in the manifest match your actual servers

## Next Steps

- Explore the [MCP specification](https://modelcontextprotocol.io/specification)
- Check out available [MCP servers](https://github.com/modelcontextprotocol)
- Create custom MCP servers for your specific needs
