import * as fs from 'fs'
import { ImportedEntry, ImportFormat, ImportResult } from './types'
import { parseChromeCSV } from './chrome-csv'
import { parseOnePasswordCSV } from './onepassword-csv'
import { parseBitwardenJSON } from './bitwarden-json'
import { VaultService } from '../service'

const parsers: Record<ImportFormat, (content: string) => ImportedEntry[]> = {
  'chrome-csv': parseChromeCSV,
  '1password-csv': parseOnePasswordCSV,
  'bitwarden-json': parseBitwardenJSON
}

export function parseImportFile(filePath: string, format: ImportFormat): ImportedEntry[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const parser = parsers[format]
  if (!parser) {
    throw new Error(`Unsupported import format: ${format}`)
  }
  return parser(content)
}

export async function importEntries(
  entries: ImportedEntry[],
  vaultService: VaultService
): Promise<ImportResult> {
  const result: ImportResult = { total: entries.length, imported: 0, skipped: 0, errors: [] }

  // Fetch existing items for duplicate detection (url + username)
  const existingItems = await vaultService.listItems({ limit: 10000 })
  const existingDetails = new Map<string, boolean>()
  for (const item of existingItems) {
    if (item.type === 'login' && item.website) {
      const key = `${normalizeUrl(item.website)}|${item.title}`
      existingDetails.set(key, true)
    }
  }

  for (const entry of entries) {
    try {
      const dupKey = `${normalizeUrl(entry.url || '')}|${entry.name}`
      if (existingDetails.has(dupKey)) {
        result.skipped++
        continue
      }

      await vaultService.createLogin({
        title: entry.name,
        website: entry.url || null,
        username: entry.username || '',
        password: entry.password || '',
        notes: entry.notes || null,
        totpSecret: entry.totp || null
      })

      existingDetails.set(dupKey, true)
      result.imported++
    } catch (e) {
      result.errors.push(`Failed to import "${entry.name}": ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return result
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.toLowerCase()
  } catch {
    return url.toLowerCase()
  }
}

export type { ImportedEntry, ImportFormat, ImportResult } from './types'
