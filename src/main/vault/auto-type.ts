import { clipboard } from 'electron'
import { exec } from 'child_process'

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
  async run(previousAppBundleId: string | null, options: AutoTypeOptions): Promise<void> {
    const stepDelay = Math.max(20, options.stepDelayMs ?? 80)

    if (previousAppBundleId) {
      await runAppleScript(`tell application id "${previousAppBundleId}" to activate`)
      await sleep(stepDelay)
    }

    clipboard.writeText(options.username)
    await runAppleScript('tell application "System Events" to keystroke "v" using command down')
    await sleep(stepDelay)

    await runAppleScript('tell application "System Events" to key code 48')
    await sleep(stepDelay)

    clipboard.writeText(options.password)
    await runAppleScript('tell application "System Events" to keystroke "v" using command down')

    if (options.submit) {
      await sleep(stepDelay)
      await runAppleScript('tell application "System Events" to key code 36')
    }
  }
}

