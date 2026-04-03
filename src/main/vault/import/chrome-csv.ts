import { ImportedEntry } from './types'
import { parseCSV } from './csv-parser'
import { createVaultError, translateVaultText } from '../errors'

/**
 * Parse Chrome/Edge exported password CSV.
 * Expected header: name, url, username, password
 * Some exports also include: note (optional column)
 */
export function parseChromeCSV(content: string): ImportedEntry[] {
  const rows = parseCSV(content)
  if (rows.length < 2) return []

  const header = rows[0].map((h) => h.trim().toLowerCase())
  const nameIdx = header.indexOf('name')
  const urlIdx = header.indexOf('url')
  const usernameIdx = header.indexOf('username')
  const passwordIdx = header.indexOf('password')
  const noteIdx = header.indexOf('note')

  if (usernameIdx === -1 && passwordIdx === -1) {
    throw createVaultError('vault.import.invalidChromeCsv')
  }

  const entries: ImportedEntry[] = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const password = passwordIdx >= 0 ? row[passwordIdx]?.trim() : ''
    const username = usernameIdx >= 0 ? row[usernameIdx]?.trim() : ''

    // Skip rows with no meaningful data
    if (!password && !username) continue

    entries.push({
      name:
        (nameIdx >= 0 ? row[nameIdx]?.trim() : '') ||
        extractDomain(row[urlIdx]) ||
        translateVaultText('vault.import.untitled'),
      url: urlIdx >= 0 ? row[urlIdx]?.trim() || undefined : undefined,
      username: username || undefined,
      password: password || undefined,
      notes: noteIdx >= 0 ? row[noteIdx]?.trim() || undefined : undefined
    })
  }

  return entries
}

function extractDomain(url?: string): string {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}
