# agent.html Examples

This directory contains comprehensive examples demonstrating how to convert different AI frameworks and patterns into agent.html format.

## Running Examples

Each example generates a self-contained `.html` file that you can open directly in a browser:

```bash
# Pure JavaScript agent
bun run example:vanilla

# LangGraph stateful agent
bun run example:langgraph

# Google Tensorflow Lite with CDN loading
bun run example:litert

# HuggingFace Inference API
bun run example:huggingface

# MCP-enabled agent with tool calling
bun run example:mcp

# WebAssembly embedding
bun run example:wasi
```

## Vanilla JavaScript

**Location**: `./vanilla/`

Pure JavaScript agents with no framework dependencies. Perfect starting point for understanding the agent.html format.

**Key concepts:**
- Basic agent class structure
- API key management
- Direct OpenAI API calls
- Simple UI integration

**Files:**
- `simple-agent.ts` - Minimal OpenAI agent
- `simple-agent.html` - Generated agent file

## LangGraph

**Location**: `./langchain/`

Convert stateful LangGraph agents with action routing into portable HTML format.

**Key concepts:**
- Stateful agent conversion
- Tool/action routing
- Graph-based workflows
- Memory persistence

**Features:**
- Preserves LangGraph state management
- Converts tool calls to browser-compatible format
- Maintains graph structure and routing logic

**Files:**
- `langgraph-agent.ts` - LangGraph conversion example
- `langgraph-agent.html` - Generated agent file

## Tensorflow Lite RT

**Location**: `./litert/`

Load Tensorflow Lite RT from CDN for streaming and generation directly in the browser.

**Key concepts:**
- CDN-based model loading
- WebAssembly performance
- Streaming inference
- No backend required

**Features:**
- Load LiteRT via CDN
- Run models entirely in browser
- Stream generation token-by-token
- Efficient memory management

**Files:**
- `simple-agent.ts` - LiteRT integration example
- `simple-agent.html` - Generated agent file

## HuggingFace

**Location**: `./huggingface/`

Use HuggingFace Inference API with multiple models for text generation, embeddings, and more.

**Key concepts:**
- HuggingFace Inference API integration
- Multiple model support
- API token management
- Different task types (text generation, embeddings, etc.)

**Features:**
- Easy model switching
- Inference API client wrapper
- Support for various HF tasks
- Browser-compatible API calls

**Files:**
- `simple-agent.ts` - HuggingFace API example
- `simple-agent.html` - Generated agent file

## Model Context Protocol (MCP)

**Location**: `./mcp/`

Integrate with MCP servers to access tools and resources via the Model Context Protocol.

**Key concepts:**
- MCP server connections
- Tool discovery and calling
- Resource access
- Multi-server management

**Features:**
- Built-in MCP client for browsers
- Automatic tool discovery
- Session management
- Support for multiple MCP servers

**Architecture:**
```
Agent (browser) → MCPClient → MCP Server (HTTP) → Tools/Resources
```

**MCP Server Setup:**

Start the test MCP server:
```bash
bun run mcp:server
```

**Agent Integration:**

```typescript
const manifest = {
  id: 'mcp-agent',
  mcp: {
    servers: [
      {
        name: 'filesystem',
        url: 'http://localhost:3000/mcp',
        auth: { type: 'none' }
      }
    ]
  }
}

// Agent code can access MCP via this.mcp
async run(input) {
  const tools = this.mcp.getAllTools()
  const result = await this.mcp.callTool('read_file', { path: '/etc/hosts' })
  return result
}
```

**MCP Client Usage:**

```typescript
import { MCPClient, MCPManager } from 'agent-file'

// Single server
const client = new MCPClient('http://localhost:3000/mcp')
await client.connect()
const result = await client.callTool('read_file', { path: '/etc/hosts' })

// Multiple servers
const manager = new MCPManager()
await manager.addServer('filesystem', 'http://localhost:3000/mcp')
await manager.addServer('database', 'http://localhost:3001/mcp')
const result = await manager.callTool('read_file', { path: '/etc/hosts' })
```

**MCP Server Requirements:**
- JSON-RPC 2.0 over HTTP POST
- Protocol version: `2025-06-18`
- Session management via `Mcp-Session-Id` header
- Methods: `initialize`, `tools/list`, `tools/call`, `resources/list`, `resources/read`

**Files:**
- `mcp-agent.ts` - MCP integration example
- `test-mcp-server.ts` - Test MCP server implementation
- `mcp-agent.html` - Generated agent file

## WASI (Advanced)

**Location**: `./advanced/wasi/`

Embed WebAssembly modules for high-performance computation directly in your agent.

**Key concepts:**
- WASI module embedding
- High-performance computing
- Binary data handling
- WebAssembly interop

**Features:**
- Embed compiled WASM modules
- WASI system interface support
- Efficient binary execution
- Minimal overhead

**Use cases:**
- ML model inference
- Cryptographic operations
- Data processing
- Performance-critical algorithms

**Files:**
- `wasi-agent.ts` - WASM embedding example
- `wasi-agent.html` - Generated agent file

## Common Patterns

### Agent Class Structure

All agents must implement this basic interface:

```typescript
class Agent {
  constructor(manifest) {
    this.manifest = manifest
  }

  async run(input) {
    // Your agent logic
    return result
  }

  // Optional methods
  async setApiKey(key) { }
  async getState() { }
  async clearState() { }
}
```

### Manifest Configuration

```typescript
{
  id: 'unique-agent-id',
  name: 'Display Name',
  version: '1.0.0',
  permissions: {
    network: ['api.openai.com'],  // Whitelist domains
    storage: false,                // localStorage access
    code: false                    // eval/Function access
  },
  capabilities: {
    memory: false,                 // Persistent memory
    code: false                    // Code execution
  }
}
```

### Security Model

All agents enforce:
1. **Integrity checking** - SHA-256 hashes prevent tampering
2. **Permission system** - Explicit domain whitelisting
3. **Sandboxed execution** - iframe isolation

## Creating Your Own Agent

1. **Choose a base example** that matches your use case
2. **Implement your Agent class** with required methods
3. **Configure permissions** for domains you need
4. **Generate HTML** with `AgentFile.create()`
5. **Test in browser** by opening the generated `.html` file

## Troubleshooting

**Permission errors:**
- Check `permissions.network` includes all required domains
- Verify domains don't include protocols (use `api.openai.com`, not `https://api.openai.com`)

**Agent not loading:**
- Open browser console for detailed errors
- Verify integrity hashes match (check console output)
- Ensure agent code exports a class named `Agent`

**API failures:**
- Check CORS configuration on your API endpoints
- Verify API keys are set via `window.agent.setApiKey()`
- Check browser network tab for request details

## Learn More

- [Main Documentation](../README.md)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [agent.html Security Model](../README.md#security-model)
