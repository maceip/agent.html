#!/usr/bin/env bun

/**
 * agent.html CLI
 * Generate, validate, modify, and publish agent.html files
 */

import { AgentFile } from './agent-file'
import { verifyHashes, generateHashes } from './security'

const VERSION = '1.0.2'

interface GenerateOptions {
  manifest?: string
  code?: string
  output?: string
  ui?: 'full' | 'minimal' | 'none'
  styles?: string
  memory?: string
}

interface ValidateOptions {
  file: string
  verbose?: boolean
}

interface ModifyOptions {
  file: string
  code?: string
  memory?: string
  styles?: string
  output?: string
}

interface PublishOptions {
  file: string
  registry?: string
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp()
    process.exit(0)
  }

  if (args[0] === '--version' || args[0] === '-v') {
    console.log(`agent.html v${VERSION}`)
    process.exit(0)
  }

  const command = args[0]

  try {
    switch (command) {
      case 'init':
        await init()
        break
      case 'quick':
        await quick(parseArgs(args.slice(1)))
        break
      case 'generate':
      case 'gen':
        await generate(parseArgs(args.slice(1)) as GenerateOptions)
        break
      case 'validate':
      case 'val':
        await validate(parseArgs(args.slice(1)) as ValidateOptions)
        break
      case 'modify':
      case 'mod':
        await modify(parseArgs(args.slice(1)) as ModifyOptions)
        break
      case 'publish':
      case 'pub':
        await publish(parseArgs(args.slice(1)) as PublishOptions)
        break
      default:
        console.error(`Unknown command: ${command}`)
        console.error('Run `agent-html --help` for usage information')
        process.exit(1)
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

function showHelp() {
  console.log(`
agent.html v${VERSION}

USAGE:
  agent-html <command> [options]

QUICK START:
  agent-html init              Create template files in current directory
  agent-html quick             Create an agent instantly (no files needed)

COMMANDS:
  init                 Create manifest.json and agent.js templates
  quick                Create agent.html instantly with sensible defaults
  generate, gen        Generate agent.html from files
  validate, val        Validate an agent.html file
  modify, mod          Modify an existing agent.html file
  publish, pub         Publish agent.html to a registry

GENERATE OPTIONS:
  --manifest <file>    Path to manifest JSON file (required)
  --code <file>        Path to agent code file (required)
  --output <file>      Output path for generated HTML (default: agent.html)
  --ui <type>          UI type: full, minimal, none (default: full)
  --styles <file>      Path to custom styles CSS file
  --memory <file>      Path to initial memory/state JSON file

VALIDATE OPTIONS:
  <file>               Path to agent.html file to validate (required)
  --verbose            Show detailed validation information

MODIFY OPTIONS:
  <file>               Path to agent.html file to modify (required)
  --code <file>        Replace agent code
  --memory <file>      Replace memory/state
  --styles <file>      Replace styles
  --output <file>      Output path (default: overwrite input)

PUBLISH OPTIONS:
  <file>               Path to agent.html file to publish (required)
  --registry <url>     Registry URL (default: official registry)

EXAMPLES:
  # Quickest way to get started
  agent-html quick

  # Create template files to customize
  agent-html init
  # Edit manifest.json and agent.js, then:
  agent-html generate --manifest manifest.json --code agent.js

  # Validate an agent file
  agent-html validate my-agent.html

  # Update agent code
  agent-html modify my-agent.html --code new-code.js

OPTIONS:
  -h, --help           Show this help message
  -v, --version        Show version number
`)
}

function parseArgs(args: string[]): Record<string, any> {
  const parsed: Record<string, any> = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const value = args[i + 1]

      if (value && !value.startsWith('--')) {
        parsed[key] = value
        i++
      } else {
        parsed[key] = true
      }
    } else if (!parsed.file) {
      // First non-flag argument is the file
      parsed.file = arg
    }
  }

  return parsed
}

async function init() {
  console.log('Creating template files...\n')

  const manifest = {
    id: 'my-agent',
    name: 'My AI Agent',
    version: '1.0.0',
    description: 'A helpful AI assistant',
    permissions: {
      network: ['api.openai.com'],
      storage: false,
      code: false
    },
    capabilities: {
      memory: false,
      code: false
    }
  }

  const code = `class Agent {
  constructor(manifest) {
    this.manifest = manifest
    this.apiKey = null
  }

  async run(input) {
    if (!this.apiKey) {
      return {
        error: 'API key not set',
        message: 'Call agent.setApiKey("your-key") first'
      }
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${this.apiKey}\`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: input }
        ]
      })
    })

    const data = await response.json()
    return data.choices[0].message.content
  }

  setApiKey(key) {
    this.apiKey = key
  }
}`

  // Write files
  await Bun.write('manifest.json', JSON.stringify(manifest, null, 2))
  await Bun.write('agent.js', code)

  console.log('✓ Created manifest.json')
  console.log('✓ Created agent.js')
  console.log('\nNext steps:')
  console.log('  1. Edit manifest.json to customize your agent')
  console.log('  2. Edit agent.js to add your agent logic')
  console.log('  3. Run: agent-html generate --manifest manifest.json --code agent.js')
  console.log('\nOr skip to step 3 to use the default template!')
}

