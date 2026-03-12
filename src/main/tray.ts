import { Tray, Menu, nativeImage, app, clipboard } from 'electron'
import { execSync } from 'child_process'
import { WindowManager } from './window'
import * as repository from './database/repository'

const trayLabels: Record<string, Record<string, string>> = {
  'zh-CN': { openPanel: '打开面板', launchAtLogin: '开机自启', quit: '退出', recentItems: '最近剪贴板' },
  en: { openPanel: 'Open Panel', launchAtLogin: 'Launch at Login', quit: 'Quit', recentItems: 'Recent Clipboard' },
  'zh-TW': { openPanel: '開啟面板', launchAtLogin: '開機自啟', quit: '結束', recentItems: '最近剪貼簿' }
}

export class TrayManager {
  private tray: Tray | null = null
  private windowManager: WindowManager
  private language: string = 'zh-CN'
  private quickPastePrefix: string = 'Alt'

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager
  }

  private getLabel(key: string): string {
    return trayLabels[this.language]?.[key] ?? trayLabels['zh-CN'][key]
  }

  private formatPrefixSymbol(): string {
    switch (this.quickPastePrefix) {
      case 'Alt': return '⌥'
      case 'Control': return '⌃'
      case 'CommandOrControl': return '⌘'
      default: return '⌥'
    }
  }

  private buildMenu(): void {
    if (!this.tray) return

    const recentItems = repository.getItems({ limit: 5 })
    const prefixSymbol = this.formatPrefixSymbol()

    const recentMenuItems = recentItems.map((item, index) => {
      const preview = (item.preview || item.content || '').replace(/\n/g, ' ').slice(0, 40)
      return {
        label: `${prefixSymbol}${index + 1}  ${preview}`,
        click: (): void => {
          repository.incrementUseCount(item.id)
          clipboard.writeText(item.content)
          setTimeout(() => {
            try {
              execSync(
                `osascript -e 'tell application "System Events" to keystroke "v" using command down'`
              )
            } catch {
              // ignore
            }
          }, 100)
        }
      }
    })

    const template: Electron.MenuItemConstructorOptions[] = []

    if (recentMenuItems.length > 0) {
      template.push(
        { label: this.getLabel('recentItems'), enabled: false },
        ...recentMenuItems,
        { type: 'separator' }
      )
    }

    template.push(
      {
        label: this.getLabel('openPanel'),
        accelerator: 'Shift+CommandOrControl+V',
        click: () => this.windowManager.toggle()
      },
      { type: 'separator' },
      {
        label: this.getLabel('launchAtLogin'),
        type: 'checkbox',
        checked: app.getLoginItemSettings().openAtLogin,
        click: (menuItem) => {
          app.setLoginItemSettings({ openAtLogin: menuItem.checked })
        }
      },
      { type: 'separator' },
      {
        label: this.getLabel('quit'),
        click: () => app.quit()
      }
    )

    const contextMenu = Menu.buildFromTemplate(template)
    this.tray.setContextMenu(contextMenu)
  }

  create(): void {
    const icon16 =
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAABuUlEQVQoFW1RsY6CQBBlERQ8Y6D0A4wxJmenv+B1NhI/QL/jtLHyT+xNTCxMjJ2N1xmuMFZ2pzEKx+Jyb1hQY27FgZl5M7PvDdt8bWzLjoRQGFNeT6Qoj6AQwrZttt/v8QUk+6dANqCyKIJVYDWJ1nXd87zb7fYyQ1XVfD4fci7jcDU0Bno+n0+nU8MwZCeZxsjf36DZbDqOEwRBMgEI1CwWi36/X6lUngtUxn6Ox9Fo1O120ZRzDqQm63RdKxaL6/V6Nps9kwnD0HXd4XDYbrdrtRpcLVWBgcBkMkEzy7KSOSDKWK/X2263SNXr71RA5OODglwuVy6XC4W3WBJESR8QjSKxXC6FICxIJ4JmMhn4EA0JdAIu7kOG85CoxrKqnuebpoke367r+z6E0jTtGQ0oXCLGWDabVQ3TOJ/PnY6zWq0OhwPkIzVoj8mA9E1bQ0rFPXH7arX6ORiUSqXL5YL7cDzpHy52CivVI1lxpN9oNMbjMeYmKsUp4HDVj1ZLBtlut4vjZHB773oVqUb3OPQANzQlDOgylgiCENrfcaQiqOIXkW7kASrXhK8HOQDiFSToGCjRx9PpD00YBEHjNHxYAAAAAElFTkSuQmCC'
    const icon32 =
      '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'

    const icon = nativeImage.createEmpty()
    icon.addRepresentation({
      scaleFactor: 1.0,
      buffer: Buffer.from(icon16, 'base64'),
      width: 16,
      height: 16
    })
    icon.addRepresentation({
      scaleFactor: 2.0,
      buffer: Buffer.from(icon32, 'base64'),
      width: 32,
      height: 32
    })
    icon.setTemplateImage(true)

    this.tray = new Tray(icon)
    this.tray.setToolTip('Stash')

    this.buildMenu()

    this.tray.on('click', () => {
      this.windowManager.toggle()
    })

    this.tray.on('right-click', () => {
      this.buildMenu()
    })
  }

  setLanguage(lang: string): void {
    this.language = lang
    this.buildMenu()
  }

  setQuickPastePrefix(prefix: string): void {
    this.quickPastePrefix = prefix
    this.buildMenu()
  }

  refreshMenu(): void {
    this.buildMenu()
  }
}
