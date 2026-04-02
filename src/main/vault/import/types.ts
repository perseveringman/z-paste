export interface ImportedEntry {
  name: string
  url?: string
  username?: string
  password?: string
  notes?: string
  totp?: string
}

export type ImportFormat = 'chrome-csv' | '1password-csv' | 'bitwarden-json'

export interface ImportResult {
  total: number
  imported: number
  skipped: number
  errors: string[]
}