async function quick(options: Record<string, any>) {
  console.log('Creating agent.html...\n')

  const name = options.name || 'My AI Agent'
  const output = options.output || 'agent.html'

  const manifest = {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    version: '1.0.0',
    description: 'AI assistant powered by OpenAI',
    permissions: {
      network: ['api.openai.com'],
      storage: false,
      code: false
    },
    capabilities: {
      memory: false,
      code: false
    }
  }

  const code = `class Agent {
  constructor(manifest) {
    this.manifest = manifest
    this.apiKey = null
  }

  async run(input) {
    if (!this.apiKey) {
      return {
        error: 'API key not set',
        message: 'Set your API key: window.agent.setApiKey("sk-...")'
      }
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${this.apiKey}\`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: input }
        ]
      })
    })

    const data = await response.json()
    return data.choices[0].message.content
  }

  setApiKey(key) {
    this.apiKey = key
  }
}`

  const html = await AgentFile.create({
    manifest,
    code,
    ui: 'full'
  })

  await Bun.write(output, html)

  console.log(`✓ Created ${output}`)
  console.log('\nHow to use:')
  console.log(`  1. Open ${output} in your browser`)
  console.log('  2. Set your OpenAI API key:')
  console.log('     await window.agent.setApiKey("sk-...")')
  console.log('  3. Chat with your agent:')
  console.log('     await window.agent.run("Hello!")')
  console.log('\nYour agent is ready! 🚀')
}

async function generate(options: GenerateOptions) {
  if (!options.manifest || !options.code) {
    console.error('Error: --manifest and --code are required')
    console.error('Usage: agent-html generate --manifest <file> --code <file>')
    process.exit(1)
  }

  console.log('Generating agent.html file...')

  // Read manifest
  const manifestFile = await Bun.file(options.manifest).text()
  const manifest = JSON.parse(manifestFile)

  // Read code (trim to match how it will be extracted)
  const code = (await Bun.file(options.code).text()).trim()

  // Read optional files
  let styles: string | undefined
  if (options.styles) {
    styles = await Bun.file(options.styles).text()
  }

  let memory: string | undefined
  if (options.memory) {
    const memoryFile = await Bun.file(options.memory).text()
    memory = JSON.parse(memoryFile)
  }

  // Generate HTML
  const html = await AgentFile.create({
    manifest,
    code,
    ui: options.ui || 'full',
    styles,
    memory
  })

  // Write output
  const output = options.output || 'agent.html'
  await Bun.write(output, html)

  console.log(`✓ Agent generated: ${output}`)
  console.log(`  ID: ${manifest.id}`)
  console.log(`  Name: ${manifest.name}`)
  console.log(`  Version: ${manifest.version}`)
}

async function validate(options: ValidateOptions) {
  if (!options.file) {
    console.error('Error: file path is required')
    console.error('Usage: agent-html validate <file>')
    process.exit(1)
  }

  console.log(`Validating ${options.file}...`)

  // Read file
  const html = await Bun.file(options.file).text()

  // Extract integrity hashes from HTML meta tags
  const manifestHashMatch = html.match(/name="agent-hash-manifest"\s+content="([^"]+)"/)
  const codeHashMatch = html.match(/name="agent-hash-code"\s+content="([^"]+)"/)

  if (!manifestHashMatch || !codeHashMatch) {
    console.error('✗ Validation failed: Missing integrity hashes')
    process.exit(1)
  }

  const storedHashes = {
    manifest: manifestHashMatch[1],
    code: codeHashMatch[1]
  }

  // Extract raw manifest and code text directly from HTML
  const extractTag = (id: string): string | null => {
    const regex = new RegExp(`<[^>]*id="${id}"[^>]*>([\\s\\S]*?)</(?:script|[^>]+)>`, 'i')
    const match = html.match(regex)
    return match ? match[1].trim() : null
  }

  const manifestText = extractTag('agent-manifest')
  const codeText = extractTag('agent-code')

  if (!manifestText || !codeText) {
    console.error('✗ Validation failed: Missing manifest or code')
    process.exit(1)
  }

  // Generate hashes from raw extracted text
  const computedHashes = await generateHashes(manifestText, codeText)

  // Verify integrity
  const isValid = storedHashes.manifest === computedHashes.manifest &&
                  storedHashes.code === computedHashes.code

  // Parse manifest for display
  const components = AgentFile.extract(html)

  if (isValid) {
    console.log('✓ Validation passed')

    if (options.verbose) {
      console.log('\nManifest:')
      console.log(`  ID: ${components.manifest.id}`)
      console.log(`  Name: ${components.manifest.name}`)
      console.log(`  Version: ${components.manifest.version}`)
      console.log('\nPermissions:')
      const perms = components.manifest.permissions
      if (perms) {
        console.log(`  Network: ${perms.network?.join(', ') || 'none'}`)
        console.log(`  Storage: ${perms.storage || false}`)
        console.log(`  Code: ${perms.code || false}`)
      }
      console.log('\nIntegrity:')
      console.log(`  Manifest Hash: ${storedHashes.manifest.slice(0, 16)}...`)
      console.log(`  Code Hash: ${storedHashes.code.slice(0, 16)}...`)

      if (components.memory) {
        console.log('\nMemory: Present')
      }
    }
  } else {
    console.error('✗ Validation failed: Integrity check failed')
    console.error('The agent file may have been tampered with')
    process.exit(1)
  }
}

