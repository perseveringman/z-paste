import { app, BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { is } from '@electron-toolkit/utils'
import { execSync } from 'child_process'

interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

function getBoundsPath(): string {
  return join(app.getPath('userData'), 'window-bounds.json')
}

function loadBounds(): WindowBounds | null {
  try {
    return JSON.parse(readFileSync(getBoundsPath(), 'utf-8'))
  } catch {
    return null
  }
}

function saveBounds(bounds: WindowBounds): void {
  try {
    mkdirSync(app.getPath('userData'), { recursive: true })
    writeFileSync(getBoundsPath(), JSON.stringify(bounds))
  } catch {
    // ignore write errors
  }
}

export class WindowManager {
  private mainWindow: BrowserWindow | null = null
  private previousAppBundleId: string | null = null
  private blurSuppressed = false
  private vaultSession: { lockOnHide: () => Promise<void> } | null = null
  private saveTimer: ReturnType<typeof setTimeout> | null = null

  create(): BrowserWindow {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      return this.mainWindow
    }

    const saved = loadBounds()

    this.mainWindow = new BrowserWindow({
      width: saved?.width ?? 680,
      height: saved?.height ?? 480,
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      resizable: true,
      minWidth: 400,
      minHeight: 300,
      alwaysOnTop: true,
      skipTaskbar: true,
      vibrancy: 'under-window',
      visualEffectState: 'active',
      roundedCorners: false,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    })

    const debounceSave = (): void => {
      if (this.saveTimer) clearTimeout(this.saveTimer)
      this.saveTimer = setTimeout(() => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          saveBounds(this.mainWindow.getBounds())
        }
      }, 300)
    }

    this.mainWindow.on('resize', debounceSave)
    this.mainWindow.on('moved', debounceSave)

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
    const saved = loadBounds()

    if (saved) {
      const visible = screen.getAllDisplays().some((d) => {
        const { x, y, width, height } = d.workArea
        return saved.x < x + width && saved.x + saved.width > x && saved.y < y + height && saved.y + saved.height > y
      })
      if (visible) {
        win.setBounds(saved)
      } else {
        this.centerOnScreen(win)
      }
    } else {
      this.centerOnScreen(win)
    }
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

  private centerOnScreen(win: BrowserWindow): void {
    const cursorPoint = screen.getCursorScreenPoint()
    const display = screen.getDisplayNearestPoint(cursorPoint)
    const { x, y, width, height } = display.workArea
    const winBounds = win.getBounds()
    win.setPosition(
      Math.round(x + (width - winBounds.width) / 2),
      Math.round(y + (height - winBounds.height) / 2)
    )
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
