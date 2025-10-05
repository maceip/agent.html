# Vanilla JavaScript → agent.html

Convert pure JavaScript agents into portable, self-contained agent.html files with no framework dependencies.

## Examples

### 1. Simple Agent (`simple-agent.ts`)

Basic AI agent with direct OpenAI API integration.

**Features:**
- No framework dependencies
- Direct fetch() API calls
- Simple error handling
- API key management

**Usage:**
```bash
bun run examples/vanilla/simple-agent.ts
```

Opens `simple-agent.html` in browser, then:
```javascript
// Set API key
window.agent.setApiKey('sk-...')

// Ask questions
const result = await window.agent.run('What is AI?')
console.log(result.answer)
console.log(result.usage) // Token usage stats
```

---

## Pattern: Creating agent.html files

### Step 1: Define Your Agent Class

```typescript
const agentCode = `
class Agent {
  constructor(manifest) {
    this.manifest = manifest;
    this.apiKey = null;
  }

  async run(input) {
    if (!this.apiKey) {
      return {
        error: 'Please set your API key',
        instructions: 'Use: agent.setApiKey("sk-...")'
      };
    }

    try {
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
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const error = await response.json();
        return { error: error.error?.message || 'API request failed' };
      }

      const data = await response.json();
      return {
        answer: data.choices[0].message.content,
        usage: data.usage
      };
    } catch (error) {
      return { error: 'Request failed: ' + error.message };
    }
  }

  setApiKey(key) {
    this.apiKey = key;
    return { status: 'API key set successfully' };
  }

  getManifest() {
    return this.manifest;
  }
}
`.trim()
```

### Step 2: Create the AgentFile

```typescript
import { AgentFile } from '../../src/index'

const agentHTML = await AgentFile.create({
  manifest: {
    id: 'my-vanilla-agent',
    name: 'My Vanilla Agent',
    version: '1.0.0',
    description: 'A simple AI agent with no framework dependencies',

    permissions: {
      network: ['api.openai.com'],  // Only OpenAI
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

### Step 3: Use Your Agent

Open the HTML file in a browser:

```javascript
// The agent is available at window.agent

// Set API key
await window.agent.setApiKey('sk-proj-...')

// Run queries
const result = await window.agent.run('Hello!')
console.log(result.answer)
```

---

## Common Patterns

### 1. State Management

Maintain conversation history:

```typescript
class Agent {
  constructor(manifest) {
    this.manifest = manifest;
    this.apiKey = null;
    this.messages = [];  // Conversation history
  }

  async run(input) {
    // Add user message
    this.messages.push({ role: 'user', content: input });

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
          ...this.messages  // Include history
        ]
      })
    });

    const data = await response.json();
    const answer = data.choices[0].message.content;

    // Add assistant message
    this.messages.push({ role: 'assistant', content: answer });

    return { answer, messageCount: this.messages.length };
  }

  clearHistory() {
    this.messages = [];
    return { status: 'History cleared' };
  }

  getHistory() {
    return this.messages;
  }
}
```

### 2. Streaming Responses

Stream tokens as they arrive:

```typescript
class Agent {
  async stream(input, onChunk) {
    if (!this.apiKey) {
      return { error: 'Please set your API key' };
    }

    try {
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
          ],
          stream: true  // Enable streaming
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content && onChunk) {
                onChunk(content);
              }
            } catch (e) {
              // Skip parsing errors
            }
          }
        }
      }

      return { status: 'complete' };
    } catch (error) {
      return { error: error.message };
    }
  }
}

// Usage
await agent.stream('Tell me a story', (chunk) => {
  document.getElementById('output').textContent += chunk;
});
```

### 3. Multiple AI Providers

Support OpenAI, Anthropic, etc.:

```typescript
class Agent {
  constructor(manifest) {
    this.manifest = manifest;
    this.providers = {
      openai: { apiKey: null, endpoint: 'https://api.openai.com/v1/chat/completions' },
      anthropic: { apiKey: null, endpoint: 'https://api.anthropic.com/v1/messages' }
    };
    this.currentProvider = 'openai';
  }

  setProvider(name, apiKey) {
    if (!this.providers[name]) {
      return { error: 'Unknown provider: ' + name };
    }
    this.providers[name].apiKey = apiKey;
    this.currentProvider = name;
    return { status: 'Provider set to ' + name };
  }

  async run(input) {
    const provider = this.providers[this.currentProvider];

    if (this.currentProvider === 'openai') {
      return await this.runOpenAI(input, provider);
    } else if (this.currentProvider === 'anthropic') {
      return await this.runAnthropic(input, provider);
    }
  }

  async runOpenAI(input, provider) {
    // OpenAI implementation
  }

