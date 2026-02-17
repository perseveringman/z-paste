import { getDatabase } from './connection'

export function createTables(): void {
  const db = getDatabase()

  db.exec(`
    CREATE TABLE IF NOT EXISTS clipboard_items (
      id            TEXT PRIMARY KEY,
      content       TEXT NOT NULL,
      content_type  TEXT NOT NULL,
      content_hash  TEXT UNIQUE NOT NULL,
      preview       TEXT,
      metadata      TEXT,
      is_favorite   INTEGER DEFAULT 0,
      is_pinned     INTEGER DEFAULT 0,
      source_app    TEXT,
      tags          TEXT,
      category_id   TEXT,
      created_at    INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_items_created ON clipboard_items(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_items_type ON clipboard_items(content_type);
    CREATE INDEX IF NOT EXISTS idx_items_favorite ON clipboard_items(is_favorite);
    CREATE INDEX IF NOT EXISTS idx_items_hash ON clipboard_items(content_hash);

    CREATE TABLE IF NOT EXISTS categories (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      color       TEXT,
      sort_order  INTEGER DEFAULT 0,
      created_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS templates (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      content     TEXT NOT NULL,
      category_id TEXT,
      sort_order  INTEGER DEFAULT 0,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );
  `)
}
