/**
 * CLI tests
 */

import { test, expect, describe } from 'bun:test'
import { AgentFile } from './agent-file'
import { generateHashes } from './security'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

describe('CLI Integration', () => {
  test('generate and validate round-trip', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'agent-test-'))

    try {
      // Create test files
      const manifest = {
        id: 'test-agent',
        name: 'Test Agent',
        version: '1.0.0',
        permissions: {
          network: ['example.com'],
          storage: false,
          code: false
        }
      }

      const code = `class Agent {
  async run(input) {
    return input
  }
}`

      await Bun.write(join(tmpDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
      await Bun.write(join(tmpDir, 'agent.js'), code)

      // Generate agent
      const html = await AgentFile.create({ manifest, code })
      await Bun.write(join(tmpDir, 'agent.html'), html)

      // Validate by extracting and checking hashes
      const extracted = AgentFile.extract(html)

      expect(extracted.manifest.id).toBe('test-agent')
      expect(extracted.code).toBe(code)

      // Extract hashes from HTML
      const manifestHashMatch = html.match(/name="agent-hash-manifest"\s+content="([^"]+)"/)
      const codeHashMatch = html.match(/name="agent-hash-code"\s+content="([^"]+)"/)

      expect(manifestHashMatch).not.toBeNull()
      expect(codeHashMatch).not.toBeNull()

      // Verify hashes
      const extractTag = (id: string): string | null => {
        const regex = new RegExp(`<[^>]*id="${id}"[^>]*>([\\s\\S]*?)</(?:script|[^>]+)>`, 'i')
        const match = html.match(regex)
        return match ? match[1].trim() : null
      }

      const manifestText = extractTag('agent-manifest')
      const codeText = extractTag('agent-code')

      const computedHashes = await generateHashes(manifestText!, codeText!)

      expect(manifestHashMatch![1]).toBe(computedHashes.manifest)
      expect(codeHashMatch![1]).toBe(computedHashes.code)
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  })
})
