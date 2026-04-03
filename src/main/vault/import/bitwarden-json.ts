import { ImportedEntry } from './types'
import { createVaultError, translateVaultText } from '../errors'

interface BitwardenUri {
  uri?: string
  match?: number
}

interface BitwardenLogin {
  uris?: BitwardenUri[]
  username?: string
  password?: string
  totp?: string
}

interface BitwardenItem {
  type?: number
  name?: string
  login?: BitwardenLogin
  notes?: string
}

interface BitwardenExport {
  encrypted?: boolean
  items?: BitwardenItem[]
}

/**
 * Parse Bitwarden exported JSON.
 * Only type=1 (Login) items are imported.
 */
export function parseBitwardenJSON(content: string): ImportedEntry[] {
  let data: BitwardenExport
  try {
    data = JSON.parse(content)
  } catch {
    throw createVaultError('vault.import.invalidBitwardenJson')
  }

  if (data.encrypted) {
    throw createVaultError('vault.import.bitwardenEncrypted')
  }

  if (!Array.isArray(data.items)) {
    throw createVaultError('vault.import.bitwardenMissingItems')
  }

  const entries: ImportedEntry[] = []
  for (const item of data.items) {
    // type 1 = Login
    if (item.type !== undefined && item.type !== 1) continue

    const login = item.login
    if (!login) continue

    const password = login.password?.trim() || ''
    const username = login.username?.trim() || ''
    if (!password && !username) continue

    const url = login.uris?.[0]?.uri?.trim()

    entries.push({
      name: item.name?.trim() || translateVaultText('vault.import.untitled'),
      url: url || undefined,
      username: username || undefined,
      password: password || undefined,
      notes: item.notes?.trim() || undefined,
      totp: login.totp?.trim() || undefined
    })
  }

  return entries
}
