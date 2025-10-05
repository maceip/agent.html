/**
 * AgentFile Security Utilities
 * Minimal implementation of integrity, permissions, and validation
 */

// ============================================================================
// INTEGRITY (SHA-256)
// ============================================================================

export async function sha256(text: string): Promise<string> {
  const buffer = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function generateHashes(manifest: string, code: string) {
  return {
    manifest: `sha256-${await sha256(manifest)}`,
    code: `sha256-${await sha256(code)}`
  }
}

export async function verifyHashes(doc: Document): Promise<boolean> {
  const expectedManifest = doc.querySelector('meta[name="agent-hash-manifest"]')?.getAttribute('content')
  const expectedCode = doc.querySelector('meta[name="agent-hash-code"]')?.getAttribute('content')

  if (!expectedManifest || !expectedCode) return true // Optional

  const manifest = doc.getElementById('agent-manifest')?.textContent || ''
  const code = doc.getElementById('agent-code')?.textContent || ''

  const actualManifest = `sha256-${await sha256(manifest)}`
  const actualCode = `sha256-${await sha256(code)}`

  return expectedManifest === actualManifest && expectedCode === actualCode
}

// ============================================================================
// PERMISSIONS
// ============================================================================

export interface Permissions {
  network?: string[] // Allowed domains
  storage?: boolean
  code?: boolean
}

export function checkPermission(permissions: Permissions | undefined, action: string, target?: string): boolean {
  if (!permissions) return false

  if (action === 'fetch' && target) {
    if (!permissions.network) return false
    const url = new URL(target)
    return permissions.network.some(
      d => url.hostname === d || url.hostname.endsWith('.' + d) || d === '*'
    )
  }

  if (action === 'storage') return permissions.storage === true
  if (action === 'code') return permissions.code === true

  return false
}

// ============================================================================
// VALIDATION
// ============================================================================

export function validate(manifest: any): string[] {
  const errors: string[] = []

  if (!manifest.id) errors.push('Missing id')
  if (!manifest.name) errors.push('Missing name')
  if (!manifest.version) errors.push('Missing version')

  if (manifest.id && !/^[a-z0-9-]+$/.test(manifest.id)) {
    errors.push('Invalid id format')
  }

  if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
    errors.push('Invalid version format')
  }

  return errors
}

// ============================================================================
// VERSION CHECKING
// ============================================================================

export function checkFeature(feature: string): boolean {
  if (typeof window === 'undefined') return false

  switch (feature) {
    case 'crypto':
      return typeof crypto !== 'undefined' && !!crypto.subtle
    case 'indexeddb':
      return typeof indexedDB !== 'undefined'
    case 'fetch':
      return typeof fetch !== 'undefined'
    default:
      return false
  }
}

export function checkVersion(current: string, required: string): boolean {
  const parseVer = (v: string) => parseInt(v.match(/\d+/)?.[0] || '0')
  const currentNum = parseVer(current)

  // Parse operators: >=90, <100, etc.
  const checks = required.match(/([><=]+)(\d+)/g) || []

  return checks.every(check => {
    const match = check.match(/([><=]+)(\d+)/)
    if (!match) return true

    const [, op, ver] = match
    const verNum = parseInt(ver)

    if (op === '>=') return currentNum >= verNum
    if (op === '>') return currentNum > verNum
    if (op === '<=') return currentNum <= verNum
    if (op === '<') return currentNum < verNum
    return currentNum === verNum
  })
}
