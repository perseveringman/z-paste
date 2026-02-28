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
  lastUnlockMethod: 'master' | 'recovery' | 'biometric' | 'hint' | null
  hasBiometricUnlock: boolean
  securityMode: 'strict' | 'relaxed'
  hintQuestion: string | null
  lockOnBlur: boolean
}

interface VaultState {
  items: VaultItemMeta[]
  selectedId: string | null
  detail: VaultItemDetail | null
  security: VaultSecurityState
  securityInitialized: boolean
  loading: boolean
  error: string | null
  recoveryKey: string | null
  query: string
  filterType: 'all' | 'login' | 'secure_note'
  showFavoritesOnly: boolean

  setQuery: (query: string) => void
  setFilterType: (type: 'all' | 'login' | 'secure_note') => Promise<void>
  setShowFavoritesOnly: (v: boolean) => void
  toggleFavorite: (id: string) => Promise<void>
  refreshSecurity: () => Promise<void>
  setupMasterPassword: (input: {
    masterPassword: string
    securityMode: 'strict' | 'relaxed'
    hintQuestion?: string
    hintAnswer?: string
  }) => Promise<void>
  unlock: (masterPassword: string) => Promise<void>
  unlockWithRecoveryKey: (recoveryKey: string) => Promise<void>
  unlockWithBiometric: () => Promise<void>
  unlockWithHint: (hintAnswer: string) => Promise<void>
  resetPassword: (input: {
    newMasterPassword: string
    hintQuestion?: string
    hintAnswer?: string
  }) => Promise<void>
  lock: () => Promise<void>
  setLockOnBlur: (enabled: boolean) => Promise<void>
  setAutoLockMinutes: (minutes: number) => Promise<void>
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
  resetVault: () => Promise<void>
}

const defaultSecurityState: VaultSecurityState = {
  locked: true,
  hasVaultSetup: false,
  autoLockMinutes: 10,
  lastUnlockMethod: null,
  hasBiometricUnlock: false,
  securityMode: 'strict',
  hintQuestion: null,
  lockOnBlur: true
}

export const useVaultStore = create<VaultState>((set, get) => ({
  items: [],
  selectedId: null,
  detail: null,
  security: defaultSecurityState,
  securityInitialized: false,
  loading: false,
  error: null,
  recoveryKey: null,
  query: '',
  filterType: 'all' as 'all' | 'login' | 'secure_note',
  showFavoritesOnly: false,

  setQuery: (query) => set({ query }),

  setFilterType: async (type) => {
    set({ filterType: type })
    await get().loadItems()
  },

  setShowFavoritesOnly: (v) => set({ showFavoritesOnly: v }),

  toggleFavorite: async (id) => {
    const { detail, loadItems, selectItem } = get()
    const currentFavorite = detail?.meta.id === id ? detail.meta.favorite : 0
    await window.api.vaultUpdateItem({ id, favorite: !currentFavorite })
    await loadItems()
    await selectItem(id)
  },

  clearError: () => set({ error: null }),

  refreshSecurity: async () => {
    try {
      const security = await window.api.vaultGetSecurityState()
      set({ security, securityInitialized: true })
    } catch {
      set({ security: defaultSecurityState, securityInitialized: true })
    }
  },

  setupMasterPassword: async (input) => {
    set({ loading: true, error: null })
    try {
      const result = await window.api.vaultSetupMasterPassword(input)
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

  unlockWithBiometric: async () => {
    set({ loading: true, error: null })
    try {
      await window.api.vaultUnlockWithBiometric()
      await get().refreshSecurity()
      await get().loadItems()
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Biometric unlock failed' })
    } finally {
      set({ loading: false })
    }
  },

  unlockWithHint: async (hintAnswer) => {
    set({ loading: true, error: null })
    try {
      await window.api.vaultUnlockWithHint(hintAnswer)
      await get().refreshSecurity()
      await get().loadItems()
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Hint unlock failed' })
    } finally {
      set({ loading: false })
    }
  },

  resetPassword: async (input) => {
    set({ loading: true, error: null })
    try {
      const result = await window.api.vaultResetPassword(input)
      set({ recoveryKey: result.recoveryKey })
      await get().refreshSecurity()
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Password reset failed' })
    } finally {
      set({ loading: false })
    }
  },

  lock: async () => {
    await window.api.vaultLock()
    await get().refreshSecurity()
    set({ items: [], selectedId: null, detail: null })
  },

  setLockOnBlur: async (enabled) => {
    await window.api.vaultSetLockOnBlur(enabled)
    await get().refreshSecurity()
  },

  setAutoLockMinutes: async (minutes) => {
    await window.api.vaultSetAutoLockMinutes(minutes)
    await get().refreshSecurity()
  },

  loadItems: async () => {
    const { security, query, filterType } = get()
    if (!security.hasVaultSetup || security.locked) {
      set({ items: [], selectedId: null, detail: null })
      return
    }

    const items = await window.api.vaultListItems({
      query: query || undefined,
      type: filterType !== 'all' ? filterType : undefined,
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
  },

  resetVault: async () => {
    set({ loading: true, error: null })
    try {
      await window.api.vaultResetVault()
      set({ items: [], selectedId: null, detail: null, recoveryKey: null })
      await get().refreshSecurity()
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Reset vault failed' })
    } finally {
      set({ loading: false })
    }
  }
}))
