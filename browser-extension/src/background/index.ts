// Stash Browser Extension — Background Service Worker
import { nativeClient } from '../shared/messaging'
import type { VaultSecurityState } from '../shared/types'

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let cachedState: VaultSecurityState | null = null
let lastActivityTime = Date.now()
const AUTO_LOCK_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
const POLL_INTERVAL_MS = 30 * 1000 // 30 seconds
const MAX_RECONNECT_DELAY_MS = 30 * 1000
let reconnectDelay = 1000
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let autoLockTimer: ReturnType<typeof setInterval> | null = null

// ---------------------------------------------------------------------------
// Badge management
// ---------------------------------------------------------------------------
type BadgeState = 'locked' | 'unlocked' | 'disconnected'

function updateBadge(state: BadgeState): void {
  switch (state) {
    case 'locked':
      chrome.action.setBadgeText({ text: '🔒' })
      chrome.action.setBadgeBackgroundColor({ color: '#EF4444' })
      break
    case 'unlocked':
      chrome.action.setBadgeText({ text: '' })
      chrome.action.setBadgeBackgroundColor({ color: '#22C55E' })
      break
    case 'disconnected':
      chrome.action.setBadgeText({ text: '!' })
      chrome.action.setBadgeBackgroundColor({ color: '#9CA3AF' })
      break
  }
}

// ---------------------------------------------------------------------------
// Connection lifecycle
// ---------------------------------------------------------------------------
function tryConnect(): boolean {
  const ok = nativeClient.connect()
  if (ok) {
    console.log('[stash] connected to native host')
    reconnectDelay = 1000
    syncSecurityState()
    startPolling()
    startAutoLockCheck()
  } else {
    console.warn('[stash] failed to connect to native host')
    updateBadge('disconnected')
    scheduleReconnect()
  }
  return ok
}

function scheduleReconnect(): void {
  if (reconnectTimer) return
  console.log(`[stash] reconnecting in ${reconnectDelay}ms`)
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    if (!nativeClient.isConnected) {
      tryConnect()
      // Exponential backoff
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS)
    }
  }, reconnectDelay)
}

function handleDisconnect(): void {
  console.warn('[stash] native host disconnected')
  stopPolling()
  stopAutoLockCheck()
  cachedState = null
  updateBadge('disconnected')
  scheduleReconnect()
}

// ---------------------------------------------------------------------------
// Security state polling
// ---------------------------------------------------------------------------
async function syncSecurityState(): Promise<void> {
  if (!nativeClient.isConnected) return
  try {
    cachedState = await nativeClient.request<VaultSecurityState>('vault.getSecurityState')
    updateBadge(cachedState.locked ? 'locked' : 'unlocked')
  } catch (err) {
    console.error('[stash] failed to sync security state:', err)
    if (!nativeClient.isConnected) {
      handleDisconnect()
    }
  }
}

function startPolling(): void {
  stopPolling()
  pollTimer = setInterval(() => {
    if (!nativeClient.isConnected) {
      handleDisconnect()
      return
    }
    syncSecurityState()
  }, POLL_INTERVAL_MS)
}

function stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

// ---------------------------------------------------------------------------
// Auto-lock timeout
// ---------------------------------------------------------------------------
function resetActivity(): void {
  lastActivityTime = Date.now()
}

function startAutoLockCheck(): void {
  stopAutoLockCheck()
  autoLockTimer = setInterval(async () => {
    if (!nativeClient.isConnected || !cachedState || cachedState.locked) return
    if (Date.now() - lastActivityTime > AUTO_LOCK_TIMEOUT_MS) {
      console.log('[stash] auto-locking due to inactivity')
      try {
        await nativeClient.request('vault.lock')
        await syncSecurityState()
      } catch (err) {
        console.error('[stash] auto-lock failed:', err)
      }
    }
  }, 30_000)
}

function stopAutoLockCheck(): void {
  if (autoLockTimer) {
    clearInterval(autoLockTimer)
    autoLockTimer = null
  }
}

// ---------------------------------------------------------------------------
// Message handling from popup / content scripts
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener(
  (
    message: { type: string; [key: string]: unknown },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => {
    resetActivity()
    handleMessage(message)
      .then(sendResponse)
      .catch((err: Error) => sendResponse({ error: err.message }))
    // Return true to indicate async response
    return true
  }
)

async function handleMessage(message: {
  type: string
  [key: string]: unknown
}): Promise<unknown> {
  switch (message.type) {
    case 'getState':
      return {
        connected: nativeClient.isConnected,
        security: cachedState
      }

    case 'unlock': {
      const result = await nativeClient.request('vault.unlock', {
        masterPassword: message.masterPassword as string
      })
      await syncSecurityState()
      return result
    }

    case 'lock': {
      const result = await nativeClient.request('vault.lock')
      await syncSecurityState()
      return result
    }

    case 'listItems': {
      const params: Record<string, unknown> = {}
      if (message.query != null) params.query = message.query
      if (message.itemType != null) params.type = message.itemType
      if (message.limit != null) params.limit = message.limit
      return nativeClient.request('vault.listItems', params)
    }

    case 'getItemDetail':
      return nativeClient.request('vault.getItemDetail', {
        id: message.id as string
      })

    case 'searchByUrl':
      return nativeClient.request('vault.searchByUrl', {
        url: message.url as string
      })

    case 'createLogin':
      return nativeClient.request('vault.createLogin', {
        title: message.title,
        website: message.website,
        username: message.username,
        password: message.password,
        notes: message.notes,
        totpSecret: message.totpSecret,
        favorite: message.favorite,
        tags: message.tags
      })

    case 'generatePassword':
      return nativeClient.request(
        'vault.generatePassword',
        message.options ? (message.options as Record<string, unknown>) : undefined
      )

    case 'fillCredentials': {
      const tabId = message.tabId as number
      const username = message.username as string
      const password = message.password as string
      await chrome.tabs.sendMessage(tabId, {
        type: 'fill',
        username,
        password
      })
      return { success: true }
    }

    default:
      throw new Error(`Unknown message type: ${message.type}`)
  }
}

// ---------------------------------------------------------------------------
// Service worker lifecycle
// ---------------------------------------------------------------------------
chrome.runtime.onInstalled.addListener(() => {
  console.log('[stash] extension installed')
  tryConnect()
})

// onStartup fires when the browser profile starts (covers service worker restart)
chrome.runtime.onStartup.addListener(() => {
  console.log('[stash] browser started')
  tryConnect()
})

// Attempt connection immediately on script evaluation (service worker wake-up)
tryConnect()

console.log('[stash] background service worker initialized')
