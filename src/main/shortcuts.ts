import { globalShortcut, clipboard } from 'electron'
import { execSync } from 'child_process'
import { WindowManager } from './window'

interface QueueItem {
  id: string
  content: string
}

export class ShortcutManager {
  private windowManager: WindowManager
  private sequenceQueue: QueueItem[] = []
  private queueIndex = 0

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager
  }

  register(): void {
    globalShortcut.register('Shift+CommandOrControl+V', () => {
      this.windowManager.toggle()
    })

    this.registerSequencePaste('CommandOrControl+;')
    this.registerBatchPaste("CommandOrControl+'")
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
        execSync(
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
        execSync(
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
  }): void {
    globalShortcut.unregisterAll()

    globalShortcut.register(config.panelShortcut || 'Shift+CommandOrControl+V', () => {
      this.windowManager.toggle()
    })

    this.registerSequencePaste(config.sequencePaste || 'CommandOrControl+;')
    this.registerBatchPaste(config.batchPaste || "CommandOrControl+'")
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
