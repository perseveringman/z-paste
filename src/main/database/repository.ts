import { getDatabase } from './connection'

export interface ClipboardItem {
  id: string
  content: string
  content_type: string
  content_hash: string
  preview: string | null
  metadata: string | null
  is_favorite: number
  is_pinned: number
  source_app: string | null
  tags: string | null
  category_id: string | null
  created_at: number
  updated_at: number
}

export interface GetItemsOptions {
  limit?: number
  offset?: number
  contentType?: string
  favoritesOnly?: boolean
}

export function insertItem(item: ClipboardItem): void {
  const db = getDatabase()
  const stmt = db.prepare(`
    INSERT INTO clipboard_items (id, content, content_type, content_hash, preview, metadata,
      is_favorite, is_pinned, source_app, tags, category_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  stmt.run(
    item.id,
    item.content,
    item.content_type,
    item.content_hash,
    item.preview,
    item.metadata,
    item.is_favorite,
    item.is_pinned,
    item.source_app,
    item.tags,
    item.category_id,
    item.created_at,
    item.updated_at
  )
}

export function getItems(options: GetItemsOptions = {}): ClipboardItem[] {
  const db = getDatabase()
  const { limit = 50, offset = 0, contentType, favoritesOnly } = options

  let query = 'SELECT * FROM clipboard_items'
  const conditions: string[] = []
  const params: unknown[] = []

  if (contentType) {
    conditions.push('content_type = ?')
    params.push(contentType)
  }
  if (favoritesOnly) {
    conditions.push('is_favorite = 1')
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ')
  }

  query += ' ORDER BY is_pinned DESC, updated_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  return db.prepare(query).all(...params) as ClipboardItem[]
}

export function getItemById(id: string): ClipboardItem | undefined {
  const db = getDatabase()
  return db.prepare('SELECT * FROM clipboard_items WHERE id = ?').get(id) as
    | ClipboardItem
    | undefined
}

export function getItemByHash(hash: string): ClipboardItem | undefined {
  const db = getDatabase()
  return db.prepare('SELECT * FROM clipboard_items WHERE content_hash = ?').get(hash) as
    | ClipboardItem
    | undefined
}

export function touchItem(id: string): void {
  const db = getDatabase()
  db.prepare('UPDATE clipboard_items SET updated_at = ? WHERE id = ?').run(Date.now(), id)
}

export function deleteItem(id: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM clipboard_items WHERE id = ?').run(id)
}

export function toggleFavorite(id: string): void {
  const db = getDatabase()
  db.prepare(
    'UPDATE clipboard_items SET is_favorite = CASE WHEN is_favorite = 0 THEN 1 ELSE 0 END, updated_at = ? WHERE id = ?'
  ).run(Date.now(), id)
}

export function togglePin(id: string): void {
  const db = getDatabase()
  db.prepare(
    'UPDATE clipboard_items SET is_pinned = CASE WHEN is_pinned = 0 THEN 1 ELSE 0 END, updated_at = ? WHERE id = ?'
  ).run(Date.now(), id)
}

export function searchItems(query: string): ClipboardItem[] {
  const db = getDatabase()
  return db
    .prepare(
      `SELECT * FROM clipboard_items
       WHERE content LIKE ? OR preview LIKE ?
       ORDER BY is_pinned DESC, updated_at DESC
       LIMIT 50`
    )
    .all(`%${query}%`, `%${query}%`) as ClipboardItem[]
}

export function clearAll(): void {
  const db = getDatabase()
  db.prepare('DELETE FROM clipboard_items WHERE is_favorite = 0 AND is_pinned = 0').run()
}

export function getItemCount(): number {
  const db = getDatabase()
  const result = db.prepare('SELECT COUNT(*) as count FROM clipboard_items').get() as {
    count: number
  }
  return result.count
}
