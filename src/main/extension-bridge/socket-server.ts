import net from 'net'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { VaultSessionManager } from '../vault/session'
import { VaultService, CreateLoginInput } from '../vault/service'
import type { VaultItemType } from '../database/vault-repository'

const LOG_PREFIX = '[extension-bridge]'

interface JsonRpcRequest {
  id: number
  method: string
  params?: Record<string, unknown>
}

interface JsonRpcResponse {
  id: number
  result?: unknown
  error?: string
}

type MethodHandler = (params: Record<string, unknown>) => Promise<unknown>

export class ExtensionSocketServer {
  private server: net.Server | null = null
  private connections = new Set<net.Socket>()
  private handlers = new Map<string, MethodHandler>()

  constructor(
    private readonly vaultSession: VaultSessionManager,
    private readonly vaultService: VaultService
  ) {
    this.registerHandlers()
  }

  private getSocketPath(): string {
    const userDataPath = app.getPath('userData')
    return path.join(userDataPath, 'zpaste-ext.sock')
  }

  private registerHandlers(): void {
    this.handlers.set('vault.getSecurityState', async () => {
      return this.vaultSession.getSecurityState()
    })

    this.handlers.set('vault.unlock', async (params) => {
      const masterPassword = params.masterPassword as string
      if (!masterPassword) throw new Error('masterPassword is required')
      await this.vaultSession.unlockWithMasterPassword(masterPassword)
      return { success: true }
    })

    this.handlers.set('vault.lock', async () => {
      await this.vaultSession.lock()
      return { success: true }
    })

    this.handlers.set('vault.listItems', async (params) => {
      return this.vaultService.listItems({
        query: params.query as string | undefined,
        type: params.type as VaultItemType | undefined,
        limit: params.limit as number | undefined,
        offset: params.offset as number | undefined
      })
    })

    this.handlers.set('vault.getItemDetail', async (params) => {
      const id = params.id as string
      if (!id) throw new Error('id is required')
      return this.vaultService.getItemDetail(id)
    })

    this.handlers.set('vault.createLogin', async (params) => {
      const input = params as unknown as CreateLoginInput
      if (!input.title || !input.username || !input.password) {
        throw new Error('title, username, and password are required')
      }
      return this.vaultService.createLogin(input)
    })

    this.handlers.set('vault.generatePassword', async (params) => {
      const password = await this.vaultService.generatePassword(
        params.options as Record<string, unknown> | undefined
      )
      return { password }
    })

    this.handlers.set('vault.searchByUrl', async (params) => {
      const url = params.url as string
      if (!url) throw new Error('url is required')
      // Extract hostname for broader matching
      let hostname: string
      try {
        hostname = new URL(url).hostname
      } catch {
        hostname = url
      }
      return this.vaultService.listItems({
        query: hostname,
        type: 'login'
      })
    })
  }

  async start(): Promise<void> {
    const socketPath = this.getSocketPath()
    console.log(`${LOG_PREFIX} Starting socket server at ${socketPath}`)

    // Clean up stale socket file
    try {
      fs.unlinkSync(socketPath)
      console.log(`${LOG_PREFIX} Removed stale socket file`)
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`${LOG_PREFIX} Failed to remove stale socket:`, err)
      }
    }

    this.server = net.createServer((socket) => this.handleConnection(socket))

    return new Promise((resolve, reject) => {
      this.server!.on('error', (err) => {
        console.error(`${LOG_PREFIX} Server error:`, err)
        reject(err)
      })

      this.server!.listen(socketPath, () => {
        // Make socket accessible only to current user
        fs.chmodSync(socketPath, 0o600)
        console.log(`${LOG_PREFIX} Server listening`)
        resolve()
      })
    })
  }

  async stop(): Promise<void> {
    console.log(`${LOG_PREFIX} Stopping socket server`)

    // Close all active connections
    for (const conn of this.connections) {
      conn.destroy()
    }
    this.connections.clear()

    return new Promise((resolve) => {
      if (!this.server) {
        resolve()
        return
      }
      this.server.close(() => {
        console.log(`${LOG_PREFIX} Server stopped`)
        // Clean up socket file
        try {
          fs.unlinkSync(this.getSocketPath())
        } catch {
          // ignore
        }
        this.server = null
        resolve()
      })
    })
  }

  private handleConnection(socket: net.Socket): void {
    this.connections.add(socket)
    console.log(`${LOG_PREFIX} Client connected (total: ${this.connections.size})`)

    let buffer: Buffer = Buffer.alloc(0)

    socket.on('data', (data: Buffer) => {
      buffer = Buffer.concat([buffer, data]) as Buffer
      this.processBuffer(buffer, socket).then((remaining) => {
        buffer = remaining
      })
    })

    socket.on('close', () => {
      this.connections.delete(socket)
      console.log(`${LOG_PREFIX} Client disconnected (total: ${this.connections.size})`)
    })

    socket.on('error', (err) => {
      console.error(`${LOG_PREFIX} Connection error:`, err)
      this.connections.delete(socket)
    })
  }

  private async processBuffer(buffer: Buffer, socket: net.Socket): Promise<Buffer> {
    // eslint-disable-next-line no-constant-condition
    while (buffer.length >= 4) {
      const messageLength = buffer.readUInt32LE(0)
      if (buffer.length < 4 + messageLength) {
        break // Wait for more data
      }

      const messageBytes = buffer.subarray(4, 4 + messageLength)
      buffer = Buffer.from(buffer.subarray(4 + messageLength))

      try {
        const request = JSON.parse(messageBytes.toString('utf-8')) as JsonRpcRequest
        const response = await this.handleRequest(request)
        this.sendResponse(socket, response)
      } catch (err) {
        console.error(`${LOG_PREFIX} Failed to parse message:`, err)
        const errorResponse: JsonRpcResponse = {
          id: 0,
          error: 'Invalid message format'
        }
        this.sendResponse(socket, errorResponse)
      }
    }

    return buffer
  }

  private async handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const { id, method, params } = request
    console.log(`${LOG_PREFIX} Request #${id}: ${method}`)

    const handler = this.handlers.get(method)
    if (!handler) {
      return { id, error: `Unknown method: ${method}` }
    }

    try {
      const result = await handler(params || {})
      return { id, result }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`${LOG_PREFIX} Error handling ${method}:`, message)
      return { id, error: message }
    }
  }

  private sendResponse(socket: net.Socket, response: JsonRpcResponse): void {
    if (socket.destroyed) return
    const json = Buffer.from(JSON.stringify(response), 'utf-8')
    const header = Buffer.alloc(4)
    header.writeUInt32LE(json.length, 0)
    socket.write(Buffer.concat([header, json]))
  }
}
