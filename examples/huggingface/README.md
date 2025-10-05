# HuggingFace → agent.html

Convert your HuggingFace-powered agents into portable, self-contained agent.html files using the Inference API.

## Examples

### Simple Inference Agent (`simple-agent.ts`)

AI agent using HuggingFace Inference API for text generation.

**Features:**
- HuggingFace Inference API integration
- Multiple model support (Mistral, Llama, Gemma, Phi, etc.)
- Conversation history management
- Model switching

**Usage:**
```bash
bun run examples/huggingface/simple-agent.ts
```

Opens `simple-agent.html` in browser, then:
```javascript
// Set your HuggingFace API key
await window.agent.setApiKey('hf_...')

// Ask questions
const result = await window.agent.run('What is machine learning?')
console.log(result.answer)

// Switch models
window.agent.setModel('meta-llama/Llama-2-7b-chat-hf')

// See available models
window.agent.getAvailableModels()

// Check conversation history
window.agent.getHistory()

// Clear history
window.agent.clearHistory()
```

---

## Pattern: Creating agent.html files with HuggingFace

### Step 1: Get a HuggingFace API Key

1. Sign up at [HuggingFace](https://huggingface.co/)
2. Go to Settings → Access Tokens
3. Create a new token with "read" permissions
4. Copy the token (starts with `hf_`)

### Step 2: Define Your Agent

```typescript
const agentCode = `
class Agent {
  constructor(manifest) {
    this.manifest = manifest;
    this.apiKey = null;
    this.model = 'mistralai/Mistral-7B-Instruct-v0.2';
  }

  async run(input) {
    if (!this.apiKey) {
      return { error: 'Please set your HuggingFace API key' };
    }

    const response = await fetch(
      \`https://api-inference.huggingface.co/models/\${this.model}\`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: input,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.7
          }
        })
      }
    );

    const data = await response.json();
    return {
      answer: data[0]?.generated_text || data.generated_text
    };
  }

  setApiKey(key) {
    this.apiKey = key;
  }

  setModel(modelName) {
    this.model = modelName;
  }
}
`
```

### Step 3: Create AgentFile

```typescript
import { AgentFile } from 'agent-file'

const agentHTML = await AgentFile.create({
  manifest: {
    id: 'my-hf-agent',
    name: 'My HuggingFace Agent',
    version: '1.0.0',

    permissions: {
      network: ['api-inference.huggingface.co'],
      storage: true,  // For conversation history
      code: false
    },

    capabilities: {
      memory: true,
      code: false
    }
  },

  code: agentCode,
  ui: 'full'
})

await Bun.write('my-agent.html', agentHTML)
```

---

## Available Models

The HuggingFace Inference API supports many models:

### Text Generation

```javascript
// Mistral (recommended for general use)
agent.setModel('mistralai/Mistral-7B-Instruct-v0.2')

// Meta Llama 2
agent.setModel('meta-llama/Llama-2-7b-chat-hf')

// Google Gemma
agent.setModel('google/gemma-7b-it')

// Microsoft Phi-2
agent.setModel('microsoft/phi-2')

// Zephyr
agent.setModel('HuggingFaceH4/zephyr-7b-beta')
```

### Other Tasks

You can also use HuggingFace for:
- **Image Generation**: `stabilityai/stable-diffusion-2-1`
- **Speech Recognition**: `openai/whisper-large-v3`
- **Translation**: `facebook/mbart-large-50-many-to-many-mmt`
- **Summarization**: `facebook/bart-large-cnn`
- **Question Answering**: `deepset/roberta-base-squad2`

---

## Advanced Patterns

### 1. Conversation History

Maintain context across multiple queries:

```typescript
class Agent {
  constructor(manifest) {
    this.conversationHistory = [];
  }

  async run(input) {
    // Add user message
    this.conversationHistory.push({
      role: 'user',
      content: input
    });

    // Format for model (e.g., Mistral format)
    let formatted = '';
    for (const msg of this.conversationHistory) {
      if (msg.role === 'user') {
        formatted += \`[INST] \${msg.content} [/INST]\\n\`;
      } else {
        formatted += \`\${msg.content}\\n\`;
      }
    }

    // Send to API
    const response = await this.callApi(formatted);

    // Add assistant response
    this.conversationHistory.push({
      role: 'assistant',
      content: response
    });

    return { answer: response };
  }

  clearHistory() {
    this.conversationHistory = [];
  }
}
```

### 2. Model Loading Status

HuggingFace models may need time to "warm up":

```typescript
async run(input) {
  const response = await fetch(apiUrl, options);
  const data = await response.json();

  // Check if model is loading
  if (data.error?.includes('loading')) {
    return {
      loading: true,
      estimatedTime: data.estimated_time,
      message: 'Model is loading, please try again in a few seconds'
    };
  }

  return { answer: data[0].generated_text };
}
```

### 3. Streaming Responses

Some models support streaming:

```typescript
async stream(input, onChunk) {
  const response = await fetch(apiUrl, {
    ...options,
    body: JSON.stringify({
      inputs: input,
      parameters: {
        max_new_tokens: 500,
        stream: true
      }
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.token?.text) {
          onChunk(parsed.token.text);
        }
      } catch (e) {
        // Skip malformed JSON
      }
    }
  }
}

// Usage
await agent.stream('Tell me a story', (chunk) => {
  document.getElementById('output').textContent += chunk;
});
```

### 4. Image Generation

Use Stable Diffusion or other image models:

```typescript
class Agent {
  constructor(manifest) {
    this.manifest = manifest;
    this.apiKey = null;
    this.imageModel = 'stabilityai/stable-diffusion-2-1';
  }

  async generateImage(prompt) {
    const response = await fetch(
      \`https://api-inference.huggingface.co/models/\${this.imageModel}\`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: prompt
        })
      }
    );

    const blob = await response.blob();
    const imageUrl = URL.createObjectURL(blob);

    return {
      imageUrl,
      prompt
    };
  }
}

// Usage
const result = await agent.generateImage('a beautiful sunset over mountains');
document.getElementById('img').src = result.imageUrl;
```

---

## Error Handling

Always handle common HuggingFace API errors:

```typescript
async run(input) {
  try {
    const response = await fetch(apiUrl, options);

    if (!response.ok) {
      const error = await response.json();

      // Model is loading
      if (error.error?.includes('loading')) {
        return {
          error: 'Model is loading',
          estimatedTime: error.estimated_time,
          retry: true
        };
      }

      // Rate limit
      if (response.status === 429) {
        return {
          error: 'Rate limit exceeded. Please wait and try again.',
          status: 429
        };
      }

      // Invalid token
      if (response.status === 401) {
        return {
          error: 'Invalid API token. Please check your key.',
          status: 401
        };
      }

      return {
        error: error.error || 'Unknown error',
        status: response.status
      };
    }

    const data = await response.json();
    return { answer: data[0]?.generated_text || data.generated_text };

  } catch (error) {
    return {
      error: 'Request failed: ' + error.message
    };
  }
}
```

---

## Security Considerations

### 1. API Key Management

```typescript
// Good: Let users set their own key
setApiKey(key) {
  this.apiKey = key;
  return { status: 'API key set' };
}

// Bad: Never hardcode API keys
this.apiKey = 'hf_hardcoded_key';
```

### 2. Whitelist Domains

```typescript
permissions: {
  network: [
    'api-inference.huggingface.co',  // Inference API
    'huggingface.co'                 // Model hub (if needed)
  ],
  storage: true,   // For conversation history
  code: false      // No eval()
}
```

### 3. Content Filtering

Consider adding content filters:

```typescript
async run(input) {
  // Basic content filtering
  const blockedWords = ['...'];
  if (blockedWords.some(word => input.toLowerCase().includes(word))) {
    return { error: 'Content policy violation' };
  }

  // Proceed with API call
  // ...
}
```

---

## Best Practices

1. **Model Selection**: Start with Mistral-7B for best balance of quality and speed
2. **Rate Limits**: Implement retry logic for rate-limited requests
3. **Model Warmup**: Handle "model loading" responses gracefully
4. **Caching**: Use conversation history to maintain context
5. **Error Messages**: Provide clear, actionable error messages to users

---

## MediaPipe Integration (Advanced)

For local inference using MediaPipe (based on `huggingface.js`):

```typescript
class Agent {
  async initLocalModel() {
    // Load MediaPipe GenAI tasks from CDN
    const { FilesetResolver, LlmInference } = await import(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai/+esm'
    );

    const genaiFileset = await FilesetResolver.forGenAiTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai/wasm'
    );

    // Download and cache model using OPFS
    const opfs = await navigator.storage.getDirectory();
    const fileHandle = await opfs.getFileHandle('model.litertlm');
    const file = await fileHandle.getFile();

    this.llm = await LlmInference.createFromOptions(genaiFileset, {
      baseOptions: { modelAssetBuffer: file.stream().getReader() },
      maxTokens: 2048
    });
  }

  async run(input) {
    if (!this.llm) await this.initLocalModel();

    let result = '';
    await this.llm.generateResponse(input, (text, done) => {
      result += text;
    });

    return { answer: result };
  }
}
```

Note: This requires OAuth and OPFS support. See original `huggingface.js` for full implementation.

---

## Learn More

- [HuggingFace Inference API](https://huggingface.co/docs/api-inference/index)
- [HuggingFace Models](https://huggingface.co/models)
- [MediaPipe GenAI Tasks](https://developers.google.com/mediapipe/solutions/genai/llm_inference/web_js)
- [agent.html Specification](../../README.md)
