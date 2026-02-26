import keytar from 'keytar'

const SERVICE = 'com.zpaste.vault'
const ACCOUNT = 'biometric_dek'

export async function saveBiometricDEK(dek: Buffer): Promise<void> {
  await keytar.setPassword(SERVICE, ACCOUNT, dek.toString('base64'))
}

export async function loadBiometricDEK(): Promise<Buffer | null> {
  const secret = await keytar.getPassword(SERVICE, ACCOUNT)
  if (!secret) return null
  try {
    return Buffer.from(secret, 'base64')
  } catch {
    return null
  }
}

export async function hasBiometricDEK(): Promise<boolean> {
  const secret = await keytar.getPassword(SERVICE, ACCOUNT)
  return !!secret
}

export async function clearBiometricDEK(): Promise<void> {
  await keytar.deletePassword(SERVICE, ACCOUNT)
}

