/**
 * Simple MCP Test Server
 * Implements a basic MCP server with a few example tools for testing
 */

Bun.serve({
  port: 3000,

  async fetch(req) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, MCP-Protocol-Version, Mcp-Session-Id, Authorization'
        }
      });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const body = await req.json();
    console.log('Request:', body.method);

    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    };

    // Handle initialize
    if (body.method === 'initialize') {
      return Response.json({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          protocolVersion: '2025-06-18',
          serverInfo: {
            name: 'test-mcp-server',
            version: '1.0.0'
          },
          capabilities: {
            tools: {}
          }
        }
      }, { headers });
    }

    // Handle notifications/initialized
    if (body.method === 'notifications/initialized') {
      console.log('Client initialized');
      return new Response(null, { status: 204, headers });
    }

    // Handle tools/list
    if (body.method === 'tools/list') {
      return Response.json({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          tools: [
            {
              name: 'echo',
              description: 'Echo back the input message',
              inputSchema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    description: 'The message to echo back'
                  }
                },
                required: ['message']
              }
            },
            {
              name: 'time',
              description: 'Get the current server time',
              inputSchema: {
                type: 'object',
                properties: {}
              }
            },
            {
              name: 'add',
              description: 'Add two numbers together',
              inputSchema: {
                type: 'object',
                properties: {
                  a: {
                    type: 'number',
                    description: 'First number'
                  },
                  b: {
                    type: 'number',
                    description: 'Second number'
                  }
                },
                required: ['a', 'b']
              }
            },
            {
              name: 'random',
              description: 'Generate a random number between min and max',
              inputSchema: {
                type: 'object',
                properties: {
                  min: {
                    type: 'number',
                    description: 'Minimum value (default: 0)'
                  },
                  max: {
                    type: 'number',
                    description: 'Maximum value (default: 100)'
                  }
                }
              }
            }
          ]
        }
      }, { headers });
    }

    // Handle resources/list
    if (body.method === 'resources/list') {
      return Response.json({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          resources: []
        }
      }, { headers });
    }

    // Handle tools/call
    if (body.method === 'tools/call') {
      const { name, arguments: args } = body.params;
      console.log(`Calling tool: ${name}`, args);

      if (name === 'echo') {
        return Response.json({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            content: [{
              type: 'text',
              text: args.message
            }]
          }
        }, { headers });
      }

      if (name === 'time') {
        return Response.json({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            content: [{
              type: 'text',
              text: `Current time: ${new Date().toISOString()}`
            }]
          }
        }, { headers });
      }

      if (name === 'add') {
        const result = Number(args.a) + Number(args.b);
        return Response.json({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            content: [{
              type: 'text',
              text: `${args.a} + ${args.b} = ${result}`
            }]
          }
        }, { headers });
      }

      if (name === 'random') {
        const min = args.min !== undefined ? Number(args.min) : 0;
        const max = args.max !== undefined ? Number(args.max) : 100;
        const random = Math.floor(Math.random() * (max - min + 1)) + min;
        return Response.json({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            content: [{
              type: 'text',
              text: `Random number between ${min} and ${max}: ${random}`
            }]
          }
        }, { headers });
      }

      return Response.json({
        jsonrpc: '2.0',
        id: body.id,
        error: {
          code: -32602,
          message: `Unknown tool: ${name}`
        }
      }, { headers });
    }

    // Handle unknown methods
    if (!body.id) {
      return new Response(null, { status: 204, headers });
    }

    return Response.json({
      jsonrpc: '2.0',
      id: body.id,
      error: {
        code: -32601,
        message: 'Method not found'
      }
    }, { headers });
  }
});

console.log('✓ Test MCP server running on http://localhost:3000');
console.log('');
console.log('Available tools:');
console.log('  - echo: Echo back a message');
console.log('  - time: Get current server time');
console.log('  - add: Add two numbers');
console.log('  - random: Generate random number');
console.log('');
console.log('Open examples/mcp/mcp-agent.html to test!');
