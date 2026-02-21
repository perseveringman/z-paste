import { Tray, Menu, nativeImage, app } from 'electron'
import { WindowManager } from './window'

const trayLabels: Record<string, Record<string, string>> = {
  'zh-CN': { openPanel: '打开面板', launchAtLogin: '开机自启', quit: '退出' },
  en: { openPanel: 'Open Panel', launchAtLogin: 'Launch at Login', quit: 'Quit' },
  'zh-TW': { openPanel: '開啟面板', launchAtLogin: '開機自啟', quit: '結束' }
}

export class TrayManager {
  private tray: Tray | null = null
  private windowManager: WindowManager
  private language: string = 'zh-CN'

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager
  }

  private getLabel(key: string): string {
    return trayLabels[this.language]?.[key] ?? trayLabels['zh-CN'][key]
  }

  private buildMenu(): void {
    if (!this.tray) return

    const contextMenu = Menu.buildFromTemplate([
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
    ])

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
    this.tray.setToolTip('Z-Paste')

    this.buildMenu()

    this.tray.on('click', () => {
      this.windowManager.toggle()
    })
  }

  setLanguage(lang: string): void {
    this.language = lang
    this.buildMenu()
  }
}
