import { test, expect } from 'bun:test'
import { AgentFile } from './agent-file'

test('AgentFile.create generates valid HTML', async () => {
  const html = await AgentFile.create({
    manifest: {
      id: 'test-agent',
      name: 'Test Agent',
      version: '1.0.0',
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
    code: 'class Agent { constructor(manifest) { this.manifest = manifest; } }',
    ui: 'none'
  })

  expect(html).toContain('<!DOCTYPE html>')
  expect(html).toContain('test-agent')
  expect(html).toContain('class Agent')
})

test('AgentFile.extract parses HTML correctly', () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <body>
        <script type="application/json" id="agent-manifest">
          {"id": "test", "name": "Test", "version": "1.0.0"}
        </script>
        <script type="text/plain" id="agent-code">
          class Agent {}
        </script>
      </body>
    </html>
  `

  const extracted = AgentFile.extract(html)

  expect(extracted.manifest.id).toBe('test')
  expect(extracted.code).toContain('class Agent')
})