async function modify(options: ModifyOptions) {
  if (!options.file) {
    console.error('Error: file path is required')
    console.error('Usage: agent-html modify <file> [options]')
    process.exit(1)
  }

  console.log(`Modifying ${options.file}...`)

  // Read original file
  const html = await Bun.file(options.file).text()
  const components = AgentFile.extract(html)

  // Read new code if provided
  let code = components.code
  if (options.code) {
    code = (await Bun.file(options.code).text()).trim()
    console.log(`  Updated code from ${options.code}`)
  }

  // Read new memory if provided
  let memory = components.memory
  if (options.memory) {
    const memoryFile = await Bun.file(options.memory).text()
    memory = JSON.parse(memoryFile)
    console.log(`  Updated memory from ${options.memory}`)
  }

  // Read new styles if provided
  let styles: string | undefined
  if (options.styles) {
    styles = await Bun.file(options.styles).text()
    console.log(`  Updated styles from ${options.styles}`)
  }

  // Determine UI mode from original HTML
  let ui: 'full' | 'minimal' | 'none' = 'full'
  if (html.includes('id="agent-ui-minimal"')) {
    ui = 'minimal'
  } else if (!html.includes('id="agent-ui"')) {
    ui = 'none'
  }

  // Generate new HTML with updated components
  const newHtml = await AgentFile.create({
    manifest: components.manifest,
    code,
    memory,
    styles,
    ui
  })

  // Write output
  const output = options.output || options.file
  await Bun.write(output, newHtml)

  console.log(`✓ Agent modified: ${output}`)
}

async function publish(options: PublishOptions) {
  if (!options.file) {
    console.error('Error: file path is required')
    console.error('Usage: agent-html publish <file>')
    process.exit(1)
  }

  console.log(`Publishing ${options.file}...`)

  // Read and validate file first
  const html = await Bun.file(options.file).text()
  const components = AgentFile.extract(html)

  // Extract integrity hashes from HTML meta tags
  const manifestHashMatch = html.match(/name="agent-hash-manifest"\s+content="([^"]+)"/)
  const codeHashMatch = html.match(/name="agent-hash-code"\s+content="([^"]+)"/)

  if (!manifestHashMatch || !codeHashMatch) {
    console.error('✗ Cannot publish: Missing integrity hashes')
    process.exit(1)
  }

  const storedHashes = {
    manifest: manifestHashMatch[1],
    code: codeHashMatch[1]
  }

  // Verify integrity
  const manifestJSON = JSON.stringify(components.manifest, null, 2)
  const computedHashes = await generateHashes(manifestJSON, components.code)

  const isValid = storedHashes.manifest === computedHashes.manifest &&
                  storedHashes.code === computedHashes.code

  if (!isValid) {
    console.error('✗ Cannot publish: Agent file failed validation')
    process.exit(1)
  }

  console.log('✓ Agent validated')
  console.log(`  ID: ${components.manifest.id}`)
  console.log(`  Name: ${components.manifest.name}`)
  console.log(`  Version: ${components.manifest.version}`)

  // Stub - to be implemented
  const registry = options.registry || 'https://agents.example.com'

  console.log('\n⚠ Publishing is not yet implemented')
  console.log(`  Would publish to: ${registry}`)
  console.log(`  Agent size: ${new Blob([html]).size} bytes`)
  console.log('\nTo implement publishing:')
  console.log('  1. Set up an agent registry server')
  console.log('  2. Configure authentication')
  console.log('  3. Implement the publish API endpoint')
}

main()
