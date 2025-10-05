/**
 * LangGraph Stateful Agent → agent.html
 *
 * Shows how to convert a LangGraph agent with state management
 * into a portable agent.html file
 */

import { AgentFile } from '../../src/index'
import { ChatOpenAI } from '@langchain/openai'
import { StateGraph, END } from '@langchain/langgraph'
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages'

// Define the state
interface AgentState {
  messages: BaseMessage[]
  nextAction?: string
}

async function createLangGraphAgentFile() {
  console.log('Creating LangGraph stateful agent...')

  // This is the implementation that will run in the browser
  const agentCode = `
class Agent {
  constructor(manifest) {
    this.manifest = manifest;
    this.apiKey = null;
    this.state = { messages: [], context: {} };
  }

  async run(input) {
    if (!this.apiKey) {
      return {
        error: 'Please set your OpenAI API key',
        instructions: 'window.agent.setApiKey("sk-...")'
      };
    }

    try {
      // Add user message to state
      this.state.messages.push({
        role: 'user',
        content: input
      });

      // Decide next action based on input
      let action = 'respond';
      if (input.toLowerCase().includes('weather')) {
        action = 'check_weather';
      } else if (input.toLowerCase().includes('calculate') || input.toLowerCase().includes('math')) {
        action = 'calculate';
      }

      let response;

      // Execute action
      if (action === 'check_weather') {
        response = await this.checkWeather(input);
      } else if (action === 'calculate') {
        response = await this.calculate(input);
      } else {
        response = await this.respond(input);
      }

      // Add AI message to state
      this.state.messages.push({
        role: 'assistant',
        content: response
      });

      return {
        response,
        action,
        messageCount: this.state.messages.length
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async respond(input) {
    // Standard LLM response
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
          ...this.state.messages
        ]
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async checkWeather(input) {
    // Extract city from input
    const cityMatch = input.match(/weather.*?in\\s+([a-zA-Z\\s]+)/i);
    const city = cityMatch ? cityMatch[1].trim() : 'London';

    // Get weather from wttr.in
    const weather = await fetch(\`https://wttr.in/\${city}?format=j1\`);
    const data = await weather.json();

    const current = data.current_condition[0];
    return \`The weather in \${city} is \${current.weatherDesc[0].value}, \\
temperature is \${current.temp_C}°C with \${current.humidity}% humidity.\`;
  }

  async calculate(input) {
    // Use LLM to extract and solve math
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
            content: 'You are a calculator. Extract the math problem and solve it. Return only the answer.'
          },
          { role: 'user', content: input }
        ]
      })
    });

    const data = await response.json();
    return 'The answer is: ' + data.choices[0].message.content;
  }

  setApiKey(key) {
    this.apiKey = key;
    return { status: 'API key set' };
  }

  getState() {
    return this.state;
  }

  clearState() {
    this.state = { messages: [], context: {} };
    return { status: 'State cleared' };
  }
}
  `.trim()

  // Create AgentFile with state management
  const agentHTML = await AgentFile.create({
    manifest: {
      id: 'langgraph-stateful-agent',
      name: 'LangGraph Stateful Agent',
      version: '1.0.0',
      description: 'A stateful agent that routes to different tools based on input',

      permissions: {
        network: ['api.openai.com', 'wttr.in'], // OpenAI + Weather API
        storage: true, // For state persistence
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
  await Bun.write('examples/langchain/langgraph-agent.html', agentHTML)

  console.log('\nCreated langgraph-agent.html')
  console.log('\nFeatures:')
  console.log('  - Stateful conversation')
  console.log('  - Action routing (respond/weather/calculate)')
  console.log('  - Multiple API integrations')
  console.log('\nTry asking:')
  console.log('  - "What is the weather in Tokyo?"')
  console.log('  - "Calculate 15 * 24"')
  console.log('  - "What is the capital of France?"')
}

createLangGraphAgentFile().catch(console.error)
