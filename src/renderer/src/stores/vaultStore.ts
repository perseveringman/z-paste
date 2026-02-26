import { create } from 'zustand'

export type VaultItemType = 'login' | 'secure_note'

export interface VaultItemMeta {
  id: string
  type: VaultItemType
  title: string
  website: string | null
  favorite: number
  tags: string | null
  created_at: number
  updated_at: number
  last_used_at: number | null
}

export type VaultItemDetail =
  | {
      meta: VaultItemMeta
      type: 'login'
      fields: {
        username: string
        password: string
        notes: string | null
        totpSecret: string | null
      }
    }
  | {
      meta: VaultItemMeta
      type: 'secure_note'
      fields: {
        content: string
      }
    }

export interface VaultSecurityState {
  locked: boolean
  hasVaultSetup: boolean
  autoLockMinutes: number
  lastUnlockMethod: 'master' | 'recovery' | null
}

interface VaultState {
  items: VaultItemMeta[]
  selectedId: string | null
  detail: VaultItemDetail | null
  security: VaultSecurityState
  loading: boolean
  error: string | null
  recoveryKey: string | null
  query: string

  setQuery: (query: string) => void
  refreshSecurity: () => Promise<void>
  setupMasterPassword: (masterPassword: string) => Promise<void>
  unlock: (masterPassword: string) => Promise<void>
  unlockWithRecoveryKey: (recoveryKey: string) => Promise<void>
  lock: () => Promise<void>
  loadItems: () => Promise<void>
  selectItem: (id: string) => Promise<void>
  createLogin: (input: {
    title: string
    website?: string | null
    username: string
    password: string
    notes?: string | null
    totpSecret?: string | null
  }) => Promise<void>
  createSecureNote: (input: { title: string; content: string }) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  clearError: () => void
  generatePassword: (options?: {
    length?: number
    useUppercase?: boolean
    useLowercase?: boolean
    useNumbers?: boolean
    useSymbols?: boolean
  }) => Promise<string>
  getTotpCode: (id: string) => Promise<{ code: string; remainingSeconds: number } | null>
  autoType: (id: string, submit?: boolean) => Promise<{ ok: true; fallbackCopied: boolean }>
}

const defaultSecurityState: VaultSecurityState = {
  locked: true,
  hasVaultSetup: false,
  autoLockMinutes: 10,
  lastUnlockMethod: null
}

export const useVaultStore = create<VaultState>((set, get) => ({
  items: [],
  selectedId: null,
  detail: null,
  security: defaultSecurityState,
  loading: false,
  error: null,
  recoveryKey: null,
  query: '',

  setQuery: (query) => set({ query }),

  clearError: () => set({ error: null }),

  refreshSecurity: async () => {
    try {
      const security = await window.api.vaultGetSecurityState()
      set({ security })
    } catch {
      set({ security: defaultSecurityState })
    }
  },

  setupMasterPassword: async (masterPassword) => {
    set({ loading: true, error: null })
    try {
      const result = await window.api.vaultSetupMasterPassword(masterPassword)
      await get().refreshSecurity()
      set({ recoveryKey: result.recoveryKey })
      await get().loadItems()
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Setup failed' })
    } finally {
      set({ loading: false })
    }
  },

  unlock: async (masterPassword) => {
    set({ loading: true, error: null })
    try {
      await window.api.vaultUnlock(masterPassword)
      await get().refreshSecurity()
      await get().loadItems()
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Unlock failed' })
    } finally {
      set({ loading: false })
    }
  },

  unlockWithRecoveryKey: async (recoveryKey) => {
    set({ loading: true, error: null })
    try {
      await window.api.vaultUnlockWithRecoveryKey(recoveryKey)
      await get().refreshSecurity()
      await get().loadItems()
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Recovery unlock failed' })
    } finally {
      set({ loading: false })
    }
  },

  lock: async () => {
    await window.api.vaultLock()
    await get().refreshSecurity()
    set({ items: [], selectedId: null, detail: null })
  },

  loadItems: async () => {
    const { security, query } = get()
    if (!security.hasVaultSetup || security.locked) {
      set({ items: [], selectedId: null, detail: null })
      return
    }

    const items = await window.api.vaultListItems({
      query: query || undefined,
      limit: 100
    })
    set({ items })

    const selectedId = get().selectedId
    if (selectedId && items.some((i) => i.id === selectedId)) {
      await get().selectItem(selectedId)
    } else if (items[0]) {
      await get().selectItem(items[0].id)
    } else {
      set({ selectedId: null, detail: null })
    }
  },

  selectItem: async (id) => {
    const detail = await window.api.vaultGetItemDetail(id)
    set({ selectedId: id, detail })
  },

  createLogin: async (input) => {
    set({ loading: true, error: null })
    try {
      await window.api.vaultCreateLogin(input)
      await get().loadItems()
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Create login failed' })
    } finally {
      set({ loading: false })
    }
  },

  createSecureNote: async (input) => {
    set({ loading: true, error: null })
    try {
      await window.api.vaultCreateSecureNote(input)
      await get().loadItems()
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Create note failed' })
    } finally {
      set({ loading: false })
    }
  },

  deleteItem: async (id) => {
    await window.api.vaultDeleteItem(id)
    await get().loadItems()
  },

  generatePassword: async (options) => {
    return window.api.vaultGeneratePassword(options)
  },

  getTotpCode: async (id) => {
    return window.api.vaultGetTotpCode(id)
  },

  autoType: async (id, submit) => {
    return window.api.vaultAutoType({ id, submit, stepDelayMs: 80 })
  }
}))
