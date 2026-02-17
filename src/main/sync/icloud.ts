import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import * as repository from '../database/repository'
import type { ClipboardItem } from '../database/repository'

interface ChangeRecord {
  operation: 'add' | 'update' | 'delete'
  item: ClipboardItem
  timestamp: number
  deviceId: string
}

interface SyncFile {
  deviceId: string
  changes: ChangeRecord[]
  exportedAt: number
}

export class iCloudSync {
  private syncDir: string
  private syncInterval: ReturnType<typeof setInterval> | null = null
  private deviceId: string
  private lastSyncTime: number = 0

  constructor() {
    this.syncDir = join(
      homedir(),
      'Library/Mobile Documents/com~apple~CloudDocs/ZPaste'
    )
    this.deviceId = this.getDeviceId()
  }

  start(): void {
    if (this.syncInterval) return

    this.ensureSyncDir()
    this.fullSync()

    this.syncInterval = setInterval(() => {
      this.exportChanges()
      this.importChanges()
    }, 5 * 60 * 1000)
  }

  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  exportChanges(): void {
    try {
      this.ensureSyncDir()
      const items = repository.getItems({ limit: 2000 })
      const changes: ChangeRecord[] = items
        .filter((item) => item.updated_at > this.lastSyncTime)
        .map((item) => ({
          operation: 'add' as const,
          item,
          timestamp: item.updated_at,
          deviceId: this.deviceId
        }))

      if (changes.length === 0) return

      const syncFile: SyncFile = {
        deviceId: this.deviceId,
        changes,
        exportedAt: Date.now()
      }

      const filename = `sync_${this.deviceId}_${Date.now()}.json`
      writeFileSync(join(this.syncDir, filename), JSON.stringify(syncFile, null, 2), 'utf-8')
      this.lastSyncTime = Date.now()

      this.cleanupOldSyncFiles()
    } catch (error) {
      console.error('[iCloudSync] export error:', error)
    }
  }

  importChanges(): void {
    try {
      this.ensureSyncDir()
      const files = readdirSync(this.syncDir).filter(
        (f) => f.startsWith('sync_') && f.endsWith('.json') && !f.includes(this.deviceId)
      )

      for (const file of files) {
        try {
          const content = readFileSync(join(this.syncDir, file), 'utf-8')
          const syncFile: SyncFile = JSON.parse(content)

          for (const change of syncFile.changes) {
            this.applyChange(change)
          }

          unlinkSync(join(this.syncDir, file))
        } catch {
          console.error(`[iCloudSync] failed to import ${file}`)
        }
      }
    } catch (error) {
      console.error('[iCloudSync] import error:', error)
    }
  }

  fullSync(): void {
    try {
      this.exportChanges()
      this.importChanges()
      this.lastSyncTime = Date.now()
    } catch (error) {
      console.error('[iCloudSync] full sync error:', error)
    }
  }

  syncNow(): void {
    this.exportChanges()
    this.importChanges()
  }

  resolveConflict(localItem: ClipboardItem, remoteItem: ClipboardItem): ClipboardItem {
    if (remoteItem.updated_at > localItem.updated_at) {
      return remoteItem
    }
    return localItem
  }

  private applyChange(change: ChangeRecord): void {
    const { operation, item } = change

    switch (operation) {
      case 'add':
      case 'update': {
        const existing = repository.getItemByHash(item.content_hash)
        if (existing) {
          const winner = this.resolveConflict(existing, item)
          if (winner.id !== existing.id) {
            repository.deleteItem(existing.id)
            repository.insertItem(winner)
          }
        } else {
          const byId = repository.getItemById(item.id)
          if (byId) {
            const winner = this.resolveConflict(byId, item)
            if (winner.updated_at > byId.updated_at) {
              repository.deleteItem(byId.id)
              repository.insertItem(winner)
            }
          } else {
            repository.insertItem(item)
          }
        }
        break
      }
      case 'delete': {
        repository.deleteItem(item.id)
        break
      }
    }
  }

  private ensureSyncDir(): void {
    if (!existsSync(this.syncDir)) {
      mkdirSync(this.syncDir, { recursive: true })
    }
  }

  private getDeviceId(): string {
    const idFile = join(this.syncDir.replace('/ZPaste', ''), '.zpaste-device-id')
    try {
      if (existsSync(idFile)) {
        return readFileSync(idFile, 'utf-8').trim()
      }
    } catch {
      // ignore
    }

    const id = `device_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    try {
      const dir = join(this.syncDir.replace('/ZPaste', ''))
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      writeFileSync(idFile, id, 'utf-8')
    } catch {
      // ignore
    }
    return id
  }

  private cleanupOldSyncFiles(): void {
    try {
      const files = readdirSync(this.syncDir).filter(
        (f) => f.startsWith(`sync_${this.deviceId}_`) && f.endsWith('.json')
      )

      if (files.length > 5) {
        const sorted = files.sort()
        const toDelete = sorted.slice(0, files.length - 5)
        for (const file of toDelete) {
          unlinkSync(join(this.syncDir, file))
        }
      }
    } catch {
      // ignore
    }
  }
}
