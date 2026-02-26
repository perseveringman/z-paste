import { app, BrowserWindow, ipcMain, clipboard } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { WindowManager } from './window'
import { WidgetWindowManager } from './widget'
import { ShortcutManager } from './shortcuts'
import { TrayManager } from './tray'
import { ClipboardMonitor } from './clipboard/monitor'
import { initDatabase, getDatabase } from './database/connection'
import { createTables } from './database/schema'
import * as repository from './database/repository'
import { iCloudSync } from './sync/icloud'
import { getAppIcon } from './clipboard/app-icon'
import { exec } from 'child_process'
import * as vaultRepository from './database/vault-repository'
import { VaultSessionManager } from './vault/session'
import { VaultService } from './vault/service'
import { AutoTypeAgent } from './vault/auto-type'

let windowManager: WindowManager
let widgetManager: WidgetWindowManager
let shortcutManager: ShortcutManager
let trayManager: TrayManager
let clipboardMonitor: ClipboardMonitor
let syncService: iCloudSync | null = null
let vaultSession: VaultSessionManager
let vaultService: VaultService
let autoTypeAgent: AutoTypeAgent

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.zpaste.app')

  // Hide dock icon — only show in menu bar tray
  if (app.dock) app.dock.hide()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  initDatabase()
  createTables()

  windowManager = new WindowManager()
  widgetManager = new WidgetWindowManager()
  shortcutManager = new ShortcutManager(windowManager)
  shortcutManager.setWidgetManager(widgetManager)
  trayManager = new TrayManager(windowManager)
  clipboardMonitor = new ClipboardMonitor()
  vaultSession = new VaultSessionManager()
  vaultService = new VaultService(vaultSession)
  autoTypeAgent = new AutoTypeAgent()

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
    if (!item) return

    clipboard.writeText(item.content)
    const previousApp = windowManager.getPreviousAppBundleId()
    windowManager.hide()

    // Defer use count update — not on the critical paste path
    process.nextTick(() => repository.incrementUseCount(id))

    // Reactivate previous app then simulate Cmd+V
    setTimeout(() => {
      if (previousApp) {
        exec(
          `osascript -e 'tell application id "${previousApp}" to activate'`,
          () => {
            setTimeout(() => {
              exec(
                `osascript -e 'tell application "System Events" to keystroke "v" using command down'`
              )
            }, 20)
          }
        )
      } else {
        setTimeout(() => {
          exec(
            `osascript -e 'tell application "System Events" to keystroke "v" using command down'`
          )
        }, 20)
      }
    }, 30)
  })

  ipcMain.handle('clipboard:updateTitle', async (_, id: string, title: string | null) => {
    return repository.updateItemTitle(id, title)
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

  ipcMain.handle('settings:setLanguage', async (_, lang: string) => {
    trayManager.setLanguage(lang)
  })

  ipcMain.handle('sync:now', async () => {
    if (syncService) {
      syncService.syncNow()
    }
  })

  // Vault IPC handlers (encrypted data only, no plaintext decryption in this layer)
  ipcMain.handle('vault:list', async (_, options) => {
    return vaultRepository.listVaultItems(options)
  })

  ipcMain.handle('vault:get', async (_, id: string) => {
    const meta = vaultRepository.getVaultItemMetaById(id)
    if (!meta) return null
    const secret = vaultRepository.getVaultItemSecretById(id)
    if (!secret) return null
    return { meta, secret }
  })

  ipcMain.handle('vault:delete', async (_, id: string) => {
    vaultRepository.deleteVaultItem(id)
  })

  ipcMain.handle('vault:setupMasterPassword', async (_, masterPassword: string) => {
    return vaultSession.setupMasterPassword(masterPassword)
  })

  ipcMain.handle('vault:unlock', async (_, masterPassword: string) => {
    vaultSession.unlockWithMasterPassword(masterPassword)
    return { ok: true }
  })

  ipcMain.handle('vault:unlockWithRecoveryKey', async (_, recoveryKey: string) => {
    vaultSession.unlockWithRecoveryKey(recoveryKey)
    return { ok: true }
  })

  ipcMain.handle('vault:lock', async () => {
    vaultSession.lock()
    return { ok: true }
  })

  ipcMain.handle('vault:getSecurityState', async () => {
    return vaultSession.getSecurityState()
  })

  ipcMain.handle('vault:listItems', async (_, options) => {
    return vaultService.listItems(options)
  })

  ipcMain.handle('vault:createLogin', async (_, input) => {
    return vaultService.createLogin(input)
  })

  ipcMain.handle('vault:createSecureNote', async (_, input) => {
    return vaultService.createSecureNote(input)
  })

  ipcMain.handle('vault:updateItem', async (_, input) => {
    vaultService.updateItem(input)
  })

  ipcMain.handle('vault:getItemDetail', async (_, id: string) => {
    return vaultService.getItemDetail(id)
  })

  ipcMain.handle('vault:generatePassword', async (_, options) => {
    return vaultService.generatePassword(options)
  })

  ipcMain.handle('vault:getTotpCode', async (_, id: string) => {
    return vaultService.getTotpCode(id)
  })

  ipcMain.handle('vault:autoType', async (_, input: { id: string; submit?: boolean; stepDelayMs?: number }) => {
    const detail = vaultService.getItemDetail(input.id)
    if (!detail || detail.type !== 'login') {
      throw new Error('Vault login item not found')
    }

    const previousApp = windowManager.getPreviousAppBundleId()
    windowManager.hide()
    try {
      await autoTypeAgent.run(previousApp, {
        username: detail.fields.username,
        password: detail.fields.password,
        submit: input.submit,
        stepDelayMs: input.stepDelayMs
      })
      return { ok: true, fallbackCopied: false }
    } catch {
      clipboard.writeText(detail.fields.password)
      return { ok: true, fallbackCopied: true }
    }
  })

  // Source app IPC handlers
  ipcMain.handle('sourceApps:getAll', async () => {
    return repository.getSourceApps()
  })

  ipcMain.handle('sourceApps:getIcon', async (_, bundleId: string) => {
    return getAppIcon(bundleId)
  })

  // Sequence paste IPC handlers
  ipcMain.handle('queue:add', async (_, item: { id: string; content: string }) => {
    shortcutManager.addToQueue(item)
    return shortcutManager.getQueueCount()
  })

  ipcMain.handle('queue:addMultiple', async (_, items: { id: string; content: string }[]) => {
    shortcutManager.addMultipleToQueue(items)
    return shortcutManager.getQueueCount()
  })

  ipcMain.handle('queue:clear', async () => {
    shortcutManager.clearQueue()
  })

  ipcMain.handle('queue:getCount', async () => {
    return shortcutManager.getQueueCount()
  })

  ipcMain.handle('queue:getItems', async () => {
    return shortcutManager.getQueueItems()
  })

  ipcMain.handle('shortcuts:update', async (_, config: {
    panelShortcut?: string
    sequencePaste?: string
    batchPaste?: string
    widgetToggle?: string
    widgetQuickPastePrefix?: string
  }) => {
    shortcutManager.updateShortcuts(config)
    if (config.widgetQuickPastePrefix) {
      trayManager.setQuickPastePrefix(config.widgetQuickPastePrefix)
    }
  })

  // Widget state
  let widgetFollowFilter = false
  let currentPanelFilter: {
    contentType?: string
    leftFilter?: { type: string; slug?: string }
    sourceApp?: string
    sortBy?: string
  } = {}

  ipcMain.handle('widget:syncFilter', async (_, filter) => {
    currentPanelFilter = filter
    // Notify widget to refresh
    const widgetWin = widgetManager.getWindow()
    if (widgetWin && !widgetWin.isDestroyed()) {
      widgetWin.webContents.send('widget:filterChanged')
    }
  })

  ipcMain.handle('widget:setFollowFilter', async (_, value: boolean) => {
    widgetFollowFilter = value
    // Notify widget to refresh
    const widgetWin = widgetManager.getWindow()
    if (widgetWin && !widgetWin.isDestroyed()) {
      widgetWin.webContents.send('widget:filterChanged')
    }
  })

  ipcMain.handle('widget:getItems', async () => {
    if (widgetFollowFilter) {
      return repository.getItems({
        limit: 5,
        contentType: currentPanelFilter.contentType || undefined,
        leftFilter: currentPanelFilter.leftFilter as repository.LeftFilter | undefined,
        sourceApp: currentPanelFilter.sourceApp || undefined,
        sortBy: (currentPanelFilter.sortBy as 'recent' | 'usage') || 'recent'
      })
    }
    return repository.getItems({ limit: 5 })
  })

  // Widget IPC handlers
  ipcMain.handle('widget:setPinned', async (_, pinned: boolean) => {
    widgetManager.setPinned(pinned)
  })

  ipcMain.handle('widget:savePosition', async (_, x: number, y: number) => {
    widgetManager.savePosition(x, y)
  })

  ipcMain.handle('widget:toggle', async () => {
    widgetManager.toggle()
  })

  ipcMain.handle('widget:pasteItem', async (_, id: string) => {
    const item = repository.getItemById(id)
    if (!item) return

    clipboard.writeText(item.content)

    // Hide widget if not pinned
    if (!widgetManager.getPinned()) {
      widgetManager.hide()
    }

    // Defer use count update
    process.nextTick(() => repository.incrementUseCount(id))

    // Get frontmost app and simulate paste
    exec(
      `osascript -e 'tell application "System Events" to get bundle identifier of first application process whose frontmost is true'`,
      (err, stdout) => {
        const previousApp = err ? null : stdout.trim()
        setTimeout(() => {
          if (previousApp) {
            exec(
              `osascript -e 'tell application id "${previousApp}" to activate'`,
              () => {
                setTimeout(() => {
                  exec(
                    `osascript -e 'tell application "System Events" to keystroke "v" using command down'`
                  )
                }, 20)
              }
            )
          } else {
            setTimeout(() => {
              exec(
                `osascript -e 'tell application "System Events" to keystroke "v" using command down'`
              )
            }, 20)
          }
        }, 30)
      }
    )
  })

  ipcMain.handle('queue:setSeparator', async (_, separator: string) => {
    shortcutManager.setBatchSeparator(separator)
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
