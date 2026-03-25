// Message types for communication between extension components and native host

export interface NativeMessage {
  id: number
  method: string
  params?: Record<string, unknown>
}

export interface NativeResponse {
  id: number
  result?: unknown
  error?: string
}

export type VaultItemType = 'login' | 'secure_note'

export interface VaultItemMeta {
  id: string
  type: VaultItemType
  title: string
  website: string | null
  favorite: number
  tags: string | null
  created_at: number
  updated_at: number
  last_used_at: number | null
}

export interface VaultSecurityState {
  locked: boolean
  hasVaultSetup: boolean
  autoLockMinutes: number
  securityMode: 'strict' | 'relaxed'
  hintQuestion: string | null
}

export interface VaultLoginFields {
  username: string
  password: string
  notes: string | null
  totpSecret: string | null
}

export interface VaultItemDetail {
  meta: VaultItemMeta
  type: VaultItemType
  fields: VaultLoginFields | { content: string }
}

export interface CreateLoginInput {
  title: string
  website?: string | null
  username: string
  password: string
  notes?: string | null
  totpSecret?: string | null
  favorite?: boolean
  tags?: string[] | null
}
