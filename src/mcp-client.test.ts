import { test, expect, mock } from 'bun:test'
import { MCPClient, MCPManager } from './mcp-client'

test('MCPClient constructs with URL and auth token', () => {
  const client = new MCPClient('http://localhost:3000', 'test-token')
  expect(client).toBeDefined()
})

test('MCPManager can be instantiated', () => {
  const manager = new MCPManager()
  expect(manager).toBeDefined()
})

test('MCPManager getAllTools returns empty array when no servers', () => {
  const manager = new MCPManager()
  const tools = manager.getAllTools()
  expect(tools).toEqual([])
})

test('MCPClient connection flow', async () => {
  const originalFetch = global.fetch

  global.fetch = mock(async (url: any, options: any) => {
    const body = JSON.parse(options.body)

    if (body.method === 'initialize') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          protocolVersion: '2025-06-18',
          serverInfo: {
            name: 'test',
            version: '1.0.0'
          },
          capabilities: { tools: {} }
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (body.method === 'notifications/initialized') {
      return new Response(null, { status: 204 })
    }

    if (body.method === 'tools/list') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          tools: [
            {
              name: 'test-tool',
              description: 'A test tool',
              inputSchema: {
                type: 'object',
                properties: {}
              }
            }
          ]
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (body.method === 'resources/list') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: { resources: [] }
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response('{}', { status: 404 })
  })

  try {
    const client = new MCPClient('http://localhost:3000')
    await client.connect()

    const tools = client.getTools()
    expect(tools.length).toBe(1)
    expect(tools[0].name).toBe('test-tool')

    const serverInfo = client.getServerInfo()
    expect(serverInfo?.name).toBe('test')
  } finally {
    global.fetch = originalFetch
  }
})

test('MCPClient tool calling flow', async () => {
  const originalFetch = global.fetch

  global.fetch = mock(async (url: any, options: any) => {
    const body = JSON.parse(options.body)

    if (body.method === 'initialize') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          protocolVersion: '2025-06-18',
          serverInfo: { name: 'test', version: '1.0.0' },
          capabilities: { tools: {} }
        }
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    if (body.method === 'notifications/initialized') {
      return new Response(null, { status: 204 })
    }

    if (body.method === 'tools/list') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          tools: [
            {
              name: 'echo',
              description: 'Echo a message',
              inputSchema: {
                type: 'object',
                properties: { message: { type: 'string' } },
                required: ['message']
              }
            }
          ]
        }
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    if (body.method === 'resources/list') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: { resources: [] }
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    if (body.method === 'tools/call') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          content: [{
            type: 'text',
            text: body.params.arguments.message
          }]
        }
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    return new Response('{}', { status: 404 })
  })

  try {
    const client = new MCPClient('http://localhost:3000')
    await client.connect()

    const result = await client.callTool('echo', { message: 'Hello World' })

    expect(result.content).toBeDefined()
    expect(result.content.length).toBe(1)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toBe('Hello World')
    expect(result.isError).toBeUndefined()
  } finally {
    global.fetch = originalFetch
  }
})

test('MCPClient handles tool call errors', async () => {
  const originalFetch = global.fetch

  global.fetch = mock(async (url: any, options: any) => {
    const body = JSON.parse(options.body)

    if (body.method === 'initialize') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          protocolVersion: '2025-06-18',
          serverInfo: { name: 'test', version: '1.0.0' },
          capabilities: { tools: {} }
        }
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    if (body.method === 'notifications/initialized') {
      return new Response(null, { status: 204 })
    }

    if (body.method === 'tools/list') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: { tools: [] }
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    if (body.method === 'resources/list') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: { resources: [] }
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    if (body.method === 'tools/call') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        error: {
          code: -32602,
          message: 'Tool not found'
        }
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    return new Response('{}', { status: 404 })
  })

  try {
    const client = new MCPClient('http://localhost:3000')
    await client.connect()

    const result = await client.callTool('nonexistent', {})

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Error')
  } finally {
    global.fetch = originalFetch
  }
})

test('MCPManager integration flow', async () => {
  const originalFetch = global.fetch

  global.fetch = mock(async (url: any, options: any) => {
    const body = JSON.parse(options.body)

    if (body.method === 'initialize') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          protocolVersion: '2025-06-18',
          serverInfo: { name: 'test', version: '1.0.0' },
          capabilities: { tools: {} }
        }
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    if (body.method === 'notifications/initialized') {
      return new Response(null, { status: 204 })
    }

    if (body.method === 'tools/list') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          tools: [
            {
              name: 'server1-tool',
              description: 'Tool from server 1',
              inputSchema: { type: 'object', properties: {} }
            }
          ]
        }
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    if (body.method === 'resources/list') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: { resources: [] }
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    if (body.method === 'tools/call') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          content: [{ type: 'text', text: 'Success' }]
        }
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    return new Response('{}', { status: 404 })
  })

  try {
    const manager = new MCPManager()

    // Add a server
    await manager.addServer('server1', 'http://localhost:3000')

    // Get all tools
    const tools = manager.getAllTools()
    expect(tools.length).toBe(1)
    expect(tools[0].server).toBe('server1')
    expect(tools[0].tool.name).toBe('server1-tool')

    // Get specific client
    const client = manager.getClient('server1')
    expect(client).toBeDefined()

    // Call tool through manager
    const result = await manager.callTool('server1-tool', {})
    expect(result.content[0].text).toBe('Success')

    // Disconnect all
    await manager.disconnectAll()
    expect(manager.getAllTools().length).toBe(0)
  } finally {
    global.fetch = originalFetch
  }
})

test('MCPManager callTool throws error for unknown tool', async () => {
  const manager = new MCPManager()

  try {
    await manager.callTool('unknown-tool', {})
    expect(true).toBe(false) // Should not reach here
  } catch (error: any) {
    expect(error.message).toContain('Tool not found')
  }
})

test('MCPClient includes auth token in requests', async () => {
  const originalFetch = global.fetch
  let capturedHeaders: any = null

  global.fetch = mock(async (url: any, options: any) => {
    capturedHeaders = options.headers
    const body = JSON.parse(options.body)

    if (body.method === 'initialize') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          protocolVersion: '2025-06-18',
          serverInfo: { name: 'test', version: '1.0.0' },
          capabilities: { tools: {} }
        }
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    if (body.method === 'notifications/initialized') {
      return new Response(null, { status: 204 })
    }

    if (body.method === 'tools/list') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: { tools: [] }
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    if (body.method === 'resources/list') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: { resources: [] }
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    return new Response('{}', { status: 404 })
  })

  try {
    const client = new MCPClient('http://localhost:3000', 'test-token-123')
    await client.connect()

    expect(capturedHeaders).toBeDefined()
    expect(capturedHeaders['Authorization']).toBe('Bearer test-token-123')
    expect(capturedHeaders['MCP-Protocol-Version']).toBe('2025-06-18')
  } finally {
    global.fetch = originalFetch
  }
})
