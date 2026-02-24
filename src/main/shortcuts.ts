import { globalShortcut, clipboard } from 'electron'
import { exec } from 'child_process'
import { WindowManager } from './window'
import { WidgetWindowManager } from './widget'
import * as repository from './database/repository'

interface QueueItem {
  id: string
  content: string
}

export class ShortcutManager {
  private windowManager: WindowManager
  private widgetManager: WidgetWindowManager | null = null
  private sequenceQueue: QueueItem[] = []
  private queueIndex = 0
  private widgetToggleShortcut = 'Alt+W'
  private widgetQuickPastePrefix = 'Alt'

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager
  }

  setWidgetManager(widgetManager: WidgetWindowManager): void {
    this.widgetManager = widgetManager
  }

  register(): void {
    globalShortcut.register('Shift+CommandOrControl+V', () => {
      this.windowManager.toggle()
    })

    this.registerSequencePaste('CommandOrControl+;')
    this.registerBatchPaste("CommandOrControl+'")
    this.registerWidgetShortcuts()
  }

  private registerWidgetShortcuts(): void {
    // Widget toggle
    try {
      globalShortcut.register(this.widgetToggleShortcut, () => {
        this.widgetManager?.toggle()
      })
    } catch {
      // ignore if shortcut registration fails
    }

    // Widget quick paste: prefix + 1~5
    for (let i = 1; i <= 5; i++) {
      const accelerator = `${this.widgetQuickPastePrefix}+${i}`
      try {
        globalShortcut.register(accelerator, () => {
          this.quickPasteByIndex(i - 1)
        })
      } catch {
        // ignore
      }
    }
  }

  private quickPasteByIndex(index: number): void {
    const items = repository.getItems({ limit: 5 })
    if (index >= items.length) return

    const item = items[index]
    clipboard.writeText(item.content)
    process.nextTick(() => repository.incrementUseCount(item.id))

    // Get frontmost app before paste
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
            exec(
              `osascript -e 'tell application "System Events" to keystroke "v" using command down'`
            )
          }
        }, 30)
      }
    )
  }

  private registerSequencePaste(accelerator: string): void {
    globalShortcut.register(accelerator, () => {
      if (this.sequenceQueue.length === 0 || this.queueIndex >= this.sequenceQueue.length) {
        this.clearQueue()
        this.notifyRenderer('queue:finished', null)
        return
      }

      const item = this.sequenceQueue[this.queueIndex]
      clipboard.writeText(item.content)
      this.queueIndex++

      this.notifyRenderer('queue:pasted', {
        index: this.queueIndex,
        total: this.sequenceQueue.length
      })

      setTimeout(() => {
        exec(
          `osascript -e 'tell application "System Events" to keystroke "v" using command down'`
        )
      }, 100)

      if (this.queueIndex >= this.sequenceQueue.length) {
        this.clearQueue()
        this.notifyRenderer('queue:finished', null)
      }
    })
  }

  private registerBatchPaste(accelerator: string): void {
    globalShortcut.register(accelerator, () => {
      if (this.sequenceQueue.length === 0) return

      const separator = this.getBatchSeparator()
      const combined = this.sequenceQueue.map((i) => i.content).join(separator)
      clipboard.writeText(combined)

      this.notifyRenderer('queue:batch-pasted', { count: this.sequenceQueue.length })

      setTimeout(() => {
        exec(
          `osascript -e 'tell application "System Events" to keystroke "v" using command down'`
        )
      }, 100)

      this.clearQueue()
      this.notifyRenderer('queue:finished', null)
    })
  }

  private batchSeparator = '\n'

  setBatchSeparator(separator: string): void {
    this.batchSeparator = separator
  }

  private getBatchSeparator(): string {
    return this.batchSeparator
  }

  addToQueue(item: QueueItem): void {
    if (this.sequenceQueue.some((q) => q.id === item.id)) return
    this.sequenceQueue.push(item)
    this.notifyRenderer('queue:updated', { count: this.sequenceQueue.length })
  }

  addMultipleToQueue(items: QueueItem[]): void {
    const existingIds = new Set(this.sequenceQueue.map((q) => q.id))
    const newItems = items.filter((i) => !existingIds.has(i.id))
    if (newItems.length === 0) return
    this.sequenceQueue.push(...newItems)
    this.notifyRenderer('queue:updated', { count: this.sequenceQueue.length })
  }

  clearQueue(): void {
    this.sequenceQueue = []
    this.queueIndex = 0
    this.notifyRenderer('queue:updated', { count: 0 })
  }

  getQueueCount(): number {
    return this.sequenceQueue.length
  }

  getQueueItems(): QueueItem[] {
    return [...this.sequenceQueue]
  }

  updateShortcuts(config: {
    panelShortcut?: string
    sequencePaste?: string
    batchPaste?: string
    widgetToggle?: string
    widgetQuickPastePrefix?: string
  }): void {
    globalShortcut.unregisterAll()

    if (config.widgetToggle) this.widgetToggleShortcut = config.widgetToggle
    if (config.widgetQuickPastePrefix) this.widgetQuickPastePrefix = config.widgetQuickPastePrefix

    globalShortcut.register(config.panelShortcut || 'Shift+CommandOrControl+V', () => {
      this.windowManager.toggle()
    })

    this.registerSequencePaste(config.sequencePaste || 'CommandOrControl+;')
    this.registerBatchPaste(config.batchPaste || "CommandOrControl+'")
    this.registerWidgetShortcuts()
  }

  private notifyRenderer(channel: string, data: unknown): void {
    const win = this.windowManager.getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, data)
    }
  }

  unregister(): void {
    globalShortcut.unregisterAll()
  }
}
