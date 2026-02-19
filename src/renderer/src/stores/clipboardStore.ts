import { create } from 'zustand'

export interface ClipboardItem {
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

export type LeftFilter =
  | { type: 'all' }
  | { type: 'starred' }
  | { type: 'tag'; slug: string }

interface ClipboardState {
  items: ClipboardItem[]
  selectedIndex: number
  searchQuery: string
  isVisible: boolean
  filterType: string | null
  leftFilter: LeftFilter
  previewCollapsed: boolean

  loadItems: () => Promise<void>
  addItem: (item: ClipboardItem) => void
  setSelectedIndex: (index: number) => void
  setSearchQuery: (query: string) => void
  setVisible: (visible: boolean) => void
  setFilterType: (type: string | null) => void
  setLeftFilter: (filter: LeftFilter) => void
  togglePreview: () => void
  deleteItem: (id: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  togglePin: (id: string) => Promise<void>
  pasteItem: (id: string) => Promise<void>
  clearAll: () => Promise<void>
  search: (query: string) => Promise<void>
}

export const useClipboardStore = create<ClipboardState>((set, get) => ({
  items: [],
  selectedIndex: 0,
  searchQuery: '',
  isVisible: false,
  filterType: null,
  leftFilter: { type: 'all' },
  previewCollapsed: false,

  loadItems: async () => {
    const state = get()
    const items = await window.api.getItems({
      limit: 50,
      contentType: state.filterType || undefined,
      leftFilter: state.leftFilter
    })
    set({ items, selectedIndex: 0 })
  },

  addItem: (item) => {
    set((state) => ({
      items: [item, ...state.items.filter((i) => i.id !== item.id)].slice(0, 200)
    }))
  },

  setSelectedIndex: (index) => set({ selectedIndex: index }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setVisible: (visible) => {
    set({ isVisible: visible })
    if (visible) {
      set({ searchQuery: '', selectedIndex: 0 })
    }
  },

  setFilterType: (type) => {
    set({ filterType: type })
    get().loadItems()
  },

  setLeftFilter: (filter) => {
    set({ leftFilter: filter })
    get().loadItems()
  },

  togglePreview: () => set((state) => ({ previewCollapsed: !state.previewCollapsed })),

  deleteItem: async (id) => {
    await window.api.deleteItem(id)
    set((state) => ({
      items: state.items.filter((i) => i.id !== id)
    }))
  },

  toggleFavorite: async (id) => {
    await window.api.toggleFavorite(id)
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, is_favorite: i.is_favorite ? 0 : 1 } : i
      )
    }))
  },

  togglePin: async (id) => {
    await window.api.togglePin(id)
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, is_pinned: i.is_pinned ? 0 : 1 } : i))
    }))
  },

  pasteItem: async (id) => {
    await window.api.pasteItem(id)
  },

  clearAll: async () => {
    await window.api.clearAll()
    get().loadItems()
  },

  search: async (query) => {
    set({ searchQuery: query })
    if (!query.trim()) {
      get().loadItems()
      return
    }
    const items = await window.api.searchItems(query)
    set({ items, selectedIndex: 0 })
  }
}))
