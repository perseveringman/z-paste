import { execSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { app, nativeImage } from 'electron'

const iconCache = new Map<string, string>()

function getIconDir(): string {
  const dir = join(app.getPath('userData'), 'app-icons')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export function getAppIcon(bundleId: string): string | null {
  if (!bundleId) return null

  // Check memory cache
  if (iconCache.has(bundleId)) return iconCache.get(bundleId)!

  // Check disk cache
  const iconDir = getIconDir()
  const cachedPath = join(iconDir, `${bundleId}.png`)
  if (existsSync(cachedPath)) {
    const base64 = readFileSync(cachedPath).toString('base64')
    iconCache.set(bundleId, base64)
    return base64
  }

  // Find app path and extract icon
  try {
    const appPath = execSync(
      `mdfind "kMDItemCFBundleIdentifier == '${bundleId}'" | head -1`,
      { encoding: 'utf-8', timeout: 3000 }
    ).trim()

    if (!appPath) return null

    // Use Electron's nativeImage to get the app icon via file icon API
    const icon = app.getFileIcon
      ? undefined // Will use alternative approach
      : undefined

    // Use sips to convert icns to png
    const iconPath = execSync(
      `defaults read "${appPath}/Contents/Info" CFBundleIconFile 2>/dev/null || echo ""`,
      { encoding: 'utf-8', timeout: 3000 }
    ).trim()

    if (!iconPath) {
      // Fallback: try to get icon using file icon
      const result = nativeImage.createFromPath(join(appPath, 'Contents/Resources/AppIcon.icns'))
      if (!result.isEmpty()) {
        const png = result.resize({ width: 32, height: 32 }).toPNG()
        const base64 = png.toString('base64')
        writeFileSync(cachedPath, png)
        iconCache.set(bundleId, base64)
        return base64
      }
      return null
    }

    const icnsName = iconPath.endsWith('.icns') ? iconPath : `${iconPath}.icns`
    const icnsPath = join(appPath, 'Contents/Resources', icnsName)

    if (!existsSync(icnsPath)) return null

    const image = nativeImage.createFromPath(icnsPath)
    if (image.isEmpty()) return null

    const png = image.resize({ width: 32, height: 32 }).toPNG()
    const base64 = png.toString('base64')
    writeFileSync(cachedPath, png)
    iconCache.set(bundleId, base64)
    return base64
  } catch {
    return null
  }
}
