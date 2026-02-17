import { getDatabase } from './connection'
import { encryptContent, decryptContent, isKeySet } from '../security/encryption'

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
  const content = isKeySet() ? (encryptContent(item.content) || item.content) : item.content
  const stmt = db.prepare(`
    INSERT INTO clipboard_items (id, content, content_type, content_hash, preview, metadata,
      is_favorite, is_pinned, source_app, tags, category_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  stmt.run(
    item.id,
    content,
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

function maybeDecryptItem(item: ClipboardItem): ClipboardItem {
  if (!isKeySet()) return item
  try {
    const parsed = JSON.parse(item.content)
    if (parsed.ciphertext && parsed.iv && parsed.tag) {
      const decrypted = decryptContent(item.content)
      if (decrypted) {
        return { ...item, content: decrypted }
      }
    }
  } catch {
    // not encrypted or invalid, return as-is
  }
  return item
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

  const items = db.prepare(query).all(...params) as ClipboardItem[]
  return items.map(maybeDecryptItem)
}

export function getItemById(id: string): ClipboardItem | undefined {
  const db = getDatabase()
  const item = db.prepare('SELECT * FROM clipboard_items WHERE id = ?').get(id) as
    | ClipboardItem
    | undefined
  return item ? maybeDecryptItem(item) : undefined
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
  const items = db
    .prepare(
      `SELECT * FROM clipboard_items
       WHERE content LIKE ? OR preview LIKE ?
       ORDER BY is_pinned DESC, updated_at DESC
       LIMIT 50`
    )
    .all(`%${query}%`, `%${query}%`) as ClipboardItem[]
  return items.map(maybeDecryptItem)
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

// Template types
export interface Template {
  id: string
  name: string
  content: string
  category_id: string | null
  sort_order: number
  created_at: number
  updated_at: number
}

export function getTemplates(): Template[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM templates ORDER BY sort_order ASC').all() as Template[]
}

export function createTemplate(
  id: string,
  name: string,
  content: string,
  categoryId?: string
): void {
  const db = getDatabase()
  const now = Date.now()
  db.prepare(
    'INSERT INTO templates (id, name, content, category_id, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, name, content, categoryId || null, 0, now, now)
}

export function updateTemplate(id: string, name: string, content: string): void {
  const db = getDatabase()
  db.prepare('UPDATE templates SET name = ?, content = ?, updated_at = ? WHERE id = ?').run(
    name,
    content,
    Date.now(),
    id
  )
}

export function deleteTemplate(id: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM templates WHERE id = ?').run(id)
}

// Category types
export interface Category {
  id: string
  name: string
  color: string | null
  sort_order: number
  created_at: number
}

export function getCategories(): Category[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all() as Category[]
}

export function createCategory(id: string, name: string, color: string | null): void {
  const db = getDatabase()
  db.prepare(
    'INSERT INTO categories (id, name, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name, color, 0, Date.now())
}

export function deleteCategory(id: string): void {
  const db = getDatabase()
  db.prepare('UPDATE clipboard_items SET category_id = NULL WHERE category_id = ?').run(id)
  db.prepare('DELETE FROM categories WHERE id = ?').run(id)
}

export function updateItemCategory(itemId: string, categoryId: string | null): void {
  const db = getDatabase()
  db.prepare('UPDATE clipboard_items SET category_id = ?, updated_at = ? WHERE id = ?').run(
    categoryId,
    Date.now(),
    itemId
  )
}

export function autoCleanup(maxItems: number = 2000): void {
  const count = getItemCount()
  if (count > maxItems) {
    const db = getDatabase()
    db.prepare(
      `DELETE FROM clipboard_items
       WHERE id IN (
         SELECT id FROM clipboard_items
         WHERE is_favorite = 0 AND is_pinned = 0
         ORDER BY updated_at ASC
         LIMIT ?
       )`
    ).run(count - maxItems)
  }
}

export function cleanupByRetention(days: number): void {
  if (days <= 0) return
  const db = getDatabase()
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  db.prepare(
    `DELETE FROM clipboard_items
     WHERE is_favorite = 0 AND is_pinned = 0 AND updated_at < ?`
  ).run(cutoff)
}
