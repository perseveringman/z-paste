import { randomBytes } from 'crypto'
import {
  VaultKdfParams,
  VaultKdfType,
  decryptVaultPayload,
  encryptVaultPayload,
  setupVaultKeys,
  unwrapDEKWithMasterPassword,
  unwrapDEKWithRecoveryKey
} from './crypto'

type WorkerAction =
  | 'setupMasterPassword'
  | 'unlockWithMasterPassword'
  | 'unlockWithRecoveryKey'
  | 'setDEK'
  | 'exportDEK'
  | 'lock'
  | 'isUnlocked'
  | 'encryptItemPayload'
  | 'decryptItemPayload'
  | 'reencryptItemPayload'
  | 'shutdown'

interface WorkerRequest {
  id: number
  action: WorkerAction
  payload?: Record<string, unknown>
}

type WorkerResponse =
  | {
      id: number
      ok: true
      result?: unknown
    }
  | {
      id: number
      ok: false
      error: string
    }

let activeDEK: Buffer | null = null

function getActiveDEKOrThrow(): Buffer {
  if (!activeDEK) {
    throw new Error('Vault is locked')
  }
  return activeDEK
}

function normalizeKdfType(value: unknown): VaultKdfType {
  if (value === 'argon2id' || value === 'pbkdf2') {
    return value
  }
  return 'pbkdf2'
}

function asString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid ${fieldName}`)
  }
  return value
}

function asKdfParams(value: unknown): VaultKdfParams {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid kdf params')
  }
  return value as VaultKdfParams
}

async function handleRequest(request: WorkerRequest): Promise<unknown> {
  const payload = request.payload ?? {}

  switch (request.action) {
    case 'setupMasterPassword': {
      const masterPassword = asString(payload.masterPassword, 'master password')
      const keys = await setupVaultKeys(masterPassword)
      activeDEK = keys.dek
      return {
        salt: keys.salt,
        kdfType: keys.kdfType,
        kdfParams: keys.kdfParams,
        dekWrappedByMaster: keys.dekWrappedByMaster,
        dekWrappedByRecovery: keys.dekWrappedByRecovery,
        recoveryKey: keys.recoveryKey
      }
    }

    case 'unlockWithMasterPassword': {
      const wrapped = asString(payload.wrapped, 'wrapped key')
      const masterPassword = asString(payload.masterPassword, 'master password')
      const salt = asString(payload.salt, 'salt')
      const kdfType = normalizeKdfType(payload.kdfType)
      const kdfParams = asKdfParams(payload.kdfParams)
      activeDEK = await unwrapDEKWithMasterPassword(wrapped, masterPassword, salt, kdfType, kdfParams)
      return { ok: true }
    }

    case 'unlockWithRecoveryKey': {
      const wrapped = asString(payload.wrapped, 'wrapped key')
      const recoveryKey = asString(payload.recoveryKey, 'recovery key')
      const salt = asString(payload.salt, 'salt')
      const kdfType = normalizeKdfType(payload.kdfType)
      const kdfParams = asKdfParams(payload.kdfParams)
      activeDEK = await unwrapDEKWithRecoveryKey(wrapped, recoveryKey, salt, kdfType, kdfParams)
      return { ok: true }
    }

    case 'setDEK': {
      const dekBase64 = asString(payload.dekBase64, 'dek')
      activeDEK = Buffer.from(dekBase64, 'base64')
      return { ok: true }
    }

    case 'exportDEK': {
      return { dekBase64: getActiveDEKOrThrow().toString('base64') }
    }

    case 'lock': {
      if (activeDEK) {
        activeDEK.fill(0)
      }
      activeDEK = null
      return { ok: true }
    }

    case 'isUnlocked': {
      return { unlocked: activeDEK !== null }
    }

    case 'encryptItemPayload': {
      const plaintext = asString(payload.plaintext, 'plaintext')
      const itemKey = randomBytes(32)
      return {
        encryptedPayload: encryptVaultPayload(plaintext, itemKey),
        wrappedItemKey: encryptVaultPayload(itemKey.toString('base64'), getActiveDEKOrThrow()),
        encVersion: 1
      }
    }

    case 'decryptItemPayload': {
      const encryptedPayload = asString(payload.encryptedPayload, 'encrypted payload')
      const wrappedItemKey = asString(payload.wrappedItemKey, 'wrapped item key')
      const itemKeyB64 = decryptVaultPayload(wrappedItemKey, getActiveDEKOrThrow())
      const itemKey = Buffer.from(itemKeyB64, 'base64')
      return { plaintext: decryptVaultPayload(encryptedPayload, itemKey) }
    }

    case 'reencryptItemPayload': {
      const plaintext = asString(payload.plaintext, 'plaintext')
      const wrappedItemKey = asString(payload.wrappedItemKey, 'wrapped item key')
      const itemKeyB64 = decryptVaultPayload(wrappedItemKey, getActiveDEKOrThrow())
      const itemKey = Buffer.from(itemKeyB64, 'base64')
      return { encryptedPayload: encryptVaultPayload(plaintext, itemKey) }
    }

    case 'shutdown': {
      setImmediate(() => process.exit(0))
      return { ok: true }
    }

    default:
      throw new Error('Unsupported vault worker action')
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return 'Vault worker request failed'
}

process.on('message', async (raw: unknown) => {
  if (!raw || typeof raw !== 'object') {
    return
  }
  const request = raw as WorkerRequest
  if (typeof request.id !== 'number' || typeof request.action !== 'string') {
    return
  }

  try {
    const result = await handleRequest(request)
    const response: WorkerResponse = { id: request.id, ok: true, result }
    process.send?.(response)
  } catch (error) {
    const response: WorkerResponse = { id: request.id, ok: false, error: getErrorMessage(error) }
    process.send?.(response)
  }
})

process.on('disconnect', () => {
  process.exit(0)
})
