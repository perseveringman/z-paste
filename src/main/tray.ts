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
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAEKADAAQAAAABAAAAEAAAAAA0VXHyAAACKUlEQVQoFSVSyW4TQRDt6umZcezEsWOBEiPiC0IKAokbfCc/kT/gxBfklAPcYhyWKIsTx8GepbcqXk9GM91T1VWvX70qYmFSxL4K1TI0K1GkRIkwPqzYFcd8cFAMj7LeEC5ikbC98dsbHAiRgi2ilBJOfzCRqTjAVY6Pe5OZYVf5zTVwuiiliIQjOwt0bXKC2SFgaZeXpn9gQnWXCHRMQlP57drs9Elrttav6+hcvruf7ewCkDm29wsdmkclOnFmqW6viv1jRblEcENpphy/3v6aSwyIBqjbPBhsiSviY0RJe7P3uNA/XsORjw/hX1+cAysrdkhnkMSw96QNlEnShCDRxfqp/nkO/97Jp44M67yH6FS9iObg2LfJQErwSLLXczIaUteX35GPgCRD9AxiwRkOPklITijDDdxWHLbOV9FWJthga/ZOQujUS3oZGKkG9iiLbSMS7WoZ7SY2NVOesLyLwevMEGm83Q2pB4iM0Vn8lK/eqtVtNozl+AWzi22tTaHz8ll6A/iuNwztxDulZTCd9aczTbpd316cfvH3SySkORBMjZis6EdbK6XJFG77tPh6SpnBMTSorxbrs2/jD59RroppUrKipObh77/5GfRFhN2sm4c7iAcksNVZro0ph5Nib5Q6HeP+m4+mHB0Wo2l7/wdKF4NhORgmrugM6dQcPOhPGi3uTabl6CVBYbjc6mrz+weKxhR1vUdcmvPnDDDZPX5XTo4A+h9ywbQhL5cd+AAAAABJRU5ErkJggg=='
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
      width: 16,
      height: 16
    })

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
