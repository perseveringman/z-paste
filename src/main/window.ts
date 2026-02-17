import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

export class WindowManager {
  private mainWindow: BrowserWindow | null = null

  create(): BrowserWindow {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      return this.mainWindow
    }

    this.mainWindow = new BrowserWindow({
      width: 680,
      height: 480,
      show: false,
      frame: false,
      transparent: true,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      vibrancy: 'under-window',
      visualEffectState: 'active',
      roundedCorners: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    })

    this.mainWindow.on('blur', () => {
      this.hide()
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    return this.mainWindow
  }

  toggle(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      this.create()
    }

    if (this.mainWindow!.isVisible()) {
      this.hide()
    } else {
      this.show()
    }
  }

  show(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      this.create()
    }

    const win = this.mainWindow!
    const cursorPoint = screen.getCursorScreenPoint()
    const display = screen.getDisplayNearestPoint(cursorPoint)
    const { x, y, width, height } = display.workArea
    const winBounds = win.getBounds()

    const centerX = Math.round(x + (width - winBounds.width) / 2)
    const centerY = Math.round(y + (height - winBounds.height) / 2)

    win.setPosition(centerX, centerY)
    win.show()
    win.focus()
    win.webContents.send('panel:shown')
  }

  hide(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.hide()
      this.mainWindow.webContents.send('panel:hidden')
    }
  }

  getWindow(): BrowserWindow | null {
    return this.mainWindow
  }
}
