/**
 * HuggingFace Inference Agent → agent.html
 *
 * Shows how to create an agent.html file using HuggingFace Inference API
 * Based on MediaPipe/HuggingFace patterns from huggingface.js
 */

import { AgentFile } from '../../src/index'

async function createHuggingFaceAgentFile() {
  console.log('Creating HuggingFace Inference agent...')

  // AgentFile code that uses HuggingFace Inference API
  const agentCode = `
class Agent {
  constructor(manifest) {
    this.manifest = manifest;
    this.apiKey = null;
    this.model = 'mistralai/Mistral-7B-Instruct-v0.2';
    this.conversationHistory = [];
  }

  async run(input) {
    if (!this.apiKey) {
      return {
        error: 'Please set your HuggingFace API key first',
        instructions: 'Use: agent.setApiKey("hf_...")'
      };
    }

    try {
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: input
      });

      // Call HuggingFace Inference API
      const response = await fetch(
        \`https://api-inference.huggingface.co/models/\${this.model}\`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + this.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: this.formatConversation(),
            parameters: {
              max_new_tokens: 500,
              temperature: 0.7,
              top_p: 0.95,
              return_full_text: false
            }
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          error: error.error || 'API request failed',
          status: response.status
        };
      }

      const data = await response.json();
      const answer = data[0]?.generated_text || data.generated_text || 'No response';

      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: answer
      });

      return {
        answer,
        model: this.model,
        messageCount: this.conversationHistory.length
      };
    } catch (error) {
      return {
        error: 'Request failed: ' + error.message
      };
    }
  }

  formatConversation() {
    // Format conversation for Mistral/Llama style models
    let formatted = '';
    for (const msg of this.conversationHistory) {
      if (msg.role === 'user') {
        formatted += \`[INST] \${msg.content} [/INST]\\n\`;
      } else {
        formatted += \`\${msg.content}\\n\`;
      }
    }
    return formatted;
  }

  setApiKey(key) {
    this.apiKey = key;
    return { status: 'API key set successfully' };
  }

  setModel(modelName) {
    this.model = modelName;
    return { status: 'Model set to ' + modelName };
  }

  getAvailableModels() {
    return {
      models: [
        'mistralai/Mistral-7B-Instruct-v0.2',
        'meta-llama/Llama-2-7b-chat-hf',
        'HuggingFaceH4/zephyr-7b-beta',
        'google/gemma-7b-it',
        'microsoft/phi-2'
      ],
      current: this.model
    };
  }

  clearHistory() {
    this.conversationHistory = [];
    return { status: 'Conversation history cleared' };
  }

  getHistory() {
    return {
      messages: this.conversationHistory,
      count: this.conversationHistory.length
    };
  }

  getManifest() {
    return this.manifest;
  }
}
  `.trim()

  // Create AgentFile
  const agentHTML = await AgentFile.create({
    manifest: {
      id: 'huggingface-simple-agent',
      name: 'HuggingFace Inference Agent',
      version: '1.0.0',
      description: 'An agent using HuggingFace Inference API for text generation',

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

  // Save to file
  await Bun.write('examples/huggingface/simple-agent.html', agentHTML)

  console.log('\nCreated huggingface simple-agent.html')
  console.log('  Uses: HuggingFace Inference API')
  console.log('  Default model: Mistral-7B-Instruct')
  console.log('\nUsage:')
  console.log('  window.agent.setApiKey("hf_...")')
  console.log('  window.agent.run("Hello!")')
  console.log('  window.agent.getAvailableModels()')
  console.log('  window.agent.setModel("meta-llama/Llama-2-7b-chat-hf")')
}

createHuggingFaceAgentFile().catch(console.error)
