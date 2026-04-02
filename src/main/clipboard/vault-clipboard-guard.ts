import { createHash } from 'crypto'
import { clipboard } from 'electron'

const vaultClipboardHashes = new Set<string>()

function hash(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

/** Mark text so the clipboard monitor will skip recording it. */
export function markAsVaultContent(text: string): void {
  const h = hash(text)
  vaultClipboardHashes.add(h)
  // Auto-expire the marker after 60 s
  setTimeout(() => vaultClipboardHashes.delete(h), 60_000)
}

/** Check whether the text was marked as vault-originated. */
export function isVaultContent(text: string): boolean {
  return vaultClipboardHashes.has(hash(text))
}

/**
 * Write vault-sensitive text to the clipboard with auto-clear.
 * Marks the content so the monitor ignores it, writes it,
 * then clears the clipboard after `delayMs` (default 30 s)
 * only if it hasn't been overwritten by the user.
 */
export function writeVaultClipboard(text: string, delayMs = 30_000): void {
  markAsVaultContent(text)
  clipboard.writeText(text)
  setTimeout(() => {
    if (clipboard.readText() === text) {
      clipboard.clear()
    }
  }, delayMs)
}
