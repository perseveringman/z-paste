import { ImportedEntry } from './types'
import { parseCSV } from './csv-parser'
import { createVaultError, translateVaultText } from '../errors'

/**
 * Parse 1Password exported CSV.
 * Expected header: Title, Url, Username, Password, Notes, Type
 * Only items with Type = "Login" (or missing Type) are imported.
 */
export function parseOnePasswordCSV(content: string): ImportedEntry[] {
  const rows = parseCSV(content)
  if (rows.length < 2) return []

  const header = rows[0].map((h) => h.trim().toLowerCase())
  const titleIdx = header.indexOf('title')
  const urlIdx = header.indexOf('url')
  const usernameIdx = header.indexOf('username')
  const passwordIdx = header.indexOf('password')
  const notesIdx = header.indexOf('notes')
  const typeIdx = header.indexOf('type')

  if (titleIdx === -1 && passwordIdx === -1) {
    throw createVaultError('vault.import.invalidOnePasswordCsv')
  }

  const entries: ImportedEntry[] = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const type = typeIdx >= 0 ? row[typeIdx]?.trim().toLowerCase() : ''

    // Only import Login type (or unspecified type)
    if (type && type !== 'login') continue

    const password = passwordIdx >= 0 ? row[passwordIdx]?.trim() : ''
    const username = usernameIdx >= 0 ? row[usernameIdx]?.trim() : ''
    if (!password && !username) continue

    entries.push({
      name: (titleIdx >= 0 ? row[titleIdx]?.trim() : '') || translateVaultText('vault.import.untitled'),
      url: urlIdx >= 0 ? row[urlIdx]?.trim() || undefined : undefined,
      username: username || undefined,
      password: password || undefined,
      notes: notesIdx >= 0 ? row[notesIdx]?.trim() || undefined : undefined
    })
  }

  return entries
}
