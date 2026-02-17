import { clipboard, nativeImage } from 'electron'
import { createHash } from 'crypto'
import { BrowserWindow } from 'electron'
import { detectContentType } from './detector'
import * as repository from '../database/repository'
import { nanoid } from 'nanoid'

export class ClipboardMonitor {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private lastTextHash: string = ''
  private lastImageHash: string = ''
  private polling = false

  start(): void {
    if (this.intervalId) return
    this.intervalId = setInterval(() => this.poll(), 500)
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  private poll(): void {
    if (this.polling) return
    this.polling = true
    try {
      this.checkText()
      this.checkImage()
    } finally {
      this.polling = false
    }
  }

  private checkText(): void {
    const text = clipboard.readText()
    if (!text || text.trim().length === 0) return

    const hash = this.computeHash(text)
    if (hash === this.lastTextHash) return
    this.lastTextHash = hash

    const existing = repository.getItemByHash(hash)
    if (existing) {
      repository.touchItem(existing.id)
      this.notifyRenderer(existing)
      return
    }

    const { type, metadata } = detectContentType(text)
    const preview = text.substring(0, 200)

    const item = {
      id: nanoid(),
      content: text,
      content_type: type,
      content_hash: hash,
      preview,
      metadata: metadata ? JSON.stringify(metadata) : null,
      is_favorite: 0,
      is_pinned: 0,
      source_app: null,
      tags: null,
      category_id: null,
      created_at: Date.now(),
      updated_at: Date.now()
    }

    repository.insertItem(item)
    this.notifyRenderer(item)
  }

  private checkImage(): void {
    const image = clipboard.readImage()
    if (image.isEmpty()) return

    const buffer = image.toPNG()
    const hash = this.computeHash(buffer)
    if (hash === this.lastImageHash) return
    this.lastImageHash = hash

    const existing = repository.getItemByHash(hash)
    if (existing) {
      repository.touchItem(existing.id)
      return
    }

    const base64 = buffer.toString('base64')
    const size = image.getSize()

    const item = {
      id: nanoid(),
      content: base64,
      content_type: 'image' as const,
      content_hash: hash,
      preview: `Image ${size.width}x${size.height}`,
      metadata: JSON.stringify({ width: size.width, height: size.height }),
      is_favorite: 0,
      is_pinned: 0,
      source_app: null,
      tags: null,
      category_id: null,
      created_at: Date.now(),
      updated_at: Date.now()
    }

    repository.insertItem(item)
    this.notifyRenderer(item)
  }

  private computeHash(data: string | Buffer): string {
    return createHash('sha256').update(data).digest('hex')
  }

  private notifyRenderer(item: unknown): void {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      win.webContents.send('clipboard:newItem', item)
    }
  }
}
