import { ElectronAPI } from '@electron-toolkit/preload'

interface ClipboardItem {
  id: string
  content: string
  content_type: string
  content_hash: string
  preview: string | null
  metadata: string | null
  is_favorite: number
  is_pinned: number
  source_app: string | null
  tags: string | null
  title: string | null
  category_id: string | null
  created_at: number
  updated_at: number
  use_count: number
  tag_slugs?: string | null
}

type LeftFilter =
  | { type: 'all' }
  | { type: 'starred' }
  | { type: 'tag'; slug: string }

interface TagWithCount {
  id: string
  slug: string
  name: string
  created_at: number
  updated_at: number
  last_used_at: number | null
  count: number
}

type VaultItemType = 'login' | 'secure_note'

interface VaultItemMeta {
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

type VaultItemDetail =
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

interface VaultSecurityState {
  locked: boolean
  hasVaultSetup: boolean
  autoLockMinutes: number
  lastUnlockMethod: 'master' | 'recovery' | null
}

interface ZPasteAPI {
  getItems: (options?: {
    limit?: number
    offset?: number
    contentType?: string
    favoritesOnly?: boolean
    leftFilter?: LeftFilter
    sourceApp?: string
    sortBy?: 'recent' | 'usage'
  }) => Promise<ClipboardItem[]>
  searchItems: (query: string) => Promise<ClipboardItem[]>
  deleteItem: (id: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  togglePin: (id: string) => Promise<void>
  pasteItem: (id: string) => Promise<void>
  updateItemTitle: (id: string, title: string | null) => Promise<void>
  clearAll: () => Promise<void>
  getCategories: () => Promise<Array<{ id: string; name: string; color: string | null; sort_order: number; created_at: number }>>
  createCategory: (id: string, name: string, color: string | null) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  updateItemCategory: (itemId: string, categoryId: string | null) => Promise<void>
  getTemplates: () => Promise<Array<{ id: string; name: string; content: string; category_id: string | null; sort_order: number; created_at: number; updated_at: number }>>
  createTemplate: (id: string, name: string, content: string, categoryId?: string) => Promise<void>
  updateTemplate: (id: string, name: string, content: string) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>
  setLaunchAtLogin: (enabled: boolean) => Promise<void>
  getLaunchAtLogin: () => Promise<boolean>
  setLanguage: (lang: string) => Promise<void>
  syncNow: () => Promise<void>
  listTags: () => Promise<TagWithCount[]>
  applyTags: (itemId: string, slugs: string[]) => Promise<void>
  removeTag: (itemId: string, slug: string) => Promise<void>
  getItemTagSlugs: (itemId: string) => Promise<string[]>
  renameTag: (slug: string, nextName: string) => Promise<void>
  deleteTag: (slug: string) => Promise<void>
  mergeTag: (sourceSlug: string, targetSlug: string) => Promise<void>
  getTagStats: () => Promise<{ total: number; singleUse: number }>
  getSimilarTags: (name: string) => Promise<TagWithCount[]>
  // Source app
  getSourceApps: () => Promise<{ name: string; bundleId: string; count: number }[]>
  getAppIcon: (bundleId: string) => Promise<string | null>
  // Sequence paste queue
  queueAdd: (item: { id: string; content: string }) => Promise<number>
  queueAddMultiple: (items: { id: string; content: string }[]) => Promise<number>
  queueClear: () => Promise<void>
  queueGetCount: () => Promise<number>
  queueGetItems: () => Promise<{ id: string; content: string }[]>
  queueSetSeparator: (separator: string) => Promise<void>
  updateShortcuts: (config: { panelShortcut?: string; sequencePaste?: string; batchPaste?: string; widgetToggle?: string; widgetQuickPastePrefix?: string }) => Promise<void>
  onQueueUpdated: (callback: (data: { count: number }) => void) => () => void
  onQueuePasted: (callback: (data: { index: number; total: number }) => void) => () => void
  onQueueBatchPasted: (callback: (data: { count: number }) => void) => () => void
  onQueueFinished: (callback: () => void) => () => void
  onNewItem: (callback: (item: ClipboardItem) => void) => () => void
  onPanelShown: (callback: () => void) => () => void
  onPanelHidden: (callback: () => void) => () => void
  // Widget
  widgetSetPinned: (pinned: boolean) => Promise<void>
  widgetSavePosition: (x: number, y: number) => Promise<void>
  widgetSyncFilter: (filter: { contentType?: string; leftFilter?: unknown; sourceApp?: string; sortBy?: string }) => Promise<void>
  widgetSetFollowFilter: (value: boolean) => Promise<void>
  onWidgetShown: (callback: () => void) => () => void
  onWidgetPinnedChanged: (callback: (pinned: boolean) => void) => () => void
  // Vault
  vaultListItems: (options?: {
    query?: string
    type?: VaultItemType
    limit?: number
    offset?: number
  }) => Promise<VaultItemMeta[]>
  vaultCreateLogin: (input: {
    title: string
    website?: string | null
    username: string
    password: string
    notes?: string | null
    totpSecret?: string | null
    favorite?: boolean
    tags?: string[] | null
  }) => Promise<VaultItemMeta>
  vaultCreateSecureNote: (input: {
    title: string
    content: string
    favorite?: boolean
    tags?: string[] | null
  }) => Promise<VaultItemMeta>
  vaultUpdateItem: (input: {
    id: string
    title?: string
    website?: string | null
    favorite?: boolean
    tags?: string[] | null
    loginFields?: {
      username: string
      password: string
      notes?: string | null
      totpSecret?: string | null
    }
    secureNoteFields?: {
      content: string
    }
  }) => Promise<void>
  vaultGetItemDetail: (id: string) => Promise<VaultItemDetail | null>
  vaultDeleteItem: (id: string) => Promise<void>
  vaultSetupMasterPassword: (masterPassword: string) => Promise<{ recoveryKey: string }>
  vaultUnlock: (masterPassword: string) => Promise<{ ok: true }>
  vaultUnlockWithRecoveryKey: (recoveryKey: string) => Promise<{ ok: true }>
  vaultLock: () => Promise<{ ok: true }>
  vaultGetSecurityState: () => Promise<VaultSecurityState>
  vaultGeneratePassword: (options?: {
    length?: number
    useUppercase?: boolean
    useLowercase?: boolean
    useNumbers?: boolean
    useSymbols?: boolean
  }) => Promise<string>
  vaultGetTotpCode: (id: string) => Promise<{ code: string; remainingSeconds: number } | null>
  vaultAutoType: (input: { id: string; submit?: boolean; stepDelayMs?: number }) => Promise<{
    ok: true
    fallbackCopied: boolean
  }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: ZPasteAPI
  }
}
