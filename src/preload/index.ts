import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  getItems: (options?: {
    limit?: number
    offset?: number
    contentType?: string
    favoritesOnly?: boolean
  }) => ipcRenderer.invoke('clipboard:getItems', options),
  searchItems: (query: string) => ipcRenderer.invoke('clipboard:searchItems', query),
  deleteItem: (id: string) => ipcRenderer.invoke('clipboard:deleteItem', id),
  toggleFavorite: (id: string) => ipcRenderer.invoke('clipboard:toggleFavorite', id),
  togglePin: (id: string) => ipcRenderer.invoke('clipboard:togglePin', id),
  pasteItem: (id: string) => ipcRenderer.invoke('clipboard:pasteItem', id),
  clearAll: () => ipcRenderer.invoke('clipboard:clearAll'),
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
