# WASI Agent → agent.html (Advanced)

Advanced example showing how to embed WebAssembly (WASM) modules in agent.html files using patterns inspired by the [wasi-document](https://github.com/197g/wasi-document) technique.

## Overview

This example demonstrates:
1. Embedding WebAssembly modules in agent.html files
2. Runtime WASM compilation and instantiation
3. High-performance computation using WASM
4. Polyglot file format techniques (HTML + WASM)

## What is WASI-Document?

The wasi-document technique by [197g](https://github.com/197g/wasi-document) creates **polyglot files** that are simultaneously valid HTML and WebAssembly modules. This allows distributing WASM applications as self-contained HTML files.

### Key Concepts

1. **Polyglot Format**: A single file that can be parsed as both HTML and WASM
2. **Multi-Stage Loading**:
   - Stage 0: HTML loader
   - Stage 1: Page setup
   - Stage 2: Module loader
   - Stage 3: Filesystem bootloader (ZIP data)
   - Stage 4: Original WASM module
3. **Platform Polyfill**: The browser becomes a sandbox for WASI applications

### Original wasi-document Tool

```bash
# Using the wasm-as-html CLI tool
wasm-as-html --index-html /my/index.html /my/app.js < /my/app.wasm > app.html
```

## Our agent.html Adaptation

Instead of using the external `wasm-as-html` tool, we embed WASM directly in the agent.html file using:
- Base64 encoding for binary data
- Runtime WebAssembly compilation
- Self-contained agent code

## Example: WASI Agent

### Basic Usage

```bash
bun run examples/advanced/wasi/wasi-agent.ts
```

Open `wasi-agent.html` in browser:

```javascript
// Get agent info
window.agent.getInfo()
// {
//   wasm_loaded: true,
//   wasm_exports: ['factorial'],
//   available_commands: ['factorial N', 'benchmark N', 'help']
// }

// Calculate factorial using WASM
await window.agent.run('factorial 10')
// { result: 3628800, operation: 'factorial', computed_by: 'WebAssembly module' }

// Run performance benchmark
await window.agent.run('benchmark 10000')
// {
//   benchmark: {
//     iterations: 10000,
//     duration_ms: '15.23',
//     ops_per_second: 656599
//   }
// }

// Get help
await window.agent.run('help')
```

## Creating Your Own WASM Agent

### Step 1: Write WASM Module

You can write WASM in several ways:

#### Option A: AssemblyScript (TypeScript-like)

```typescript
// factorial.ts
export function factorial(n: i32): i32 {
  let result: i32 = 1;
  for (let i: i32 = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}
```

Compile:
```bash
npm install -g assemblyscript
asc factorial.ts --outFile factorial.wasm --optimize
```

#### Option B: Rust

```rust
// lib.rs
#[no_mangle]
pub extern "C" fn factorial(n: i32) -> i32 {
    (1..=n).product()
}
```

Compile:
```bash
cargo build --target wasm32-unknown-unknown --release
```

#### Option C: WebAssembly Text (WAT)

```wat
(module
  (func $factorial (param $n i32) (result i32)
    (local $result i32)
    (local.set $result (i32.const 1))
    (block $break
      (loop $continue
        (br_if $break (i32.le_s (local.get $n) (i32.const 1)))
        (local.set $result (i32.mul (local.get $result) (local.get $n)))
        (local.set $n (i32.sub (local.get $n) (i32.const 1)))
        (br $continue)
      )
    )
    (local.get $result)
  )
  (export "factorial" (func $factorial))
)
```

Compile:
```bash
wat2wasm factorial.wat -o factorial.wasm
```

### Step 2: Encode WASM to Base64

```bash
# Linux/Mac
base64 < factorial.wasm

# Or in Node.js/Bun
const fs = require('fs');
const wasm = fs.readFileSync('factorial.wasm');
const base64 = wasm.toString('base64');
console.log(base64);
```

### Step 3: Create AgentFile

```typescript
import { AgentFile } from 'agent-file'

const agentCode = `
class Agent {
  constructor(manifest) {
    this.manifest = manifest;
    this.wasm = null;
  }

  async init() {
    // Your base64-encoded WASM module
    const wasmBase64 = 'AGFzbQEAAAABBwFgAX8BfwMCAQAH...';

    const wasmBinary = Uint8Array.from(
      atob(wasmBase64),
      c => c.charCodeAt(0)
    );

    const module = await WebAssembly.compile(wasmBinary);
    this.wasm = await WebAssembly.instantiate(module, {});
  }

  async run(input) {
    if (!this.wasm) await this.init();

    const result = this.wasm.exports.factorial(parseInt(input));
    return { result };
  }
}
`

const agentHTML = await AgentFile.create({
  manifest: {
    id: 'my-wasm-agent',
    name: 'My WASM Agent',
    version: '1.0.0',
    permissions: {
      network: [],
      storage: false,
      code: true  // Required for WASM
    },
    capabilities: {
      memory: false,
      code: true
    }
  },
  code: agentCode,
  ui: 'full'
})

await Bun.write('my-wasm-agent.html', agentHTML)
```

## Advanced Patterns

### 1. WASI Imports

Provide host functions to WASM:

```typescript
const imports = {
  env: {
    // Memory allocation
    memory: new WebAssembly.Memory({ initial: 1 }),

    // Host functions
    log: (ptr, len) => {
      const bytes = new Uint8Array(memory.buffer, ptr, len);
      const text = new TextDecoder().decode(bytes);
      console.log(text);
    }
  }
};

this.wasm = await WebAssembly.instantiate(module, imports);
```

### 2. Memory Management

```typescript
class Agent {
  async run(input) {
    // Allocate memory in WASM
    const ptr = this.wasm.exports.malloc(input.length);

    // Write string to WASM memory
    const memory = new Uint8Array(this.wasm.exports.memory.buffer);
    const encoder = new TextEncoder();
    const encoded = encoder.encode(input);
    memory.set(encoded, ptr);

    // Call WASM function
    const resultPtr = this.wasm.exports.process(ptr, input.length);

    // Read result from WASM memory
    const resultLen = this.wasm.exports.get_result_len();
    const result = memory.slice(resultPtr, resultPtr + resultLen);
    const decoded = new TextDecoder().decode(result);

    // Free memory
    this.wasm.exports.free(ptr);

    return { result: decoded };
  }
}
```

### 3. Streaming WASM Compilation

For large modules:

```typescript
async init() {
  const wasmBase64 = '...'; // Large module
  const wasmBinary = Uint8Array.from(atob(wasmBase64), c => c.charCodeAt(0));

  // Stream compilation for better performance
  const module = await WebAssembly.compileStreaming(
    new Response(wasmBinary, {
      headers: { 'Content-Type': 'application/wasm' }
    })
  );

  this.wasm = await WebAssembly.instantiate(module, imports);
}
```

### 4. Multi-Module Agent

Embed multiple WASM modules:

```typescript
class Agent {
  async init() {
    // Load different modules for different tasks
    const mathModule = await this.loadModule(mathWasmBase64);
    const imageModule = await this.loadModule(imageWasmBase64);

    this.modules = {
      math: mathModule.exports,
      image: imageModule.exports
    };
  }

  async run(input) {
    if (input.startsWith('math:')) {
      return this.modules.math.calculate(input.slice(5));
    } else if (input.startsWith('image:')) {
      return this.modules.image.process(input.slice(6));
    }
  }
}
```

## Real-World Use Cases

### 1. Image Processing

```typescript
// WASM module for image filters
class Agent {
  async run(imageData) {
    const result = this.wasm.exports.apply_filter(
      imageData.data.buffer,
      imageData.width,
      imageData.height
    );
    return { processedImage: result };
  }
}
```

### 2. Cryptography

```typescript
// WASM module for encryption
class Agent {
  async run({ action, data }) {
    if (action === 'encrypt') {
      return this.wasm.exports.encrypt(data);
    } else {
      return this.wasm.exports.decrypt(data);
    }
  }
}
```

### 3. Game Logic

```typescript
// WASM module for game engine
class Agent {
  async run({ command, state }) {
    const newState = this.wasm.exports.update_game_state(
      JSON.stringify(state),
      command
    );
    return { state: JSON.parse(newState) };
  }
}
```

### 4. Data Analysis

```typescript
// WASM module for statistical analysis
class Agent {
  async run(dataset) {
    const stats = this.wasm.exports.analyze(
      new Float64Array(dataset)
    );
    return {
      mean: stats.mean,
      median: stats.median,
      stddev: stats.stddev
    };
  }
}
```

## Polyglot Technique Details

### How wasi-document Works

1. **Custom WASM Sections**: The tool adds custom sections to the WASM binary that are parseable as HTML
2. **Stage0**: First section contains HTML that bootstraps the loader
3. **Stage1-4**: Progressive loading of the application
4. **ZIP Embedding**: Optional filesystem data embedded as ZIP

### Our Simplified Approach

Instead of modifying WASM binary structure, we:
1. Embed WASM as base64 in JavaScript
2. Decode and compile at runtime
3. Maintain agent.html's security model

### Future: True Polyglot agent.html Files

A future enhancement could create true polyglot agent.html files:

```typescript
// Hypothetical API
const polyglotAgent = await AgentFile.createPolyglot({
  manifest: { ... },
  code: agentCode,
  wasmModule: wasmBinary,  // Binary WASM data
  polyglotStages: {
    stage0: htmlLoader,
    stage1: pageSetup,
    stage2: moduleLoader
  }
})
```

This would create a file that is simultaneously:
- Valid HTML (opens in browser)
- Valid WASM (can be executed by WASM runtime)
- Valid agent.html file (follows our manifest spec)

## Performance Considerations

### WASM vs JavaScript

Typical performance gains:
- **Math operations**: 2-10x faster
- **Image processing**: 3-20x faster
- **Cryptography**: 5-50x faster
- **Data parsing**: 2-5x faster

### Optimization Tips

1. **Minimize string passing**: Use shared memory buffers
2. **Batch operations**: Call WASM fewer times with more data
3. **Pre-compile**: Compile WASM module once, reuse instance
4. **Use SIMD**: Modern WASM supports SIMD operations

```typescript
// Compile with SIMD support
WebAssembly.validate(wasmBinary, { simd: true })
```

## Security Considerations

### 1. Code Permission Required

```typescript
permissions: {
  code: true  // MUST be true for WASM
}
```

### 2. Sandboxing

WASM runs in a sandboxed environment:
- No direct file system access
- No network access (unless provided via imports)
- Controlled memory access

### 3. Import Validation

```typescript
// Validate imported functions
const safeImports = {
  env: {
    log: (msg) => {
      if (typeof msg === 'string' && msg.length < 1000) {
        console.log(msg);
      }
    }
  }
};
```

## Debugging

### 1. Enable WASM Debugging

```javascript
// In Chrome DevTools
// Sources → Enable "WebAssembly Debugging"
```

### 2. Add Logging

```typescript
async init() {
  console.log('Loading WASM module...');
  const module = await WebAssembly.compile(wasmBinary);
  console.log('WASM compiled successfully');
  console.log('Exports:', WebAssembly.Module.exports(module));
}
```

### 3. Validate Module

```typescript
const isValid = WebAssembly.validate(wasmBinary);
if (!isValid) {
  throw new Error('Invalid WASM module');
}
```

## Tools & Resources

### WASM Compilers
- **AssemblyScript**: TypeScript → WASM
- **Rust**: `wasm32-unknown-unknown` target
- **Emscripten**: C/C++ → WASM
- **TinyGo**: Go → WASM

### Development Tools
- **wasm-pack**: Rust WASM packaging
- **wabt**: WebAssembly Binary Toolkit (wat2wasm, wasm2wat)
- **Binaryen**: WASM optimizer

### Learning Resources
- [WebAssembly.org](https://webassembly.org/)
- [wasi-document](https://github.com/197g/wasi-document)
- [MDN WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly)

## Next Steps

1. **Try the example**: Run `bun run examples/advanced/wasi/wasi-agent.ts`
2. **Build your own**: Create a WASM module in Rust/AssemblyScript
3. **Experiment**: Try different WASM use cases
4. **Optimize**: Profile and optimize WASM performance

---

**Advanced topic!** This example shows the bleeding edge of agent.html capabilities. For most use cases, simpler examples (vanilla JS, LangChain, etc.) are recommended.
