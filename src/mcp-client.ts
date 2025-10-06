/**
 * MCP Client for Browser Environments
 * Implements Streamable HTTP transport for Model Context Protocol
 */

export interface MCPTool {
  name: string
  description?: string
  inputSchema: {
    type: string
    properties?: Record<string, any>
    required?: string[]
  }
}

export interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

export interface MCPServerInfo {
  name: string
  version: string
  protocolVersion: string
  capabilities: {
    tools?: Record<string, any>
    resources?: Record<string, any>
    prompts?: Record<string, any>
  }
}

export interface MCPCallToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    mimeType?: string
  }>
  isError?: boolean
}

export class MCPClient {
  private url: string
  private sessionId: string | null = null
  private serverInfo: MCPServerInfo | null = null
  private tools: Map<string, MCPTool> = new Map()
  private resources: Map<string, MCPResource> = new Map()
  private requestId = 0
  private authToken?: string

  constructor(url: string, authToken?: string) {
    this.url = url
    this.authToken = authToken
  }

  /**
   * Initialize connection to MCP server
   */
  async connect(): Promise<void> {
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
    })

    this.serverInfo = response.result.serverInfo

    // Extract session ID from response headers if provided
    if (response.sessionId) {
      this.sessionId = response.sessionId
    }

    // Notify server we're initialized
    await this.notify('notifications/initialized')

    // Discover available tools and resources
    await this.discoverTools()
    await this.discoverResources()
  }

  /**
   * Discover available tools from the server
   */
  private async discoverTools(): Promise<void> {
    try {
      const response = await this.request('tools/list', {})

      if (response.result?.tools) {
        for (const tool of response.result.tools) {
          this.tools.set(tool.name, tool)
        }
      }
    } catch (error) {
      console.warn('Failed to discover tools:', error)
    }
  }

  /**
   * Discover available resources from the server
   */
  private async discoverResources(): Promise<void> {
    try {
      const response = await this.request('resources/list', {})

      if (response.result?.resources) {
        for (const resource of response.result.resources) {
          this.resources.set(resource.uri, resource)
        }
      }
    } catch (error) {
      console.warn('Failed to discover resources:', error)
    }
  }

  /**
   * Get list of available tools
   */
  getTools(): MCPTool[] {
    return Array.from(this.tools.values())
  }

  /**
   * Get list of available resources
   */
  getResources(): MCPResource[] {
    return Array.from(this.resources.values())
  }

  /**
   * Get server information
   */
  getServerInfo(): MCPServerInfo | null {
    return this.serverInfo
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(name: string, args: Record<string, any> = {}): Promise<MCPCallToolResult> {
    const response = await this.request('tools/call', {
      name,
      arguments: args
    })

    if (response.error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${response.error.message}`
        }],
        isError: true
      }
    }

    return response.result
  }

  /**
   * Read a resource from the MCP server
   */
  async readResource(uri: string): Promise<any> {
    const response = await this.request('resources/read', { uri })

    if (response.error) {
      throw new Error(response.error.message)
    }

    return response.result
  }

  /**
   * Send a JSON-RPC request to the MCP server
   */
  private async request(method: string, params: any): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'MCP-Protocol-Version': '2025-06-18'
    }

    if (this.sessionId) {
      headers['Mcp-Session-Id'] = this.sessionId
    }

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }

    const requestBody = {
      jsonrpc: '2.0',
      id: ++this.requestId,
      method,
      params
    }

    const response = await fetch(this.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`MCP request failed: ${response.status} ${response.statusText}`)
    }

    // Check for session ID in response headers
    const sessionId = response.headers.get('Mcp-Session-Id')
    if (sessionId) {
      this.sessionId = sessionId
    }

    const data = await response.json()
    return data
  }

  /**
   * Send a JSON-RPC notification (no response expected)
   */
  private async notify(method: string, params: any = {}): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'MCP-Protocol-Version': '2025-06-18'
    }

    if (this.sessionId) {
      headers['Mcp-Session-Id'] = this.sessionId
    }

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }

    const requestBody = {
      jsonrpc: '2.0',
      method,
      params
    }

    await fetch(this.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    this.sessionId = null
    this.serverInfo = null
    this.tools.clear()
    this.resources.clear()
  }
}

/**
 * MCP Manager - manages multiple MCP server connections
 */
export class MCPManager {
  private clients: Map<string, MCPClient> = new Map()

  /**
   * Add an MCP server connection
   */
  async addServer(name: string, url: string, authToken?: string): Promise<void> {
    const client = new MCPClient(url, authToken)
    await client.connect()
    this.clients.set(name, client)
  }

  /**
   * Get an MCP client by name
   */
  getClient(name: string): MCPClient | undefined {
    return this.clients.get(name)
  }

  /**
   * Get all available tools from all servers
   */
  getAllTools(): Array<{ server: string; tool: MCPTool }> {
    const allTools: Array<{ server: string; tool: MCPTool }> = []

    for (const [serverName, client] of this.clients.entries()) {
      const tools = client.getTools()
      for (const tool of tools) {
        allTools.push({ server: serverName, tool })
      }
    }

    return allTools
  }

  /**
   * Call a tool by name (searches all servers)
   */
  async callTool(toolName: string, args: Record<string, any> = {}): Promise<MCPCallToolResult> {
    // Find which server has this tool
    for (const [serverName, client] of this.clients.entries()) {
      const tools = client.getTools()
      if (tools.some(t => t.name === toolName)) {
        return await client.callTool(toolName, args)
      }
    }

    throw new Error(`Tool not found: ${toolName}`)
  }

  /**
   * Disconnect all servers
   */
  async disconnectAll(): Promise<void> {
    for (const client of this.clients.values()) {
      await client.disconnect()
    }
    this.clients.clear()
  }
}
