<img width="94" height="80" alt="logoaf" src="https://github.com/user-attachments/assets/8206c2a2-3149-4a63-888a-1d4d2c9f13b7" />

# agent.html

agent.html is a format for packaging AI agents as single, self-contained HTML files. Share agents as easily as sharing a document—no backend, no installation, no dependencies.

**Get started in 10 seconds:**

```bash
bun install agent-file
agent-html quick
# Open agent.html in your browser - done!
```

## Why agent.html?

Traditional AI agents require complex deployment infrastructure. agent.html packages everything—manifest, code, memory, and UI—into a single HTML file that runs directly in any modern browser.

**Key benefits:**
- Self-contained: One file contains everything
- Portable: Share via email, download, or file system
- Secure: Built-in integrity checking and permission system
- Universal: Works in any modern browser
- Framework agnostic: Convert from LangChain, TensorFlow Lite RT, vanilla JS, or WASM (incl wasi)
- MCP integration: Built-in Model Context Protocol client for tool calling and resource access

## Quick Start

### Installation

```bash
bun install agent-file
```

### Fastest Way: One Command

Create a working agent instantly:

```bash
agent-html quick
```

This creates `agent.html` - open it in your browser and you're done! Set your OpenAI API key in the browser console:

```javascript
await window.agent.setApiKey("sk-...")
await window.agent.run("Hello!")
```

### Customization Path

Create template files to customize:

```bash
agent-html init
# Edit manifest.json and agent.js to your needs
agent-html generate --manifest manifest.json --code agent.js
```

### Programmatic Usage

```typescript
import { AgentFile } from 'agent-file'

const html = await AgentFile.create({
  manifest: {
    id: 'my-agent',
    name: 'My AI Agent',
    version: '1.0.0',
    permissions: {
      network: ['api.openai.com'],
      storage: false,
      code: false
    }
  },
  code: `
    class Agent {
      async run(input) {
        // Your agent logic here
        return result
      }
    }
  `,
  ui: 'full'
})

await Bun.write('my-agent.html', html)
```

Open `my-agent.html` in a browser and interact via `window.agent.run(input)`.

## How It Works

An agent.html file is a complete HTML document with embedded components:

```html
<!DOCTYPE html>
<html>
  <body>
    <!-- Agent Manifest -->
    <script type="application/json" id="agent-manifest">
      { "id": "my-agent", "permissions": {...}, ... }
    </script>

    <!-- Agent Code -->
    <script type="text/plain" id="agent-code">
      class Agent { ... }
    </script>

    <!-- Integrity Hashes -->
    <script type="application/json" id="agent-integrity">
      { "manifestHash": "sha256-...", "codeHash": "sha256-..." }
    </script>

    <!-- Runtime (loads and executes agent) -->
    <script type="module" id="agent-runtime">
      // Sandboxed execution environment
    </script>
  </body>
</html>
```

## Security Model

agent.html enforces security through three mechanisms:

1. **Integrity Checking**: SHA-256 hashes verify the manifest and code haven't been tampered with
2. **Permission System**: Explicit whitelisting of network domains, storage, and code execution
3. **Sandboxed Execution**: Agent runs in an iframe with restricted permissions

```typescript
permissions: {
  network: ['api.openai.com'],  // Only these domains
  storage: false,                // No localStorage/sessionStorage
  code: false                    // No eval() or Function()
}
```

## Model Context Protocol (MCP)

