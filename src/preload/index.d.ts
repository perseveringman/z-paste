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
  category_id: string | null
  created_at: number
  updated_at: number
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

interface ZPasteAPI {
  getItems: (options?: {
    limit?: number
    offset?: number
    contentType?: string
    favoritesOnly?: boolean
    leftFilter?: LeftFilter
    sourceApp?: string
  }) => Promise<ClipboardItem[]>
  searchItems: (query: string) => Promise<ClipboardItem[]>
  deleteItem: (id: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  togglePin: (id: string) => Promise<void>
  pasteItem: (id: string) => Promise<void>
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
  updateShortcuts: (config: { panelShortcut?: string; sequencePaste?: string; batchPaste?: string }) => Promise<void>
  onQueueUpdated: (callback: (data: { count: number }) => void) => () => void
  onQueuePasted: (callback: (data: { index: number; total: number }) => void) => () => void
  onQueueBatchPasted: (callback: (data: { count: number }) => void) => () => void
  onQueueFinished: (callback: () => void) => () => void
  onNewItem: (callback: (item: ClipboardItem) => void) => () => void
  onPanelShown: (callback: () => void) => () => void
  onPanelHidden: (callback: () => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: ZPasteAPI
  }
}
