/**
 * WASI Agent → agent.html
 *
 * Advanced example showing how to embed WebAssembly modules in agent.html files
 * using patterns inspired by the wasi-document technique (github.com/197g/wasi-document)
 *
 * This demonstrates embedding WASM for computationally intensive tasks
 * while maintaining the portable agent.html format.
 */

import { AgentFile } from '../../../src/index'

async function createWasiAgentFile() {
  console.log('Creating WASI-powered agent...')

  // Note: In a real implementation, you would compile a Rust/C/AssemblyScript
  // program to WASM and embed it here. For this example, we'll use the
  // WebAssembly Text format (WAT) to create a simple math module.

  const agentCode = `
class Agent {
  constructor(manifest) {
    this.manifest = manifest;
    this.wasmModule = null;
    this.wasmInstance = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      // Embedded WASM module (base64 encoded)
      // This is a simple module that exports a factorial function
      const wasmBase64 = 'AGFzbQEAAAABBwFgAX8BfwMCAQAHCgEGZmFjdG9yaWFsAAAKHgEcAEEBIQEDQCABIABsIQEgAEF/aiIADQALIAELAAoEbmFtZQICAQA=';

      // Decode base64 to bytes
      const wasmBinary = Uint8Array.from(atob(wasmBase64), c => c.charCodeAt(0));

      // Compile and instantiate WASM module
      const wasmModule = await WebAssembly.compile(wasmBinary);
      this.wasmInstance = await WebAssembly.instantiate(wasmModule, {});

      console.log('WASM module loaded successfully');
      this.initialized = true;
    } catch (error) {
      console.error('Failed to load WASM module:', error);
      throw error;
    }
  }

  async run(input) {
    await this.init();

    try {
      // Parse input for commands
      const command = this.parseCommand(input);

      if (command.type === 'factorial') {
        const result = this.wasmInstance.exports.factorial(command.value);
        return {
          result,
          input: command.value,
          operation: 'factorial',
          computed_by: 'WebAssembly module'
        };
      } else if (command.type === 'help') {
        return {
          help: {
            'factorial N': 'Calculate factorial of N using WASM (e.g., "factorial 5")',
            'benchmark N': 'Run factorial benchmark for N iterations',
            'help': 'Show this help message'
          }
        };
      } else if (command.type === 'benchmark') {
        return await this.runBenchmark(command.value || 1000);
      } else {
        return {
          error: 'Unknown command. Try "help" to see available commands.'
        };
      }
    } catch (error) {
      return {
        error: 'Execution failed: ' + error.message
      };
    }
  }

  parseCommand(input) {
    const trimmed = input.trim().toLowerCase();

    if (trimmed === 'help') {
      return { type: 'help' };
    }

    const factorialMatch = trimmed.match(/^factorial\\s+(\\d+)$/);
    if (factorialMatch) {
      return {
        type: 'factorial',
        value: parseInt(factorialMatch[1], 10)
      };
    }

    const benchmarkMatch = trimmed.match(/^benchmark\\s+(\\d+)$/);
    if (benchmarkMatch) {
      return {
        type: 'benchmark',
        value: parseInt(benchmarkMatch[1], 10)
      };
    }

    return { type: 'unknown' };
  }

  async runBenchmark(iterations) {
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      this.wasmInstance.exports.factorial(10);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    return {
      benchmark: {
        iterations,
        duration_ms: duration.toFixed(2),
        ops_per_second: Math.round(iterations / (duration / 1000)),
        operation: 'factorial(10)'
      },
      computed_by: 'WebAssembly module'
    };
  }

  getInfo() {
    return {
      manifest: this.manifest,
      wasm_loaded: this.initialized,
      wasm_exports: this.initialized ? Object.keys(this.wasmInstance.exports) : [],
      available_commands: ['factorial N', 'benchmark N', 'help']
    };
  }

  getManifest() {
    return this.manifest;
  }
}
  `.trim()

  // Create AgentFile with WASM capabilities
  const agentHTML = await AgentFile.create({
    manifest: {
      id: 'wasi-agent',
      name: 'WASI Agent',
      version: '1.0.0',
      description: 'An agent that embeds WebAssembly for high-performance computations',

      permissions: {
        network: [],  // No network needed for pure WASM computation
        storage: false,
        code: true  // Required for WASM instantiation
      },

      capabilities: {
        memory: false,
        code: true  // WASM execution
      }
    },

    code: agentCode,
    ui: 'full'
  })

  // Save to file
  await Bun.write('examples/advanced/wasi/wasi-agent.html', agentHTML)

  console.log('\nCreated wasi-agent.html')
  console.log('  Embedded: WebAssembly factorial module')
  console.log('  Pattern: WASI-document inspired embedding')
  console.log('\nFeatures:')
  console.log('  - Base64-encoded WASM module')
  console.log('  - Runtime WASM compilation and instantiation')
  console.log('  - High-performance computation')
  console.log('\nUsage:')
  console.log('  window.agent.run("factorial 10")')
  console.log('  window.agent.run("benchmark 10000")')
  console.log('  window.agent.getInfo()')
}

createWasiAgentFile().catch(console.error)
