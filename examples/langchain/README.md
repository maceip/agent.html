# LangGraph → agent.html

Convert your LangGraph agents into portable, self-contained agent.html files.

## Examples

### Stateful Agent (`langgraph-agent.ts`)

LangGraph agent with state management and action routing.

**Features:**
- State management (conversation history)
- Action routing (respond/weather/calculate)
- Multiple API integrations
- Tool-like behavior

**Usage:**
```bash
bun run examples/langchain/langgraph-agent.ts
```

Try different queries:
```javascript
window.agent.setApiKey('sk-...')

// Weather tool
await window.agent.run('What is the weather in Tokyo?')

// Math tool
await window.agent.run('Calculate 15 * 24')

// General response
await window.agent.run('What is AI?')

// Check state
window.agent.getState()

// Clear conversation
window.agent.clearState()
```

---

## Pattern: Converting LangChain to agent.html

### Step 1: Define your chain

```typescript
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'

const prompt = ChatPromptTemplate.fromMessages([
  ['system', 'You are a helpful assistant'],
  ['user', '{input}']
])

const model = new ChatOpenAI({ model: 'gpt-4o-mini' })
const chain = prompt.pipe(model)
```

### Step 2: Convert to browser-compatible code

```typescript
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
        'Authorization': 'Bearer ' + this.apiKey
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
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
```

### Step 3: Create AgentFile

```typescript
import { AgentFile } from 'agent-file'

const agentHTML = await AgentFile.create({
  manifest: {
    id: 'my-langchain-agent',
    name: 'My LangChain Agent',
    version: '1.0.0',
    permissions: {
      network: ['api.openai.com'],
      storage: false,
      code: false
    }
  },
  code: agentCode
})

await Bun.write('my-agent.html', agentHTML)
```

---

## LangGraph State Management

For stateful agents, maintain state in the Agent class:

```typescript
class Agent {
  constructor(manifest) {
    this.state = {
      messages: [],
      context: {}
    };
  }

  async run(input) {
    // Add to state
    this.state.messages.push({ role: 'user', content: input });

    // Process with state
    const response = await this.processWithState(input);

    // Update state
    this.state.messages.push({ role: 'assistant', content: response });

    return response;
  }

  getState() {
    return this.state;
  }
}
```

---

## Tool Integration

Convert LangChain tools to methods:

```typescript
class Agent {
  async run(input) {
    // Route to appropriate tool
    if (input.includes('weather')) {
      return await this.weatherTool(input);
    } else if (input.includes('calculate')) {
      return await this.calculatorTool(input);
    } else {
      return await this.llmTool(input);
    }
  }

  async weatherTool(input) {
    // Extract location and fetch weather
    const response = await fetch(\`https://wttr.in/\${location}?format=j1\`);
    return response.json();
  }

  async calculatorTool(input) {
    // Use LLM to extract and solve math
    // ...
  }

  async llmTool(input) {
    // Standard LLM call
    // ...
  }
}
```

---

## Security

AgentFile automatically enforces permissions:

```typescript
permissions: {
  network: ['api.openai.com', 'wttr.in'],  // Only these domains
  storage: true,   // Allow localStorage for state
  code: false      // No eval()
}
```

Any `fetch()` to non-whitelisted domains will throw an error.

---

## Best Practices

1. **API Keys**: Never hardcode API keys. Let users set them:
   ```typescript
   setApiKey(key) {
     this.apiKey = key;
   }
   ```

2. **State Management**: Use instance properties for state:
   ```typescript
   constructor(manifest) {
     this.state = { messages: [] };
   }
   ```

3. **Error Handling**: Always catch and return errors:
   ```typescript
   try {
     return await this.process(input);
   } catch (error) {
     return { error: error.message };
   }
   ```

4. **Permissions**: Only whitelist necessary domains:
   ```typescript
   permissions: {
     network: ['api.openai.com'],  // Specific domains only
     storage: true,  // Only if you need state persistence
     code: false     // Never allow unless absolutely necessary
   }
   ```

---

## Dependencies

```bash
bun install @langchain/core @langchain/langgraph @langchain/openai
```

---

## Learn More

- [LangChain Documentation](https://js.langchain.com/docs/)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraphjs/)
- [agent.html Specification](../../README.md)
