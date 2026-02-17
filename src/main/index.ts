import { app, BrowserWindow, ipcMain } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { WindowManager } from './window'
import { ShortcutManager } from './shortcuts'
import { TrayManager } from './tray'
import { ClipboardMonitor } from './clipboard/monitor'
import { initDatabase, getDatabase } from './database/connection'
import { createTables } from './database/schema'
import * as repository from './database/repository'

let windowManager: WindowManager
let shortcutManager: ShortcutManager
let trayManager: TrayManager
let clipboardMonitor: ClipboardMonitor

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
  const db = getDatabase()
  if (db) db.close()
})
