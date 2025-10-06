/**
 * AgentFile - Self-contained HTML agent format
 *
 * A portable format for packaging and sharing AI agents as single HTML files
 * with built-in security, integrity checking, and sandboxed execution.
 */

export { AgentFile } from './agent-file'
export type { AgentManifest, AgentFileOptions, MCPServerConfig } from './agent-file'

export {
  sha256,
  generateHashes,
  verifyHashes,
  checkPermission,
  validate,
  checkFeature,
  checkVersion
} from './security'

export type { Permissions } from './security'

export { MCPClient, MCPManager } from './mcp-client'
export type { MCPTool, MCPResource, MCPServerInfo, MCPCallToolResult } from './mcp-client'
