import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { execSync } from 'child_process'

export class WindowManager {
  private mainWindow: BrowserWindow | null = null
  private previousAppBundleId: string | null = null
  private blurSuppressed = false
  private vaultSession: { lockOnHide: () => Promise<void> } | null = null

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
      if (this.blurSuppressed) return
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

    // Capture the frontmost app before we steal focus
    try {
      this.previousAppBundleId = execSync(
        `osascript -e 'tell application "System Events" to get bundle identifier of first application process whose frontmost is true'`,
        { encoding: 'utf-8' }
      ).trim()
    } catch {
      this.previousAppBundleId = null
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

  showWithView(view: 'clipboard' | 'vault'): void {
    const wasVisible = this.mainWindow?.isVisible()
    this.show()
    if (!wasVisible) {
      // wait for renderer to mount before sending view switch
      this.mainWindow?.webContents.once('did-finish-load', () => {
        this.mainWindow?.webContents.send('panel:set-view', view)
      })
    }
    this.mainWindow?.webContents.send('panel:set-view', view)
  }

  hide(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.hide()
      this.mainWindow.webContents.send('panel:hidden')
      if (this.vaultSession) {
        void this.vaultSession.lockOnHide()
      }
    }
  }

  getPreviousAppBundleId(): string | null {
    return this.previousAppBundleId
  }

  suppressBlur(): void {
    this.blurSuppressed = true
  }

  restoreBlur(): void {
    this.blurSuppressed = false
  }

  setVaultSession(session: { lockOnHide: () => Promise<void> }): void {
    this.vaultSession = session
  }

  getWindow(): BrowserWindow | null {
    return this.mainWindow
  }
}
