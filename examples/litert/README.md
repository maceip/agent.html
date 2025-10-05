# LiterT → agent.html

Convert your LiterT agents into portable, self-contained agent.html files that load dependencies from CDN.

## Examples

### 1. Simple Agent (`simple-agent.ts`)

Basic LiterT agent with CDN loading.

**Features:**
- Loads LiterT from jsdelivr CDN
- OpenAI integration
- Streaming support

**Usage:**
```bash
bun run examples/litert/simple-agent.ts
```

Opens `simple-agent.html` in browser, then:
```javascript
// Set API key
await window.agent.setApiKey('sk-...')

// Generate response
const result = await window.agent.run('What is AI?')
console.log(result.response)

// Stream response
await window.agent.stream('Tell me a story', (chunk) => {
  console.log(chunk)
})
```

---

## Pattern: Converting LiterT to agent.html

### Step 1: Load LiterT from CDN

Instead of `import { LiteRT } from '@litert/core'`, use dynamic import from CDN:

```typescript
const { LiteRT } = await import('https://cdn.jsdelivr.net/npm/@litert/core@latest/dist/index.js');
```

### Step 2: Initialize in Agent class

```typescript
class Agent {
  constructor(manifest) {
    this.manifest = manifest;
    this.litert = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    // Load from CDN
    const { LiteRT } = await import('https://cdn.jsdelivr.net/npm/@litert/core@latest/dist/index.js');

    this.litert = new LiteRT({
      provider: 'openai',
      apiKey: null
    });

    this.initialized = true;
  }

  async run(input) {
    await this.init(); // Ensure LiterT is loaded

    const response = await this.litert.generate({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: input }]
    });

    return response;
  }
}
```

### Step 3: Create AgentFile with CDN permissions

```typescript
import { AgentFile } from 'agent-file'

const agentHTML = await AgentFile.create({
  manifest: {
    id: 'litert-agent',
    name: 'LiterT Agent',
    version: '1.0.0',
    permissions: {
      network: [
        'api.openai.com',      // For API calls
        'cdn.jsdelivr.net'     // For loading LiterT
      ],
      storage: false,
      code: false
    }
  },
  code: agentCode
})

await Bun.write('my-agent.html', agentHTML)
```

---

## Loading External Libraries from CDN

### jsdelivr CDN

```typescript
// Latest version
const lib = await import('https://cdn.jsdelivr.net/npm/package@latest/dist/index.js');

// Specific version
const lib = await import('https://cdn.jsdelivr.net/npm/package@1.2.3/dist/index.js');

// ESM format
const lib = await import('https://cdn.jsdelivr.net/npm/package@latest/+esm');
```

### Common Libraries

```typescript
// LiterT
const { LiteRT } = await import('https://cdn.jsdelivr.net/npm/@litert/core@latest/dist/index.js');

// LangChain (if available as ESM)
const { ChatOpenAI } = await import('https://cdn.jsdelivr.net/npm/@langchain/openai@latest/+esm');

// Lodash
const _ = await import('https://cdn.jsdelivr.net/npm/lodash-es@latest');

// Zod (for validation)
const { z } = await import('https://cdn.jsdelivr.net/npm/zod@latest/+esm');
```

---

## Lazy Loading Pattern

Load libraries only when needed:

```typescript
class Agent {
  constructor(manifest) {
    this.libs = {};
  }

  async loadLib(name, url) {
    if (this.libs[name]) return this.libs[name];

    console.log(\`Loading \${name}...\`);
    this.libs[name] = await import(url);
    return this.libs[name];
  }

  async run(input) {
    // Load LiterT on first use
    const { LiteRT } = await this.loadLib(
      'litert',
      'https://cdn.jsdelivr.net/npm/@litert/core@latest/dist/index.js'
    );

    // Use it
    const litert = new LiteRT({ /*...*/ });
    return await litert.generate({ /*...*/ });
  }
}
```

---

## Streaming Responses

```typescript
class Agent {
  async stream(input, onChunk) {
    await this.init();

    const stream = await this.litert.generateStream({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: input }]
    });

    for await (const chunk of stream) {
      if (onChunk) onChunk(chunk.content);
    }
  }
}

// Usage
await agent.stream('Tell me a story', (chunk) => {
  document.getElementById('output').textContent += chunk;
});
```

---

## Error Handling

Always handle CDN loading failures:

```typescript
async init() {
  if (this.initialized) return;

  try {
    const { LiteRT } = await import('https://cdn.jsdelivr.net/npm/@litert/core@latest/dist/index.js');
    this.litert = new LiteRT({ /*...*/ });
    this.initialized = true;
  } catch (error) {
    console.error('Failed to load LiterT from CDN:', error);
    throw new Error('Could not load required library. Check your internet connection.');
  }
}
```

---

## Security Considerations

### 1. Whitelist CDN Domains

```typescript
permissions: {
  network: [
    'cdn.jsdelivr.net',     // Specific CDN only
    'api.openai.com'        // API provider
  ]
}
```

### 2. Pin Library Versions

```typescript
// Good: Specific version
const lib = await import('https://cdn.jsdelivr.net/npm/package@1.2.3/dist/index.js');

// Avoid: Latest version (can change unexpectedly)
const lib = await import('https://cdn.jsdelivr.net/npm/package@latest/dist/index.js');
```

### 3. Verify Imports

```typescript
const { LiteRT } = await import('https://cdn.jsdelivr.net/npm/@litert/core@1.0.0/dist/index.js');

if (!LiteRT) {
  throw new Error('Failed to load LiteRT: Module not found');
}
```

---

## Best Practices

1. **Lazy Load**: Only load libraries when needed
2. **Cache Instances**: Reuse loaded library instances
3. **Handle Failures**: Gracefully handle CDN unavailability
4. **Pin Versions**: Use specific versions, not `@latest`
5. **Minimal Deps**: Load only what you need

---

## Dependencies

For development (to test LiterT locally):
```bash
bun install @litert/core
```

But the agent.html file will load from CDN, so no dependencies needed in production.

---

## Learn More

- [LiterT Documentation](https://litert.dev)
- [jsdelivr CDN](https://www.jsdelivr.com/)
- [agent.html Specification](../../README.md)
