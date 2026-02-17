import { globalShortcut } from 'electron'
import { WindowManager } from './window'

export class ShortcutManager {
  private windowManager: WindowManager

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager
  }

  register(): void {
    globalShortcut.register('Shift+CommandOrControl+V', () => {
      this.windowManager.toggle()
    })
  }

  unregister(): void {
    globalShortcut.unregisterAll()
  }
}
