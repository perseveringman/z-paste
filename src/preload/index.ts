import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

type LeftFilter =
  | { type: 'all' }
  | { type: 'starred' }
  | { type: 'tag'; slug: string }

type VaultItemType = 'login' | 'secure_note'

type VaultListOptions = {
  query?: string
  type?: VaultItemType
  limit?: number
  offset?: number
}

const api = {
  getItems: (options?: {
    limit?: number
    offset?: number
    contentType?: string
    favoritesOnly?: boolean
    leftFilter?: LeftFilter
    sortBy?: 'recent' | 'usage'
  }) => ipcRenderer.invoke('clipboard:getItems', options),
  searchItems: (query: string) => ipcRenderer.invoke('clipboard:searchItems', query),
  deleteItem: (id: string) => ipcRenderer.invoke('clipboard:deleteItem', id),
  toggleFavorite: (id: string) => ipcRenderer.invoke('clipboard:toggleFavorite', id),
  togglePin: (id: string) => ipcRenderer.invoke('clipboard:togglePin', id),
  pasteItem: (id: string) => ipcRenderer.invoke('clipboard:pasteItem', id),
  updateItemTitle: (id: string, title: string | null) => ipcRenderer.invoke('clipboard:updateTitle', id, title),
  clearAll: () => ipcRenderer.invoke('clipboard:clearAll'),
  getCategories: () => ipcRenderer.invoke('categories:getAll'),
  createCategory: (id: string, name: string, color: string | null) =>
    ipcRenderer.invoke('categories:create', id, name, color),
  deleteCategory: (id: string) => ipcRenderer.invoke('categories:delete', id),
  updateItemCategory: (itemId: string, categoryId: string | null) =>
    ipcRenderer.invoke('clipboard:updateCategory', itemId, categoryId),
  getTemplates: () => ipcRenderer.invoke('templates:getAll'),
  createTemplate: (id: string, name: string, content: string, categoryId?: string) =>
    ipcRenderer.invoke('templates:create', id, name, content, categoryId),
  updateTemplate: (id: string, name: string, content: string) =>
    ipcRenderer.invoke('templates:update', id, name, content),
  deleteTemplate: (id: string) => ipcRenderer.invoke('templates:delete', id),
  setLaunchAtLogin: (enabled: boolean) => ipcRenderer.invoke('settings:setLaunchAtLogin', enabled),
  getLaunchAtLogin: () => ipcRenderer.invoke('settings:getLaunchAtLogin'),
  setLanguage: (lang: string) => ipcRenderer.invoke('settings:setLanguage', lang),
  syncNow: () => ipcRenderer.invoke('sync:now'),
  listTags: () => ipcRenderer.invoke('tags:list'),
  applyTags: (itemId: string, slugs: string[]) => ipcRenderer.invoke('tags:apply', itemId, slugs),
  removeTag: (itemId: string, slug: string) => ipcRenderer.invoke('tags:remove', itemId, slug),
  getItemTagSlugs: (itemId: string) => ipcRenderer.invoke('tags:getItemSlugs', itemId),
  renameTag: (slug: string, nextName: string) => ipcRenderer.invoke('tags:rename', slug, nextName),
  deleteTag: (slug: string) => ipcRenderer.invoke('tags:delete', slug),
  mergeTag: (sourceSlug: string, targetSlug: string) => ipcRenderer.invoke('tags:merge', sourceSlug, targetSlug),
  getTagStats: () => ipcRenderer.invoke('tags:stats'),
  getSimilarTags: (name: string) => ipcRenderer.invoke('tags:similar', name),
  // Source app
  getSourceApps: () => ipcRenderer.invoke('sourceApps:getAll'),
  getAppIcon: (bundleId: string) => ipcRenderer.invoke('sourceApps:getIcon', bundleId),
  // Sequence paste queue
  queueAdd: (item: { id: string; content: string }) => ipcRenderer.invoke('queue:add', item),
  queueAddMultiple: (items: { id: string; content: string }[]) => ipcRenderer.invoke('queue:addMultiple', items),
  queueClear: () => ipcRenderer.invoke('queue:clear'),
  queueGetCount: () => ipcRenderer.invoke('queue:getCount'),
  queueGetItems: () => ipcRenderer.invoke('queue:getItems'),
  queueSetSeparator: (separator: string) => ipcRenderer.invoke('queue:setSeparator', separator),
  updateShortcuts: (config: { panelShortcut?: string; sequencePaste?: string; batchPaste?: string; widgetToggle?: string; widgetQuickPastePrefix?: string }) =>
    ipcRenderer.invoke('shortcuts:update', config),
  onQueueUpdated: (callback: (data: { count: number }) => void) => {
    ipcRenderer.on('queue:updated', (_, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('queue:updated')
  },
  onQueuePasted: (callback: (data: { index: number; total: number }) => void) => {
    ipcRenderer.on('queue:pasted', (_, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('queue:pasted')
  },
  onQueueBatchPasted: (callback: (data: { count: number }) => void) => {
    ipcRenderer.on('queue:batch-pasted', (_, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('queue:batch-pasted')
  },
  onQueueFinished: (callback: () => void) => {
    ipcRenderer.on('queue:finished', () => callback())
    return () => ipcRenderer.removeAllListeners('queue:finished')
  },
  onNewItem: (callback: (item: unknown) => void) => {
    ipcRenderer.on('clipboard:newItem', (_, item) => callback(item))
    return () => ipcRenderer.removeAllListeners('clipboard:newItem')
  },
  onPanelShown: (callback: () => void) => {
    ipcRenderer.on('panel:shown', () => callback())
    return () => ipcRenderer.removeAllListeners('panel:shown')
  },
  onPanelHidden: (callback: () => void) => {
    ipcRenderer.on('panel:hidden', () => callback())
    return () => ipcRenderer.removeAllListeners('panel:hidden')
  },
  // Widget
  widgetSetPinned: (pinned: boolean) => ipcRenderer.invoke('widget:setPinned', pinned),
  widgetSavePosition: (x: number, y: number) => ipcRenderer.invoke('widget:savePosition', x, y),
  widgetSyncFilter: (filter: { contentType?: string; leftFilter?: unknown; sourceApp?: string; sortBy?: string }) =>
    ipcRenderer.invoke('widget:syncFilter', filter),
  widgetSetFollowFilter: (value: boolean) => ipcRenderer.invoke('widget:setFollowFilter', value),
  onWidgetShown: (callback: () => void) => {
    ipcRenderer.on('widget:shown', () => callback())
    return () => ipcRenderer.removeAllListeners('widget:shown')
  },
  onWidgetPinnedChanged: (callback: (pinned: boolean) => void) => {
    ipcRenderer.on('widget:pinnedChanged', (_, pinned) => callback(pinned))
    return () => ipcRenderer.removeAllListeners('widget:pinnedChanged')
  },
  // Vault
  vaultListItems: (options?: VaultListOptions) => ipcRenderer.invoke('vault:listItems', options),
  vaultCreateLogin: (input: {
    title: string
    website?: string | null
    username: string
    password: string
    notes?: string | null
    totpSecret?: string | null
    favorite?: boolean
    tags?: string[] | null
  }) => ipcRenderer.invoke('vault:createLogin', input),
  vaultCreateSecureNote: (input: {
    title: string
    content: string
    favorite?: boolean
    tags?: string[] | null
  }) => ipcRenderer.invoke('vault:createSecureNote', input),
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
    secureNoteFields?: { content: string }
  }) => ipcRenderer.invoke('vault:updateItem', input),
  vaultGetItemDetail: (id: string) => ipcRenderer.invoke('vault:getItemDetail', id),
  vaultDeleteItem: (id: string) => ipcRenderer.invoke('vault:delete', id),
  vaultSetupMasterPassword: (masterPassword: string) =>
    ipcRenderer.invoke('vault:setupMasterPassword', masterPassword),
  vaultUnlock: (masterPassword: string) => ipcRenderer.invoke('vault:unlock', masterPassword),
  vaultUnlockWithRecoveryKey: (recoveryKey: string) =>
    ipcRenderer.invoke('vault:unlockWithRecoveryKey', recoveryKey),
  vaultLock: () => ipcRenderer.invoke('vault:lock'),
  vaultGetSecurityState: () => ipcRenderer.invoke('vault:getSecurityState'),
  vaultGeneratePassword: (options?: {
    length?: number
    useUppercase?: boolean
    useLowercase?: boolean
    useNumbers?: boolean
    useSymbols?: boolean
  }) => ipcRenderer.invoke('vault:generatePassword', options),
  vaultGetTotpCode: (id: string) => ipcRenderer.invoke('vault:getTotpCode', id),
  vaultAutoType: (input: { id: string; submit?: boolean; stepDelayMs?: number }) =>
    ipcRenderer.invoke('vault:autoType', input)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
