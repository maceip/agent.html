/**
 * Vanilla JavaScript Agent → agent.html
 *
 * Pure JavaScript agent with no frameworks
 */

import { AgentFile } from '../../src/index'

async function createVanillaAgentFile() {
  console.log('Creating vanilla JavaScript agent...')

  const agentCode = `
class Agent {
  constructor(manifest) {
    this.manifest = manifest;
    this.apiKey = null;
  }

  async run(input) {
    if (!this.apiKey) {
      return {
        error: 'Please set your OpenAI API key',
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
            {
              role: 'system',
              content: 'You are a helpful assistant that provides clear, concise answers.'
            },
            {
              role: 'user',
              content: input
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          error: error.error?.message || 'API request failed'
        };
      }

      const data = await response.json();

      return {
        answer: data.choices[0].message.content,
        usage: {
          prompt_tokens: data.usage.prompt_tokens,
          completion_tokens: data.usage.completion_tokens,
          total_tokens: data.usage.total_tokens
        }
      };
    } catch (error) {
      return {
        error: 'Request failed: ' + error.message
      };
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

  const agentHTML = await AgentFile.create({
    manifest: {
      id: 'vanilla-simple-agent',
      name: 'Vanilla JavaScript Agent',
      version: '1.0.0',
      description: 'A simple AI agent with no framework dependencies',

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

  await Bun.write('examples/vanilla/simple-agent.html', agentHTML)

  console.log('\nCreated simple-agent.html')
  console.log('  Pure JavaScript, no frameworks')
  console.log('  File size:', (agentHTML.length / 1024).toFixed(1), 'KB')
}

createVanillaAgentFile().catch(console.error)
