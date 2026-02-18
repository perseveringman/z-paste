import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

type LeftFilter =
  | { type: 'all' }
  | { type: 'starred' }
  | { type: 'tag'; slug: string }

const api = {
  getItems: (options?: {
    limit?: number
    offset?: number
    contentType?: string
    favoritesOnly?: boolean
    leftFilter?: LeftFilter
  }) => ipcRenderer.invoke('clipboard:getItems', options),
  searchItems: (query: string) => ipcRenderer.invoke('clipboard:searchItems', query),
  deleteItem: (id: string) => ipcRenderer.invoke('clipboard:deleteItem', id),
  toggleFavorite: (id: string) => ipcRenderer.invoke('clipboard:toggleFavorite', id),
  togglePin: (id: string) => ipcRenderer.invoke('clipboard:togglePin', id),
  pasteItem: (id: string) => ipcRenderer.invoke('clipboard:pasteItem', id),
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
  }
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
