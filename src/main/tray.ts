import { Tray, Menu, nativeImage, app } from 'electron'
import { WindowManager } from './window'

export class TrayManager {
  private tray: Tray | null = null
  private windowManager: WindowManager

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager
  }

  create(): void {
    // Create a simple tray icon (16x16 template image for macOS)
    const icon = nativeImage.createFromBuffer(
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAApgAAAKYB3X3/OAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABJSURBVDiNY2AYBYMBMDIwMDAwMTD8Z2BgYGBkYGBghIr/Z0Dh/2dA4f9nROH/Z0Th/2f4z/CfEcr/z4jC/8+Iwv/PiMIfOgAAGhkHsXpx1CkAAAAASUVORK5CYII=',
        'base64'
      )
    )
    icon.setTemplateImage(true)

    this.tray = new Tray(icon)
    this.tray.setToolTip('Z-Paste')

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '打开面板',
        accelerator: 'Shift+CommandOrControl+V',
        click: () => this.windowManager.toggle()
      },
      { type: 'separator' },
      {
        label: '开机自启',
        type: 'checkbox',
        checked: app.getLoginItemSettings().openAtLogin,
        click: (menuItem) => {
          app.setLoginItemSettings({ openAtLogin: menuItem.checked })
        }
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => app.quit()
      }
    ])

    this.tray.setContextMenu(contextMenu)
    this.tray.on('click', () => {
      this.windowManager.toggle()
    })
  }
}
