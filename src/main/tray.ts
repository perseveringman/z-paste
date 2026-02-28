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
    const icon = nativeImage.createFromBuffer(
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAApgAAAKYB3X3/OAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABJSURBVDiNY2AYBYMBMDIwMDAwMTD8Z2BgYGBkYGBghIr/Z0Dh/2dA4f9nROH/Z0Th/2f4z/CfEcr/z4jC/8+Iwv/PiMIfOgAAGhkHsXpx1CkAAAAASUVORK5CYII=',
        'base64'
      )
    )
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
