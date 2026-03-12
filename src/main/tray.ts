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
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAKElEQVR42mNgGHbgP5EYrwHEWEKRAQyD3wCKAnHoeJO26YDmgUhdAACshSfZ3yWM2wAAAABJRU5ErkJggg=='
    const icon32 =
      'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAOUlEQVR42u3WsQoAIAhF0ff/+M/WKI4RmXgvvDXO4JBE9HG255dmLQEKD5QFAACAckCGnK4/gBsCAGAmgD8h0ZMWflaL2QEMKPkAAAAASUVORK5CYII='

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
