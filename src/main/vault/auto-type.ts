import { clipboard } from 'electron'
import { exec } from 'child_process'
import { markAsVaultContent } from '../clipboard/vault-clipboard-guard'

interface AutoTypeOptions {
  username: string
  password: string
  submit?: boolean
  stepDelayMs?: number
}

function runAppleScript(script: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(`osascript -e '${script.replace(/'/g, `'\\''`)}'`, (error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class AutoTypeAgent {
  async run(
    previousAppBundleId: string | null,
    options: AutoTypeOptions,
    hideWindow?: () => void
  ): Promise<void> {
    const stepDelay = Math.max(20, options.stepDelayMs ?? 80)

    // 1. 先激活目标应用，让它获得焦点
    if (previousAppBundleId) {
      await runAppleScript(`tell application id "${previousAppBundleId}" to activate`)
    }

    // 2. 隐藏 Stash 窗口（目标应用已在前台）
    hideWindow?.()
    await sleep(stepDelay)

    markAsVaultContent(options.username)
    clipboard.writeText(options.username)
    await runAppleScript('tell application "System Events" to keystroke "v" using command down')
    await sleep(stepDelay)

    await runAppleScript('tell application "System Events" to key code 48')
    await sleep(stepDelay)

    markAsVaultContent(options.password)
    clipboard.writeText(options.password)
    await runAppleScript('tell application "System Events" to keystroke "v" using command down')

    if (options.submit) {
      await sleep(stepDelay)
      await runAppleScript('tell application "System Events" to key code 36')
    }

    // Clear sensitive data from clipboard after paste completes
    await sleep(stepDelay * 2)
    clipboard.clear()
  }
}

