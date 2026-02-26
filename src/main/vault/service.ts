import { nanoid } from 'nanoid'
import * as vaultRepository from '../database/vault-repository'
import { VaultSessionManager } from './session'
import { generatePassword, PasswordGenerateOptions } from './password-generator'
import { generateTotpCode } from './totp'
import { VaultCryptoWorkerClient } from './worker-client'

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
  constructor(
    private readonly session: VaultSessionManager,
    private readonly cryptoWorker: VaultCryptoWorkerClient
  ) {}

  async listItems(options?: {
    query?: string
    type?: vaultRepository.VaultItemType
    limit?: number
    offset?: number
  }): Promise<vaultRepository.VaultItemMeta[]> {
    await this.session.ensureUnlocked()
    return vaultRepository.listVaultItems(options)
  }

  async createLogin(input: CreateLoginInput): Promise<vaultRepository.VaultItemMeta> {
    await this.session.ensureUnlocked()
    const now = Date.now()
    const id = nanoid()
    const payload = {
      username: input.username,
      password: input.password,
      notes: input.notes || null,
      totpSecret: input.totpSecret || null
    }
    const encrypted = await this.cryptoWorker.encryptItemPayload(JSON.stringify(payload))

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
      encrypted_payload: encrypted.encryptedPayload,
      wrapped_item_key: encrypted.wrappedItemKey,
      enc_version: encrypted.encVersion
    }

    vaultRepository.insertVaultItem(meta, secret)
    return meta
  }

  async createSecureNote(input: CreateSecureNoteInput): Promise<vaultRepository.VaultItemMeta> {
    await this.session.ensureUnlocked()
    const now = Date.now()
    const id = nanoid()
    const payload = {
      content: input.content
    }
    const encrypted = await this.cryptoWorker.encryptItemPayload(JSON.stringify(payload))

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
      encrypted_payload: encrypted.encryptedPayload,
      wrapped_item_key: encrypted.wrappedItemKey,
      enc_version: encrypted.encVersion
    }

    vaultRepository.insertVaultItem(meta, secret)
    return meta
  }

  async getItemDetail(id: string): Promise<VaultItemDetail | null> {
    await this.session.ensureUnlocked()
    const meta = vaultRepository.getVaultItemMetaById(id)
    if (!meta) return null
    const secret = vaultRepository.getVaultItemSecretById(id)
    if (!secret) return null

    const { plaintext } = await this.cryptoWorker.decryptItemPayload({
      encryptedPayload: secret.encrypted_payload,
      wrappedItemKey: secret.wrapped_item_key
    })
    const payload = JSON.parse(plaintext) as Record<string, unknown>

    vaultRepository.updateVaultItem(id, {
      last_used_at: Date.now()
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

  async updateItem(input: {
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
  }): Promise<void> {
    await this.session.ensureUnlocked()
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
      const existingSecret = vaultRepository.getVaultItemSecretById(input.id)
      if (!existingSecret) {
        throw new Error('Vault item secret not found')
      }

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

      const encrypted = await this.cryptoWorker.reencryptItemPayload({
        wrappedItemKey: existingSecret.wrapped_item_key,
        plaintext: JSON.stringify(payload)
      })

      secretUpdates = {
        encrypted_payload: encrypted.encryptedPayload,
        enc_version: existingSecret.enc_version
      }
    }

    vaultRepository.updateVaultItem(input.id, updates, secretUpdates)
  }

  async deleteItem(id: string): Promise<void> {
    await this.session.ensureUnlocked()
    vaultRepository.deleteVaultItem(id)
  }

  async generatePassword(options?: PasswordGenerateOptions): Promise<string> {
    await this.session.ensureUnlocked()
    return generatePassword(options)
  }

  async getTotpCode(itemId: string): Promise<{ code: string; remainingSeconds: number } | null> {
    const detail = await this.getItemDetail(itemId)
    if (!detail || detail.type !== 'login') return null
    if (!detail.fields.totpSecret) return null
    return generateTotpCode(detail.fields.totpSecret)
  }
}
