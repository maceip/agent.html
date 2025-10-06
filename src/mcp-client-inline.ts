/**
 * Generate inline MCP client code for browser embedding
 * This creates a self-contained MCP client that can be injected into agent HTML files
 */

export function generateMCPClientCode(): string {
  return `
/**
 * MCP Client for Browser - Inline Version
 * Implements Streamable HTTP transport for Model Context Protocol
 */
class MCPClient {
  constructor(url, authToken) {
    this.url = url;
    this.sessionId = null;
    this.serverInfo = null;
    this.tools = new Map();
    this.resources = new Map();
    this.requestId = 0;
    this.authToken = authToken;
  }

  async connect() {
    const response = await this.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {
        tools: {},
        resources: {}
      },
      clientInfo: {
        name: 'agent.html-mcp-client',
        version: '1.0.0'
      }
    });

    this.serverInfo = response.result.serverInfo;

    if (response.sessionId) {
      this.sessionId = response.sessionId;
    }

    await this.notify('notifications/initialized');
    await this.discoverTools();
    await this.discoverResources();
  }

  async discoverTools() {
    try {
      const response = await this.request('tools/list', {});
      if (response.result?.tools) {
        for (const tool of response.result.tools) {
          this.tools.set(tool.name, tool);
        }
      }
    } catch (error) {
      console.warn('Failed to discover tools:', error);
    }
  }

  async discoverResources() {
    try {
      const response = await this.request('resources/list', {});
      if (response.result?.resources) {
        for (const resource of response.result.resources) {
          this.resources.set(resource.uri, resource);
        }
      }
    } catch (error) {
      console.warn('Failed to discover resources:', error);
    }
  }

  getTools() {
    return Array.from(this.tools.values());
  }

  getResources() {
    return Array.from(this.resources.values());
  }

  getServerInfo() {
    return this.serverInfo;
  }

  async callTool(name, args = {}) {
    const response = await this.request('tools/call', {
      name,
      arguments: args
    });

    if (response.error) {
      return {
        content: [{
          type: 'text',
          text: 'Error: ' + response.error.message
        }],
        isError: true
      };
    }

    return response.result;
  }

  async readResource(uri) {
    const response = await this.request('resources/read', { uri });
    if (response.error) {
      throw new Error(response.error.message);
    }
    return response.result;
  }

  async request(method, params) {
    const headers = {
      'Content-Type': 'application/json',
      'MCP-Protocol-Version': '2025-06-18'
    };

    if (this.sessionId) {
      headers['Mcp-Session-Id'] = this.sessionId;
    }

    if (this.authToken) {
      headers['Authorization'] = 'Bearer ' + this.authToken;
    }

    const requestBody = {
      jsonrpc: '2.0',
      id: ++this.requestId,
      method,
      params
    };

    const response = await fetch(this.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error('MCP request failed: ' + response.status + ' ' + response.statusText);
    }

    const sessionId = response.headers.get('Mcp-Session-Id');
    if (sessionId) {
      this.sessionId = sessionId;
    }

    const data = await response.json();
    return data;
  }

  async notify(method, params = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'MCP-Protocol-Version': '2025-06-18'
    };

    if (this.sessionId) {
      headers['Mcp-Session-Id'] = this.sessionId;
    }

    if (this.authToken) {
      headers['Authorization'] = 'Bearer ' + this.authToken;
    }

    const requestBody = {
      jsonrpc: '2.0',
      method,
      params
    };

    await fetch(this.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });
  }

  async disconnect() {
    this.sessionId = null;
    this.serverInfo = null;
    this.tools.clear();
    this.resources.clear();
  }
}

class MCPManager {
  constructor() {
    this.clients = new Map();
  }

  async addServer(name, url, authToken) {
    const client = new MCPClient(url, authToken);
    await client.connect();
    this.clients.set(name, client);
  }

  getClient(name) {
    return this.clients.get(name);
  }

  getAllTools() {
    const allTools = [];
    for (const [serverName, client] of this.clients.entries()) {
      const tools = client.getTools();
      for (const tool of tools) {
        allTools.push({ server: serverName, tool });
      }
    }
    return allTools;
  }

  async callTool(toolName, args = {}) {
    for (const [serverName, client] of this.clients.entries()) {
      const tools = client.getTools();
      if (tools.some(t => t.name === toolName)) {
        return await client.callTool(toolName, args);
      }
    }
    throw new Error('Tool not found: ' + toolName);
  }

  async disconnectAll() {
    for (const client of this.clients.values()) {
      await client.disconnect();
    }
    this.clients.clear();
  }
}
`.trim();
}
