import { app, BrowserWindow, ipcMain } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { WindowManager } from './window'
import { ShortcutManager } from './shortcuts'
import { TrayManager } from './tray'
import { ClipboardMonitor } from './clipboard/monitor'
import { initDatabase, getDatabase } from './database/connection'
import { createTables } from './database/schema'
import * as repository from './database/repository'
import { iCloudSync } from './sync/icloud'

let windowManager: WindowManager
let shortcutManager: ShortcutManager
let trayManager: TrayManager
let clipboardMonitor: ClipboardMonitor
let syncService: iCloudSync | null = null

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.zpaste.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  initDatabase()
  createTables()

  windowManager = new WindowManager()
  shortcutManager = new ShortcutManager(windowManager)
  trayManager = new TrayManager(windowManager)
  clipboardMonitor = new ClipboardMonitor()

  shortcutManager.register()
  trayManager.create()
  clipboardMonitor.start()

  // Auto cleanup every 10 minutes
  setInterval(() => {
    repository.autoCleanup(2000)
  }, 10 * 60 * 1000)

  // IPC handlers
  ipcMain.handle('clipboard:getItems', async (_, options) => {
    return repository.getItems(options)
  })

  ipcMain.handle('clipboard:searchItems', async (_, query) => {
    return repository.searchItems(query)
  })

  ipcMain.handle('clipboard:deleteItem', async (_, id: string) => {
    return repository.deleteItem(id)
  })

  ipcMain.handle('clipboard:toggleFavorite', async (_, id: string) => {
    return repository.toggleFavorite(id)
  })

  ipcMain.handle('clipboard:togglePin', async (_, id: string) => {
    return repository.togglePin(id)
  })

  ipcMain.handle('clipboard:pasteItem', async (_, id: string) => {
    const item = repository.getItemById(id)
    if (item) {
      const { clipboard } = await import('electron')
      clipboard.writeText(item.content)
      windowManager.hide()
      // Simulate Cmd+V after a short delay
      setTimeout(() => {
        const { execSync } = require('child_process')
        execSync(
          `osascript -e 'tell application "System Events" to keystroke "v" using command down'`
        )
      }, 100)
    }
  })

  ipcMain.handle('clipboard:clearAll', async () => {
    return repository.clearAll()
  })

  // Template IPC handlers
  ipcMain.handle('templates:getAll', async () => {
    return repository.getTemplates()
  })

  ipcMain.handle('templates:create', async (_, id: string, name: string, content: string, categoryId?: string) => {
    return repository.createTemplate(id, name, content, categoryId)
  })

  ipcMain.handle('templates:update', async (_, id: string, name: string, content: string) => {
    return repository.updateTemplate(id, name, content)
  })

  ipcMain.handle('templates:delete', async (_, id: string) => {
    return repository.deleteTemplate(id)
  })

  // Category IPC handlers
  ipcMain.handle('categories:getAll', async () => {
    return repository.getCategories()
  })

  ipcMain.handle('categories:create', async (_, id: string, name: string, color: string | null) => {
    return repository.createCategory(id, name, color)
  })

  ipcMain.handle('categories:delete', async (_, id: string) => {
    return repository.deleteCategory(id)
  })

  ipcMain.handle('clipboard:updateCategory', async (_, itemId: string, categoryId: string | null) => {
    return repository.updateItemCategory(itemId, categoryId)
  })

  // Settings IPC handlers
  // Tags IPC handlers
  ipcMain.handle('tags:list', async () => {
    return repository.listTagsWithCounts()
  })

  ipcMain.handle('tags:apply', async (_, itemId: string, slugs: string[]) => {
    return repository.applyTags(itemId, slugs)
  })

  ipcMain.handle('tags:remove', async (_, itemId: string, slug: string) => {
    return repository.removeTag(itemId, slug)
  })

  ipcMain.handle('tags:getItemSlugs', async (_, itemId: string) => {
    return repository.getItemTagSlugs(itemId)
  })

  ipcMain.handle('tags:rename', async (_, slug: string, nextName: string) => {
    return repository.renameTag(slug, nextName)
  })

  ipcMain.handle('tags:delete', async (_, slug: string) => {
    return repository.deleteTag(slug)
  })

  ipcMain.handle('tags:merge', async (_, sourceSlug: string, targetSlug: string) => {
    return repository.mergeTag(sourceSlug, targetSlug)
  })

  ipcMain.handle('tags:stats', async () => {
    return repository.getTagStats()
  })

  ipcMain.handle('tags:similar', async (_, name: string) => {
    return repository.getSimilarTags(name)
  })

  ipcMain.handle('settings:setLaunchAtLogin', async (_, enabled: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enabled })
  })

  ipcMain.handle('settings:getLaunchAtLogin', async () => {
    return app.getLoginItemSettings().openAtLogin
  })

  ipcMain.handle('sync:now', async () => {
    if (syncService) {
      syncService.syncNow()
    }
  })

  ipcMain.handle('sync:start', async () => {
    if (!syncService) {
      syncService = new iCloudSync()
    }
    syncService.start()
  })

  ipcMain.handle('sync:stop', async () => {
    if (syncService) {
      syncService.stop()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager.create()
    }
  })
})

app.on('window-all-closed', () => {
  // On macOS, keep the app running in the tray
})

app.on('will-quit', () => {
  shortcutManager.unregister()
  clipboardMonitor.stop()
  if (syncService) syncService.stop()
  const db = getDatabase()
  if (db) db.close()
})
