import { VaultSessionManager } from '../vault/session'
import { VaultService } from '../vault/service'
import { ExtensionSocketServer } from './socket-server'

let server: ExtensionSocketServer | null = null

export async function startExtensionBridge(
  vaultSession: VaultSessionManager,
  vaultService: VaultService
): Promise<void> {
  if (server) {
    console.log('[extension-bridge] Already running, skipping start')
    return
  }

  server = new ExtensionSocketServer(vaultSession, vaultService)
  try {
    await server.start()
  } catch (err) {
    console.error('[extension-bridge] Failed to start:', err)
    server = null
  }
}

export async function stopExtensionBridge(): Promise<void> {
  if (!server) return
  try {
    await server.stop()
  } catch (err) {
    console.error('[extension-bridge] Failed to stop:', err)
  }
  server = null
}
