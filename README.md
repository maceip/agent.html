# agent.html

agent.html is a format for packaging AI agents as single, self-contained HTML files. Share agents as easily as sharing a document—no backend, no installation, no dependencies.

## Why agent.html?

Traditional AI agents require complex deployment infrastructure. agent.html packages everything—manifest, code, memory, and UI—into a single HTML file that runs directly in any modern browser.

**Key benefits:**
- Self-contained: One file contains everything
- Portable: Share via email, download, or file system
- Secure: Built-in integrity checking and permission system
- Universal: Works in any modern browser
- Framework agnostic: Convert from LangChain, LiterT, vanilla JS, or WASM

## Quick Start

### Installation

```bash
bun install agent-file
```

### Create an Agent

```typescript
import { AgentFile } from 'agent-file'

const agentCode = `
class Agent {
  constructor(manifest) {
    this.manifest = manifest;
    this.apiKey = null;
  }

  async run(input) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + this.apiKey
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: input }
        ]
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }

  setApiKey(key) {
    this.apiKey = key;
  }
}
`

const agentHTML = await AgentFile.create({
  manifest: {
    id: 'my-agent',
    name: 'My AI Agent',
    version: '1.0.0',

    permissions: {
      network: ['api.openai.com'],
      storage: false,
      code: false
    },

    capabilities: {
      memory: false,
      code: false
    }
  },

  code: agentCode,
  ui: 'full'
})

await Bun.write('my-agent.html', agentHTML)
```

### Use the Agent

Open `my-agent.html` in a browser:

```javascript
// Set API key
await window.agent.setApiKey('sk-proj-...')

// Run queries
const result = await window.agent.run('Hello!')
console.log(result)
```

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

## Examples

Run any example to generate a working agent.html file:

```bash
# Pure JavaScript agent
bun run example:vanilla

# LangGraph stateful agent
bun run example:langgraph

# LiterT with CDN loading
bun run example:litert

# HuggingFace Inference API
bun run example:huggingface

# WebAssembly embedding
bun run example:wasi
```

Each example generates a `.html` file in its directory that you can open directly in a browser.

## Examples Directory

Comprehensive examples for different frameworks:

**[Vanilla JavaScript](./examples/vanilla/)** - Pure JS agents with no framework dependencies

**[LangGraph](./examples/langchain/)** - Convert stateful LangGraph agents with action routing

**[LiterT](./examples/litert/)** - Load LiterT from CDN for streaming and generation

**[HuggingFace](./examples/huggingface/)** - Use HuggingFace Inference API with multiple models

**[WASI (Advanced)](./examples/advanced/wasi/)** - Embed WebAssembly modules for high-performance computation

## API Reference

### AgentFile.create(options)

Create a new agent.html document.

```typescript
interface AgentFileOptions {
  manifest: {
    id: string
    name: string
    version: string
    description?: string
    permissions: {
      network: string[]
      storage: boolean
      code: boolean
    }
    capabilities: {
      memory: boolean
      code: boolean
    }
  }
  code: string
  memory?: string
  styles?: string
  ui?: 'minimal' | 'full' | 'none'
}

const html: string = await AgentFile.create(options)
```

### AgentFile.extract(html)

Extract components from an agent.html document.

```typescript
const components = AgentFile.extract(htmlString)

// Returns:
{
  manifest: object,
  code: string,
  memory: string | null,
  integrity: {
    manifestHash: string,
    codeHash: string
  }
}
```

### Security Utilities

```typescript
import { generateHashes, verifyHashes, checkPermission } from 'agent-file'

// Generate integrity hashes
const hashes = await generateHashes(manifestJSON, codeString)

// Verify integrity
const isValid = await verifyHashes(manifestJSON, codeString, hashes)

// Check permissions
const allowed = checkPermission(permissions, 'fetch', 'https://api.openai.com')
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

## Use Cases

**AI Agent Marketplace** - Distribute agents as downloadable HTML files

**Educational Tools** - Package AI tutorials as interactive HTML files with no setup required

**Internal Tools** - Create company-specific AI assistants with single-file deployment

**Prototyping** - Share agent prototypes via email without hosting infrastructure

**Embedded Agents** - Integrate agents into existing platforms programmatically

## Development

### Build

```bash
bun install
bun run build
```

### Run Examples

```bash
bun run example:vanilla
bun run example:langgraph
bun run example:litert
bun run example:huggingface
bun run example:wasi
```

### Test

```bash
bun test
```

## Project Structure

```
agent.html/
├── src/
│   ├── agent-file.ts      # Main AgentFile class
│   ├── security.ts        # Security utilities
│   └── index.ts           # Public exports
├── examples/
│   ├── vanilla/           # Pure JavaScript examples
│   ├── langchain/         # LangGraph examples
│   ├── litert/            # LiterT examples
│   ├── huggingface/       # HuggingFace examples
│   └── advanced/
│       └── wasi/          # WebAssembly examples
└── dist/                  # Built files
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

- [Vanilla Examples](./examples/vanilla/) - Pure JavaScript patterns
- [LangGraph Examples](./examples/langchain/) - Stateful agent conversion
- [LiterT Examples](./examples/litert/) - CDN loading patterns
- [HuggingFace Examples](./examples/huggingface/) - HF Inference API integration
- [WASI Examples](./examples/advanced/wasi/) - WebAssembly embedding
