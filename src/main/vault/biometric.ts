import keytar from 'keytar'
import { systemPreferences } from 'electron'

const SERVICE = 'com.zpaste.vault'
const ACCOUNT = 'biometric_dek'

// Touch ID prompt reason shown in the macOS system dialog.
// This string is displayed by macOS directly and is intentionally in English.
const TOUCH_ID_REASON = 'unlock Z-Paste Vault'

export async function saveBiometricDEK(dek: Buffer): Promise<void> {
  await keytar.setPassword(SERVICE, ACCOUNT, dek.toString('base64'))
}

export async function loadBiometricDEK(): Promise<Buffer | null> {
  // Prompt Touch ID before accessing the stored DEK
  try {
    await systemPreferences.promptTouchID(TOUCH_ID_REASON)
  } catch {
    return null
  }

  const secret = await keytar.getPassword(SERVICE, ACCOUNT)
  if (!secret) return null
  try {
    return Buffer.from(secret, 'base64')
  } catch {
    return null
  }
}

export async function hasBiometricDEK(): Promise<boolean> {
  if (!systemPreferences.canPromptTouchID()) return false
  const secret = await keytar.getPassword(SERVICE, ACCOUNT)
  return !!secret
}

export async function clearBiometricDEK(): Promise<void> {
  await keytar.deletePassword(SERVICE, ACCOUNT)
}

