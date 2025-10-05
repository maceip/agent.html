/**
 * LiterT Simple Agent → agent.html
 *
 * Shows how to convert a LiterT agent into a portable agent.html file
 * Loading LiterT from jsdelivr CDN
 */

import { AgentFile } from '../../src/index'

async function createLiterTAgentFile() {
  console.log('Creating LiterT agent...')

  // AgentFile code that loads LiterT from CDN and uses it
  const agentCode = `
class Agent {
  constructor(manifest) {
    this.manifest = manifest;
    this.litert = null;
    this.client = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      // Load LiterT from jsdelivr
      const { LiteRT } = await import('https://cdn.jsdelivr.net/npm/@litert/core@latest/dist/index.js');

      this.litert = new LiteRT({
        provider: 'openai',
        apiKey: null // Will be set by user
      });

      this.initialized = true;
      console.log('LiterT initialized');
    } catch (error) {
      console.error('Failed to load LiterT:', error);
      throw error;
    }
  }

  async run(input) {
    await this.init();

    if (!this.litert || !this.litert.apiKey) {
      return {
        error: 'Please set your OpenAI API key first',
        instructions: 'Use: agent.setApiKey("sk-...")'
      };
    }

    try {
      // Use LiterT to process the input
      const response = await this.litert.generate({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: input }
        ],
        temperature: 0.7
      });

      return {
        response: response.content,
        usage: response.usage,
        model: response.model
      };
    } catch (error) {
      return {
        error: error.message
      };
    }
  }

  async setApiKey(key) {
    await this.init();
    this.litert.apiKey = key;
    return { status: 'API key set successfully' };
  }

  async stream(input, onChunk) {
    await this.init();

    if (!this.litert || !this.litert.apiKey) {
      return {
        error: 'Please set your API key first'
      };
    }

    try {
      const stream = await this.litert.generateStream({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: input }
        ]
      });

      for await (const chunk of stream) {
        if (onChunk) onChunk(chunk.content);
      }

      return { status: 'complete' };
    } catch (error) {
      return { error: error.message };
    }
  }
}
  `.trim()

  // Create AgentFile
  const agentHTML = await AgentFile.create({
    manifest: {
      id: 'litert-simple-agent',
      name: 'LiterT Simple Agent',
      version: '1.0.0',
      description: 'A simple agent using LiterT loaded from CDN',

      permissions: {
        network: ['api.openai.com', 'cdn.jsdelivr.net'], // OpenAI + CDN
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

  // Save to file
  await Bun.write('examples/litert/simple-agent.html', agentHTML)

  console.log('\nCreated litert simple-agent.html')
  console.log('  Loads LiterT from: https://cdn.jsdelivr.net/npm/@litert/core')
  console.log('\nUsage:')
  console.log('  window.agent.setApiKey("sk-...")')
  console.log('  window.agent.run("Hello world")')
}

createLiterTAgentFile().catch(console.error)
