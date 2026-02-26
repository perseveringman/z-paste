import { randomBytes } from 'crypto'
import { nanoid } from 'nanoid'
import * as vaultRepository from '../database/vault-repository'
import { decryptVaultPayload, encryptVaultPayload } from './crypto'
import { VaultSessionManager } from './session'
import { generatePassword, PasswordGenerateOptions } from './password-generator'
import { generateTotpCode } from './totp'

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

export interface CreateSecureNoteInput {
  title: string
  content: string
  favorite?: boolean
  tags?: string[] | null
}

export type VaultItemDetail =
  | {
      meta: vaultRepository.VaultItemMeta
      type: 'login'
      fields: {
        username: string
        password: string
        notes: string | null
        totpSecret: string | null
      }
    }
  | {
      meta: vaultRepository.VaultItemMeta
      type: 'secure_note'
      fields: {
        content: string
      }
    }

export class VaultService {
  constructor(private readonly session: VaultSessionManager) {}

  listItems(options?: { query?: string; type?: vaultRepository.VaultItemType; limit?: number; offset?: number }) {
    this.session.getDEKOrThrow()
    return vaultRepository.listVaultItems(options)
  }

  createLogin(input: CreateLoginInput): vaultRepository.VaultItemMeta {
    const now = Date.now()
    const id = nanoid()
    const itemKey = randomBytes(32)
    const dek = this.session.getDEKOrThrow()
    const payload = {
      username: input.username,
      password: input.password,
      notes: input.notes || null,
      totpSecret: input.totpSecret || null
    }

    const meta: vaultRepository.VaultItemMeta = {
      id,
      type: 'login',
      title: input.title.trim(),
      website: input.website || null,
      favorite: input.favorite ? 1 : 0,
      tags: input.tags ? JSON.stringify(input.tags) : null,
      created_at: now,
      updated_at: now,
      last_used_at: null
    }
    const secret: vaultRepository.VaultItemSecret = {
      item_id: id,
      encrypted_payload: encryptVaultPayload(JSON.stringify(payload), itemKey),
      wrapped_item_key: encryptVaultPayload(itemKey.toString('base64'), dek),
      enc_version: 1
    }

    vaultRepository.insertVaultItem(meta, secret)
    return meta
  }

  createSecureNote(input: CreateSecureNoteInput): vaultRepository.VaultItemMeta {
    const now = Date.now()
    const id = nanoid()
    const itemKey = randomBytes(32)
    const dek = this.session.getDEKOrThrow()
    const payload = {
      content: input.content
    }

    const meta: vaultRepository.VaultItemMeta = {
      id,
      type: 'secure_note',
      title: input.title.trim(),
      website: null,
      favorite: input.favorite ? 1 : 0,
      tags: input.tags ? JSON.stringify(input.tags) : null,
      created_at: now,
      updated_at: now,
      last_used_at: null
    }
    const secret: vaultRepository.VaultItemSecret = {
      item_id: id,
      encrypted_payload: encryptVaultPayload(JSON.stringify(payload), itemKey),
      wrapped_item_key: encryptVaultPayload(itemKey.toString('base64'), dek),
      enc_version: 1
    }

    vaultRepository.insertVaultItem(meta, secret)
    return meta
  }

  getItemDetail(id: string): VaultItemDetail | null {
    const dek = this.session.getDEKOrThrow()
    const meta = vaultRepository.getVaultItemMetaById(id)
    if (!meta) return null
    const secret = vaultRepository.getVaultItemSecretById(id)
    if (!secret) return null

    const itemKeyB64 = decryptVaultPayload(secret.wrapped_item_key, dek)
    const itemKey = Buffer.from(itemKeyB64, 'base64')
    const payloadRaw = decryptVaultPayload(secret.encrypted_payload, itemKey)
    const payload = JSON.parse(payloadRaw) as Record<string, unknown>

    vaultRepository.updateVaultItem(id, {
      last_used_at: Date.now(),
      updated_at: Date.now()
    })

    if (meta.type === 'login') {
      return {
        meta,
        type: 'login',
        fields: {
          username: String(payload.username || ''),
          password: String(payload.password || ''),
          notes: payload.notes ? String(payload.notes) : null,
          totpSecret: payload.totpSecret ? String(payload.totpSecret) : null
        }
      }
    }

    return {
      meta,
      type: 'secure_note',
      fields: {
        content: String(payload.content || '')
      }
    }
  }

  updateItem(input: {
    id: string
    title?: string
    website?: string | null
    favorite?: boolean
    tags?: string[] | null
    loginFields?: {
      username: string
      password: string
      notes?: string | null
      totpSecret?: string | null
    }
    secureNoteFields?: {
      content: string
    }
  }): void {
    const meta = vaultRepository.getVaultItemMetaById(input.id)
    if (!meta) {
      throw new Error('Vault item not found')
    }

    const updates: Partial<
      Pick<vaultRepository.VaultItemMeta, 'title' | 'website' | 'favorite' | 'tags' | 'updated_at'>
    > = {
      updated_at: Date.now()
    }

    if (input.title !== undefined) updates.title = input.title.trim()
    if (input.website !== undefined) updates.website = input.website
    if (input.favorite !== undefined) updates.favorite = input.favorite ? 1 : 0
    if (input.tags !== undefined) updates.tags = input.tags ? JSON.stringify(input.tags) : null

    let secretUpdates:
      | Partial<Pick<vaultRepository.VaultItemSecret, 'encrypted_payload' | 'wrapped_item_key' | 'enc_version'>>
      | undefined

    if (input.loginFields || input.secureNoteFields) {
      const dek = this.session.getDEKOrThrow()
      const existingSecret = vaultRepository.getVaultItemSecretById(input.id)
      if (!existingSecret) {
        throw new Error('Vault item secret not found')
      }
      const itemKeyB64 = decryptVaultPayload(existingSecret.wrapped_item_key, dek)
      const itemKey = Buffer.from(itemKeyB64, 'base64')

      const payload =
        meta.type === 'login'
          ? {
              username: input.loginFields?.username || '',
              password: input.loginFields?.password || '',
              notes: input.loginFields?.notes || null,
              totpSecret: input.loginFields?.totpSecret || null
            }
          : {
              content: input.secureNoteFields?.content || ''
            }

      secretUpdates = {
        encrypted_payload: encryptVaultPayload(JSON.stringify(payload), itemKey),
        enc_version: existingSecret.enc_version
      }
    }

    vaultRepository.updateVaultItem(input.id, updates, secretUpdates)
  }

  deleteItem(id: string): void {
    this.session.getDEKOrThrow()
    vaultRepository.deleteVaultItem(id)
  }

  generatePassword(options?: PasswordGenerateOptions): string {
    this.session.getDEKOrThrow()
    return generatePassword(options)
  }

  getTotpCode(itemId: string): { code: string; remainingSeconds: number } | null {
    this.session.getDEKOrThrow()
    const detail = this.getItemDetail(itemId)
    if (!detail || detail.type !== 'login') return null
    if (!detail.fields.totpSecret) return null
    return generateTotpCode(detail.fields.totpSecret)
  }
}
