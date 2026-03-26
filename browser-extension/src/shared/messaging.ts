// Native messaging client for communicating with Stash desktop app
import type { NativeMessage, NativeResponse } from './types'

const NATIVE_HOST_NAME = 'com.zpaste.stash'

class NativeMessagingClient {
  private port: chrome.runtime.Port | null = null
  private requestId = 0
  private pending = new Map<
    number,
    {
      resolve: (value: unknown) => void
      reject: (reason: Error) => void
    }
  >()

  connect(): boolean {
    try {
      this.port = chrome.runtime.connectNative(NATIVE_HOST_NAME)
      this.port.onMessage.addListener((msg: NativeResponse) => {
        const pending = this.pending.get(msg.id)
        if (!pending) return
        this.pending.delete(msg.id)
        if (msg.error) {
          pending.reject(new Error(msg.error))
        } else {
          pending.resolve(msg.result)
        }
      })
      this.port.onDisconnect.addListener(() => {
        const error = chrome.runtime.lastError
        console.error('[stash] native host disconnected:', error?.message || 'unknown reason')
        this.port = null
        for (const [, pending] of this.pending) {
          pending.reject(new Error('Native host disconnected'))
        }
        this.pending.clear()
      })
      return true
    } catch {
      return false
    }
  }

  disconnect(): void {
    this.port?.disconnect()
    this.port = null
  }

  get isConnected(): boolean {
    return this.port !== null
  }

  async request<T>(method: string, params?: Record<string, unknown>): Promise<T> {
    if (!this.port) {
      throw new Error('Not connected to native host')
    }
    const id = ++this.requestId
    const message: NativeMessage = { id, method, ...(params ? { params } : {}) }
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
      })
      this.port!.postMessage(message)
    })
  }
}

export const nativeClient = new NativeMessagingClient()
