/**
 * Example: MCP-Enabled Agent
 * Demonstrates how to create an agent that uses MCP servers for tool calling
 */

import { AgentFile } from '../../src/agent-file'

// Agent code that uses MCP tools
const agentCode = `
class Agent {
  constructor(manifest) {
    this.manifest = manifest;
    this.mcp = null; // Will be injected by the runtime
  }

  async run(input) {
    if (!this.mcp) {
      return {
        error: 'MCP not initialized',
        message: 'MCP manager was not properly initialized'
      };
    }

    try {
      // Get all available tools from all MCP servers
      const tools = this.mcp.getAllTools();

      if (!input || input.trim() === '') {
        // List available tools
        return {
          message: 'MCP Agent Ready',
          availableTools: tools.map(t => ({
            server: t.server,
            name: t.tool.name,
            description: t.tool.description
          })),
          instructions: 'Enter a tool name and arguments to call a tool. Example: "filesystem:read_file path=/etc/hosts"'
        };
      }

      // Parse input to extract tool name and arguments
      const parsed = this.parseInput(input);

      if (!parsed) {
        return {
          error: 'Invalid input format',
          message: 'Use format: "toolName arg1=value1 arg2=value2"'
        };
      }

      // Call the tool
      const result = await this.mcp.callTool(parsed.toolName, parsed.args);

      return {
        toolCalled: parsed.toolName,
        arguments: parsed.args,
        result: result
      };

    } catch (error) {
      return {
        error: error.message,
        message: 'Failed to execute MCP tool'
      };
    }
  }

  parseInput(input) {
    // Simple parser: "toolName arg1=value1 arg2=value2"
    const parts = input.trim().split(/\\s+/);
    if (parts.length === 0) return null;

    const toolName = parts[0];
    const args = {};

    for (let i = 1; i < parts.length; i++) {
      const match = parts[i].match(/^([^=]+)=(.+)$/);
      if (match) {
        args[match[1]] = match[2];
      }
    }

    return { toolName, args };
  }

  getManifest() {
    return this.manifest;
  }

  async listTools() {
    if (!this.mcp) {
      return { error: 'MCP not initialized' };
    }
    return this.mcp.getAllTools();
  }
}
`.trim()

const manifest = {
  id: 'mcp-demo-agent',
  name: 'MCP Demo Agent',
  version: '1.0.0',
  description: 'Agent that demonstrates MCP server integration',
  author: 'agent.html',
  permissions: {
    network: ['localhost', '127.0.0.1', 'example.com'],
    storage: false,
    code: false
  },
  capabilities: {
    memory: false,
    code: false,
    browser: true
  },
  mcp: {
    servers: [
      {
        name: 'test-server',
        url: 'http://localhost:3000',
        description: 'Test MCP server with example tools',
        auth: {
          type: 'none' as const
        }
      }
    ]
  }
}

// Generate the agent HTML
async function main() {
  const html = await AgentFile.create({
    manifest,
    code: agentCode,
    ui: 'full',
    styles: `
      .agent-body {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .tools-list {
        background: #f9fafb;
        border-radius: 8px;
        padding: 16px;
        max-height: 300px;
        overflow-y: auto;
      }

      .tool-item {
        padding: 8px;
        border-bottom: 1px solid #e5e7eb;
      }

      .tool-item:last-child {
        border-bottom: none;
      }

      .tool-name {
        font-weight: 600;
        color: #1f2937;
      }

      .tool-server {
        font-size: 12px;
        color: #6b7280;
      }
    `
  })

  // Write to file
  await Bun.write('examples/mcp/mcp-agent.html', html)
  console.log('✓ MCP agent created: examples/mcp/mcp-agent.html')
  console.log('  Open in browser to test MCP integration')
  console.log('')
  console.log('Note: You need MCP servers running at:')
  console.log('  - http://localhost:3000/mcp (filesystem)')
  console.log('  - http://localhost:3001/mcp (database)')
}

main()
