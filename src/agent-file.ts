/**
 * AgentFile - Self-contained HTML agent format
 * Single unified implementation with built-in security
 */

import { generateHashes } from './security'
import { generateMCPClientCode } from './mcp-client-inline'

export interface MCPServerConfig {
  name: string
  url: string
  description?: string
  auth?: {
    type: 'none' | 'bearer' | 'oauth'
    token?: string
  }
}

export interface AgentManifest {
  id: string
  name: string
  version: string
  description?: string
  author?: string

  // Security
  permissions?: {
    network?: string[]
    storage?: boolean
    code?: boolean
  }

  // Capabilities
  capabilities?: {
    memory?: boolean
    code?: boolean
    browser?: boolean
  }

  // MCP Integration
  mcp?: {
    servers?: MCPServerConfig[]
  }
}

export interface AgentFileOptions {
  manifest: AgentManifest
  code: string
  memory?: string
  styles?: string
  ui?: 'minimal' | 'full' | 'none'
}

export class AgentFile {
  static async create(options: AgentFileOptions): Promise<string> {
    const { manifest, code, memory = '', styles = '', ui = 'minimal' } = options

    // Generate integrity hashes
    const hashes = await generateHashes(JSON.stringify(manifest, null, 2), code)

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${manifest.name}</title>

  <!-- Agent metadata -->
  <meta name="agent-id" content="${manifest.id}">
  <meta name="agent-version" content="${manifest.version}">

  <!-- Integrity hashes -->
  <meta name="agent-hash-manifest" content="${hashes.manifest}">
  <meta name="agent-hash-code" content="${hashes.code}">

  <!-- Security policy -->
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.esm.sh; connect-src 'self' https:; style-src 'self' 'unsafe-inline';">

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .agent-container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
      max-width: 600px;
      width: 100%;
      overflow: hidden;
    }

