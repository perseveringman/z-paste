import { getDatabase } from './connection'

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

export interface VaultItemSecret {
  item_id: string
  encrypted_payload: string
  wrapped_item_key: string
  enc_version: number
}

export interface VaultCryptoMeta {
  id: string
  kdf_type: string
  kdf_params: string
  salt: string
  dek_wrapped_by_master: string
  dek_wrapped_by_recovery: string
  created_at: number
  updated_at: number
}

export interface VaultAuditEvent {
  id: string
  event_type: string
  result: string
  reason_code: string | null
  created_at: number
}

interface ListVaultItemsOptions {
  query?: string
  type?: VaultItemType
  limit?: number
  offset?: number
}

export function listVaultItems(options: ListVaultItemsOptions = {}): VaultItemMeta[] {
  const db = getDatabase()
  const { query, type, limit = 100, offset = 0 } = options
  const conditions: string[] = []
  const params: unknown[] = []

  if (type) {
    conditions.push('type = ?')
    params.push(type)
  }
  if (query && query.trim()) {
    conditions.push('(title LIKE ? OR website LIKE ? OR tags LIKE ?)')
    const like = `%${query.trim()}%`
    params.push(like, like, like)
  }

  let sql = 'SELECT * FROM vault_items'
  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`
  }
  sql += ' ORDER BY favorite DESC, updated_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  return db.prepare(sql).all(...params) as VaultItemMeta[]
}

export function getVaultItemMetaById(id: string): VaultItemMeta | undefined {
  const db = getDatabase()
  return db.prepare('SELECT * FROM vault_items WHERE id = ?').get(id) as VaultItemMeta | undefined
}

export function getVaultItemSecretById(itemId: string): VaultItemSecret | undefined {
  const db = getDatabase()
  return db
    .prepare('SELECT * FROM vault_item_secrets WHERE item_id = ?')
    .get(itemId) as VaultItemSecret | undefined
}

export function insertVaultItem(meta: VaultItemMeta, secret: VaultItemSecret): void {
  const db = getDatabase()
  const insert = db.transaction(() => {
    db.prepare(
      `INSERT INTO vault_items (id, type, title, website, favorite, tags, created_at, updated_at, last_used_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      meta.id,
      meta.type,
      meta.title,
      meta.website,
      meta.favorite,
      meta.tags,
      meta.created_at,
      meta.updated_at,
      meta.last_used_at
    )

    db.prepare(
      `INSERT INTO vault_item_secrets (item_id, encrypted_payload, wrapped_item_key, enc_version)
       VALUES (?, ?, ?, ?)`
    ).run(secret.item_id, secret.encrypted_payload, secret.wrapped_item_key, secret.enc_version)
  })

  insert()
}

export function updateVaultItem(
  id: string,
  updates: Partial<Pick<VaultItemMeta, 'title' | 'website' | 'favorite' | 'tags' | 'updated_at' | 'last_used_at'>>,
  secret?: Partial<Pick<VaultItemSecret, 'encrypted_payload' | 'wrapped_item_key' | 'enc_version'>>
): void {
  const db = getDatabase()
  const run = db.transaction(() => {
    const metaFields: string[] = []
    const metaParams: unknown[] = []

    if (updates.title !== undefined) {
      metaFields.push('title = ?')
      metaParams.push(updates.title)
    }
    if (updates.website !== undefined) {
      metaFields.push('website = ?')
      metaParams.push(updates.website)
    }
    if (updates.favorite !== undefined) {
      metaFields.push('favorite = ?')
      metaParams.push(updates.favorite)
    }
    if (updates.tags !== undefined) {
      metaFields.push('tags = ?')
      metaParams.push(updates.tags)
    }
    if (updates.updated_at !== undefined) {
      metaFields.push('updated_at = ?')
      metaParams.push(updates.updated_at)
    }
    if (updates.last_used_at !== undefined) {
      metaFields.push('last_used_at = ?')
      metaParams.push(updates.last_used_at)
    }

    if (metaFields.length > 0) {
      db.prepare(`UPDATE vault_items SET ${metaFields.join(', ')} WHERE id = ?`).run(...metaParams, id)
    }

    if (secret) {
      const secretFields: string[] = []
      const secretParams: unknown[] = []

      if (secret.encrypted_payload !== undefined) {
        secretFields.push('encrypted_payload = ?')
        secretParams.push(secret.encrypted_payload)
      }
      if (secret.wrapped_item_key !== undefined) {
        secretFields.push('wrapped_item_key = ?')
        secretParams.push(secret.wrapped_item_key)
      }
      if (secret.enc_version !== undefined) {
        secretFields.push('enc_version = ?')
        secretParams.push(secret.enc_version)
      }

      if (secretFields.length > 0) {
        db.prepare(`UPDATE vault_item_secrets SET ${secretFields.join(', ')} WHERE item_id = ?`).run(
          ...secretParams,
          id
        )
      }
    }
  })

  run()
}

export function deleteVaultItem(id: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM vault_items WHERE id = ?').run(id)
}

export function upsertVaultCryptoMeta(meta: VaultCryptoMeta): void {
  const db = getDatabase()
  db.prepare(
    `INSERT INTO vault_crypto_meta (id, kdf_type, kdf_params, salt, dek_wrapped_by_master, dek_wrapped_by_recovery, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       kdf_type = excluded.kdf_type,
       kdf_params = excluded.kdf_params,
       salt = excluded.salt,
       dek_wrapped_by_master = excluded.dek_wrapped_by_master,
       dek_wrapped_by_recovery = excluded.dek_wrapped_by_recovery,
       updated_at = excluded.updated_at`
  ).run(
    meta.id,
    meta.kdf_type,
    meta.kdf_params,
    meta.salt,
    meta.dek_wrapped_by_master,
    meta.dek_wrapped_by_recovery,
    meta.created_at,
    meta.updated_at
  )
}

export function getVaultCryptoMeta(id: string = 'primary'): VaultCryptoMeta | undefined {
  const db = getDatabase()
  return db.prepare('SELECT * FROM vault_crypto_meta WHERE id = ?').get(id) as
    | VaultCryptoMeta
    | undefined
}

export function appendVaultAuditEvent(event: VaultAuditEvent): void {
  const db = getDatabase()
  db.prepare(
    'INSERT INTO vault_audit_events (id, event_type, result, reason_code, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(event.id, event.event_type, event.result, event.reason_code, event.created_at)
}

export function listVaultAuditEvents(limit: number = 20): VaultAuditEvent[] {
  const db = getDatabase()
  return db
    .prepare('SELECT * FROM vault_audit_events ORDER BY created_at DESC LIMIT ?')
    .all(Math.max(1, limit)) as VaultAuditEvent[]
}