Built-in MCP client for connecting to [Model Context Protocol](https://modelcontextprotocol.io) servers. Access tools and resources from MCP servers directly in your browser-based agents.

```typescript
import { MCPClient, MCPManager } from 'agent-file'

// Use in agents via manifest
const manifest = {
  mcp: {
    servers: [{ name: 'filesystem', url: 'http://localhost:3000/mcp' }]
  }
}

// Access in agent code
async run(input) {
  const result = await this.mcp.callTool('read_file', { path: '/etc/hosts' })
  return result
}

// Or use directly
const client = new MCPClient('http://localhost:3000/mcp')
await client.connect()
const result = await client.callTool('read_file', { path: '/etc/hosts' })
```

See [MCP examples](./examples/README.md#model-context-protocol-mcp) for detailed integration guide.

## CLI Reference

### Quick Start Commands

**Create an agent instantly** (no files needed):

```bash
agent-html quick [--name "Agent Name"] [--output agent.html]
```

**Create template files** to customize:

```bash
agent-html init
```

This creates `manifest.json` and `agent.js` that you can edit.

### Advanced Commands

**Generate** from custom files:

```bash
agent-html generate --manifest manifest.json --code agent.js [options]

Options:
  --output <file>      Output path (default: agent.html)
  --ui <type>          UI type: full, minimal, none (default: full)
  --styles <file>      Custom CSS styles
  --memory <file>      Initial memory/state JSON
```

**Validate** an agent file:

```bash
agent-html validate agent.html [--verbose]
```

**Modify** an existing agent:

```bash
agent-html modify agent.html --code new-code.js [--output modified.html]
```

**Publish** to registry (coming soon):

```bash
agent-html publish agent.html
```

## Examples

Examples for different frameworks and use cases. Each generates a self-contained `.html` file you can open in a browser.

```bash
bun run example:vanilla      # Pure JavaScript
bun run example:langgraph    # LangGraph stateful agents
bun run example:litert       # TensorFlow Lite RT
bun run example:huggingface  # HuggingFace Inference API
bun run example:mcp          # Model Context Protocol
bun run example:wasi         # WebAssembly (WASI)
```

**[See detailed examples guide →](./examples/README.md)**

- **[Vanilla](./examples/vanilla/)** - Pure JS, no dependencies
- **[LangGraph](./examples/langchain/)** - Stateful agent conversion
- **[TensorFlow Lite RT](./examples/litert/)** - CDN model loading
- **[HuggingFace](./examples/huggingface/)** - Inference API integration
- **[MCP](./examples/mcp/)** - Tool calling and resource access
- **[WASI](./examples/advanced/wasi/)** - WebAssembly embedding

## API Reference

Full TypeScript definitions available in [`dist/index.d.ts`](./dist/index.d.ts).

### Core API

```typescript
import { AgentFile } from 'agent-file'

// Create agent HTML
const html = await AgentFile.create({
  manifest: { id, name, version, permissions, capabilities },
  code: 'class Agent { ... }',
  ui: 'full' | 'minimal' | 'none'
})

// Extract components
const { manifest, code, memory, integrity } = AgentFile.extract(html)
```

### MCP Client

```typescript
import { MCPClient, MCPManager } from 'agent-file'

// Single server
const client = new MCPClient(url, authToken?)
await client.connect()
await client.callTool(name, args)

// Multiple servers
const manager = new MCPManager()
await manager.addServer(name, url, authToken?)
await manager.callTool(toolName, args)
```

### Security

```typescript
import { generateHashes, verifyHashes, checkPermission } from 'agent-file'

const hashes = await generateHashes(manifest, code)
const valid = await verifyHashes(manifest, code, hashes)
const allowed = checkPermission(permissions, 'fetch', url)
```

## Agent Class Interface

Your agent code must export a class named `Agent`:

```typescript
class Agent {
  constructor(manifest) {
    this.manifest = manifest
    // Your initialization
  }

  // Required: Main entry point
  async run(input) {
    // Your logic
    return result
  }

  // Optional: Additional methods
  async setApiKey(key) { }
  async getState() { }
  async clearState() { }
}
```

## Development

```bash
bun install
bun run build         # Compile TypeScript
bun test              # Run tests
bun run mcp:server    # Start MCP test server
```

See [examples/](./examples/README.md) for running example agents.

## Project Structure

```
agent.html/
├── src/
│   ├── agent-file.ts         # Main AgentFile class
│   ├── security.ts           # Security utilities
│   ├── mcp-client.ts         # MCP client for browser
│   ├── mcp-client-inline.ts  # Inline MCP client for agents
│   └── index.ts              # Public exports
├── examples/
│   ├── vanilla/              # Pure JavaScript examples
│   ├── langchain/            # LangGraph examples
│   ├── litert/               # LiterT examples
│   ├── huggingface/          # HuggingFace examples
│   ├── mcp/                  # MCP integration examples
│   └── advanced/
│       └── wasi/             # WebAssembly examples
└── dist/                     # Built files
```

## Browser Support

Requires a modern browser with:
- ES2020+ JavaScript
- Fetch API
- Web Crypto API (SHA-256)
- iframe sandboxing
- ES Modules

Tested on Chrome/Edge 90+, Firefox 88+, Safari 14+

## Philosophy

agent.html is built on five principles:

1. **Simplicity**: One file, standard technologies, minimal API
2. **Security**: Explicit permissions, integrity verification, sandboxing
3. **Portability**: Works anywhere, no dependencies, no backend
4. **Transparency**: Source code is visible and verifiable
5. **Extensibility**: Platform-agnostic format, easy integration

## Contributing

Contributions welcome. Please:

1. Read existing code and follow patterns
2. Add tests for new features
3. Update documentation
4. Submit PR with clear description

## License

MIT License - see LICENSE file

## Learn More

- [Examples Guide](./examples/README.md) - Comprehensive examples and patterns
- [Model Context Protocol](https://modelcontextprotocol.io) - MCP specification