    .agent-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 24px;
    }

    .agent-title {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .agent-meta {
      opacity: 0.9;
      font-size: 14px;
    }

    .agent-status {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4ade80;
    }

    .agent-body {
      padding: 24px;
    }

    .agent-input {
      display: flex;
      gap: 8px;
    }

    .agent-input input {
      flex: 1;
      padding: 12px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 14px;
    }

    .agent-input button {
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
    }

    .agent-input button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    ${styles}
  </style>
</head>
<body>
  <div class="agent-container">
    <div class="agent-header">
      <div class="agent-title">${manifest.name}</div>
      <div class="agent-meta">${manifest.description || `v${manifest.version}`}</div>
      <div class="agent-status">
        <div class="status-dot"></div>
        <span id="status">Loading...</span>
      </div>
    </div>

    <div class="agent-body">
      ${
        ui === 'full'
          ? `
      <div class="agent-input">
        <input id="input" placeholder="Enter message..." disabled>
        <button id="send" disabled>Send</button>
      </div>
      `
          : ui === 'minimal'
            ? `<button id="start" disabled>Start</button>`
            : ''
      }
    </div>
  </div>

  <!-- Agent data -->
  <script type="application/json" id="agent-manifest">${JSON.stringify(manifest, null, 2)}</script>
  <script id="agent-code">${code}</script>
  <script type="application/json" id="agent-memory">"${memory}"</script>

  <!-- Security utilities (inline) -->
  <script type="module">
    // SHA-256 verification
    async function sha256(text) {
      const buffer = new TextEncoder().encode(text);
      const hash = await crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }

    async function verify() {
      const expectedManifest = document.querySelector('meta[name="agent-hash-manifest"]').content;
      const expectedCode = document.querySelector('meta[name="agent-hash-code"]').content;

      const manifest = document.getElementById('agent-manifest').textContent;
      const code = document.getElementById('agent-code').textContent;

      const actualManifest = 'sha256-' + await sha256(manifest);
      const actualCode = 'sha256-' + await sha256(code);

      if (expectedManifest !== actualManifest || expectedCode !== actualCode) {
        throw new Error('Integrity check failed');
      }
    }

    // Permission checking
    function checkPermission(action, target) {
      const permissions = ${JSON.stringify(manifest.permissions || {})};
      const mcpServers = ${JSON.stringify(manifest.mcp?.servers || [])};

      if (action === 'fetch' && target) {
        if (!permissions.network) return false;
        const url = new URL(target);

        // Check if URL matches allowed network permissions
        const isAllowed = permissions.network.some(d =>
          url.hostname === d || url.hostname.endsWith('.' + d) || d === '*'
        );

        // Also allow MCP server URLs
        const isMCPServer = mcpServers.some(server => {
          try {
            const serverUrl = new URL(server.url);
            return serverUrl.hostname === url.hostname;
          } catch {
            return false;
          }
        });

        return isAllowed || isMCPServer;
      }

      if (action === 'storage') return permissions.storage === true;
      if (action === 'code') return permissions.code === true;

      return false;
    }

    // Secure fetch wrapper
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
      if (!checkPermission('fetch', url)) {
        throw new Error('Permission denied: ' + url);
      }
      return originalFetch(url, options);
    };

    // Bootstrap
    (async () => {
      const statusEl = document.getElementById('status');

      try {
        // Verify integrity
        statusEl.textContent = 'Verifying...';
        await verify();

        // Load agent
        statusEl.textContent = 'Loading...';
        const manifest = JSON.parse(document.getElementById('agent-manifest').textContent);
        const code = document.getElementById('agent-code').textContent;

        // Execute in sandbox
        const sandbox = document.createElement('iframe');
        sandbox.style.display = 'none';
        sandbox.sandbox = 'allow-scripts allow-same-origin';

        sandbox.srcdoc = \`<!DOCTYPE html>
          <html>
          <body>
            <script>
              ${manifest.mcp?.servers ? generateMCPClientCode() : ''}

              \${code}

              ${
                manifest.mcp?.servers
                  ? `
              // Initialize MCP Manager
              const mcpManager = new MCPManager();
              let mcpInitialized = false;

              async function initializeMCP() {
                const mcpServers = ${JSON.stringify(manifest.mcp.servers)};
                for (const server of mcpServers) {
                  try {
                    await mcpManager.addServer(
                      server.name,
                      server.url,
                      server.auth?.token
                    );
                  } catch (error) {
                    console.error('Failed to connect to MCP server ' + server.name + ':', error);
                  }
                }
                mcpInitialized = true;
              }
              `
                  : ''
              }

              window.addEventListener('message', async (e) => {
                if (e.data.method === 'run' && window.Agent) {
                  try {
                    ${manifest.mcp?.servers ? 'if (!mcpInitialized) await initializeMCP();' : ''}
                    const agent = new Agent(\${JSON.stringify(manifest)});
                    ${manifest.mcp?.servers ? 'agent.mcp = mcpManager;' : ''}
                    const result = await agent.run(e.data.input);
                    e.source.postMessage({ id: e.data.id, result }, '*');
                  } catch (error) {
                    e.source.postMessage({ id: e.data.id, error: error.message }, '*');
                  }
                }
              });

              window.parent.postMessage({ ready: true }, '*');
            </script>
          </body>
          </html>\`;

        document.body.appendChild(sandbox);

        await new Promise(resolve => {
          window.addEventListener('message', function handler(e) {
            if (e.data.ready) {
              window.removeEventListener('message', handler);
              resolve();
            }
          });
        });

        statusEl.textContent = 'Ready';

        // Setup UI
        ${
          ui === 'full'
            ? `
        const input = document.getElementById('input');
        const send = document.getElementById('send');

        input.disabled = false;
        send.disabled = false;

        send.onclick = async () => {
          const value = input.value;
          input.value = '';
          input.disabled = true;
          send.disabled = true;

          const id = Math.random().toString(36);
          const promise = new Promise(resolve => {
            window.addEventListener('message', function handler(e) {
              if (e.data.id === id) {
                window.removeEventListener('message', handler);
                resolve(e.data.result || e.data.error);
              }
            });
          });

          sandbox.contentWindow.postMessage({ method: 'run', id, input: value }, '*');

          const result = await promise;
          console.log('Result:', result);

          input.disabled = false;
          send.disabled = false;
          input.focus();
        };
        `
            : ui === 'minimal'
              ? `
        const start = document.getElementById('start');
        start.disabled = false;
        start.onclick = () => {
          sandbox.contentWindow.postMessage({ method: 'run', id: '1', input: '' }, '*');
        };
        `
              : ''
        }

        // Make agent available globally
        window.agent = { manifest, sandbox };
        window.dispatchEvent(new CustomEvent('agent-ready', { detail: { manifest } }));

      } catch (error) {
        statusEl.textContent = 'Error: ' + error.message;
        console.error(error);
      }
    })();
  </script>
</body>
</html>`
  }

  /**
   * Extract agent from HTML
   */
  static extract(html: string): {
    manifest: AgentManifest
    code: string
    memory?: string
  } {
    // Use regex extraction for Node/Bun environments
    const extractTag = (id: string): string | null => {
      const regex = new RegExp(`<[^>]*id="${id}"[^>]*>([\\s\\S]*?)</(?:script|[^>]+)>`, 'i')
      const match = html.match(regex)
      return match ? match[1].trim() : null
    }

    const manifestText = extractTag('agent-manifest')
    const codeText = extractTag('agent-code')
    const memoryText = extractTag('agent-memory')

    if (!manifestText || !codeText) {
      throw new Error('Invalid agent file')
    }

    return {
      manifest: JSON.parse(manifestText),
      code: codeText,
      memory: memoryText ? memoryText.replace(/^"|"$/g, '') : undefined
    }
  }
}