  async runAnthropic(input, provider) {
    // Anthropic implementation
  }
}
```

### 4. Tool/Function Calling

Implement tools without frameworks:

```typescript
class Agent {
  constructor(manifest) {
    this.manifest = manifest;
    this.apiKey = null;
    this.tools = {
      weather: this.getWeather.bind(this),
      calculate: this.calculate.bind(this)
    };
  }

  async run(input) {
    // First, ask LLM which tool to use
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + this.apiKey
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Respond with ONLY one of: weather, calculate, or respond'
          },
          { role: 'user', content: input }
        ]
      })
    });

    const data = await response.json();
    const action = data.choices[0].message.content.trim().toLowerCase();

    // Route to appropriate tool
    if (this.tools[action]) {
      return await this.tools[action](input);
    } else {
      return await this.respond(input);
    }
  }

  async getWeather(input) {
    // Extract location and fetch weather
    const cityMatch = input.match(/weather.*?in\s+([a-zA-Z\s]+)/i);
    const city = cityMatch ? cityMatch[1].trim() : 'London';

    const response = await fetch(`https://wttr.in/${city}?format=j1`);
    const data = await response.json();

    return {
      tool: 'weather',
      result: `Weather in ${city}: ${data.current_condition[0].weatherDesc[0].value}`
    };
  }

  async calculate(input) {
    // Simple math evaluation (be careful with eval in production!)
    try {
      const match = input.match(/(\d+)\s*[\+\-\*\/]\s*(\d+)/);
      if (match) {
        const result = eval(match[0]);  // Only in sandboxed environment!
        return { tool: 'calculate', result };
      }
    } catch (e) {
      return { error: 'Could not calculate' };
    }
  }

  async respond(input) {
    // Standard LLM response
  }
}
```

---

## Error Handling

Always handle errors gracefully:

```typescript
class Agent {
  async run(input) {
    // Validate input
    if (!input || typeof input !== 'string') {
      return { error: 'Invalid input: must be a non-empty string' };
    }

    // Check API key
    if (!this.apiKey) {
      return {
        error: 'API key not set',
        instructions: 'Use: agent.setApiKey("sk-...")'
      };
    }

    try {
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

      // Check HTTP status
      if (!response.ok) {
        const error = await response.json();
        return {
          error: error.error?.message || 'API request failed',
          status: response.status
        };
      }

      const data = await response.json();

      // Validate response structure
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        return { error: 'Invalid API response structure' };
      }

      return {
        answer: data.choices[0].message.content,
        usage: data.usage,
        model: data.model
      };

    } catch (error) {
      // Network errors, parsing errors, etc.
      return {
        error: 'Request failed: ' + error.message,
        type: error.name
      };
    }
  }
}
```

---

## Security Best Practices

### 1. Never Hardcode API Keys

```typescript
// Bad
this.apiKey = 'sk-proj-hardcoded-key';

// Good
setApiKey(key) {
  this.apiKey = key;
  return { status: 'API key set' };
}
```

### 2. Whitelist Domains

```typescript
permissions: {
  network: [
    'api.openai.com',    // Specific domains only
    'wttr.in'            // No wildcards unless necessary
  ],
  storage: false,         // Only if needed
  code: false             // Almost never needed
}
```

### 3. Validate All Inputs

```typescript
async run(input) {
  // Type checking
  if (typeof input !== 'string') {
    return { error: 'Input must be a string' };
  }

  // Length limits
  if (input.length > 10000) {
    return { error: 'Input too long (max 10000 characters)' };
  }

  // Sanitize if necessary
  input = input.trim();

  // Proceed...
}
```

### 4. Handle Sensitive Data

```typescript
setApiKey(key) {
  // Validate key format
  if (!key.startsWith('sk-')) {
    return { error: 'Invalid API key format' };
  }

  this.apiKey = key;

  // Don't log or expose the key
  return { status: 'API key set successfully' };
}

// Don't expose API key in getState()
getState() {
  return {
    messages: this.messages,
    hasApiKey: !!this.apiKey,  // Boolean, not the key itself
    messageCount: this.messages.length
  };
}
```

---

## Best Practices

1. **Keep it Simple**: Pure JavaScript with no dependencies
2. **Error Handling**: Always catch and return errors gracefully
3. **API Keys**: Never hardcode, always let users set them
4. **Permissions**: Only whitelist necessary domains
5. **State Management**: Use instance properties for state
6. **Documentation**: Provide clear usage examples

---

## Testing Your Agent

```javascript
// In browser console after opening the HTML file

// 1. Check agent is loaded
console.log(window.agent);

// 2. Set API key
await window.agent.setApiKey('sk-proj-...');

// 3. Test basic functionality
const result = await window.agent.run('Hello!');
console.log(result);

// 4. Check error handling
const error = await window.agent.run(null);
console.log(error);

// 5. Check manifest
console.log(window.agent.getManifest());
```

---

## Learn More

- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [agent.html Specification](../../README.md)
