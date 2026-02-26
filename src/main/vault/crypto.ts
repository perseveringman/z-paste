import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 12
const DEFAULT_ITERATIONS = 210000
const DEFAULT_DIGEST = 'sha512'

export interface VaultWrappedData {
  ciphertext: string
  iv: string
  tag: string
}

export interface VaultKdfParams {
  iterations: number
  digest: string
}

export interface VaultSetupResult {
  salt: string
  kdfType: string
  kdfParams: VaultKdfParams
  dekWrappedByMaster: string
  dekWrappedByRecovery: string
  recoveryKey: string
  dek: Buffer
}

function encryptBuffer(plaintext: Buffer, key: Buffer): VaultWrappedData {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64')
  }
}

function decryptBuffer(payload: VaultWrappedData, key: Buffer): Buffer {
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(payload.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final()
  ])
}

export function deriveKey(secret: string, salt: Buffer, params: VaultKdfParams): Buffer {
  return pbkdf2Sync(secret, salt, params.iterations, KEY_LENGTH, params.digest)
}

export function generateRecoveryKey(): string {
  return randomBytes(16)
    .toString('hex')
    .toUpperCase()
    .match(/.{1,4}/g)!
    .join('-')
}

export function setupVaultKeys(masterPassword: string): VaultSetupResult {
  const salt = randomBytes(32)
  const kdfParams: VaultKdfParams = {
    iterations: DEFAULT_ITERATIONS,
    digest: DEFAULT_DIGEST
  }
  const kdfType = 'pbkdf2'
  const recoveryKey = generateRecoveryKey()
  const dek = randomBytes(KEY_LENGTH)

  const masterKey = deriveKey(masterPassword, salt, kdfParams)
  const recoveryDerivedKey = deriveKey(recoveryKey, salt, kdfParams)

  const dekWrappedByMaster = JSON.stringify(encryptBuffer(dek, masterKey))
  const dekWrappedByRecovery = JSON.stringify(encryptBuffer(dek, recoveryDerivedKey))

  return {
    salt: salt.toString('base64'),
    kdfType,
    kdfParams,
    dekWrappedByMaster,
    dekWrappedByRecovery,
    recoveryKey,
    dek
  }
}

export function unwrapDEKWithMasterPassword(
  wrapped: string,
  masterPassword: string,
  saltB64: string,
  kdfParams: VaultKdfParams
): Buffer {
  const key = deriveKey(masterPassword, Buffer.from(saltB64, 'base64'), kdfParams)
  const payload = JSON.parse(wrapped) as VaultWrappedData
  return decryptBuffer(payload, key)
}

export function unwrapDEKWithRecoveryKey(
  wrapped: string,
  recoveryKey: string,
  saltB64: string,
  kdfParams: VaultKdfParams
): Buffer {
  const key = deriveKey(recoveryKey, Buffer.from(saltB64, 'base64'), kdfParams)
  const payload = JSON.parse(wrapped) as VaultWrappedData
  return decryptBuffer(payload, key)
}

export function encryptVaultPayload(plaintext: string, dek: Buffer): string {
  return JSON.stringify(encryptBuffer(Buffer.from(plaintext, 'utf8'), dek))
}

export function decryptVaultPayload(encrypted: string, dek: Buffer): string {
  const payload = JSON.parse(encrypted) as VaultWrappedData
  return decryptBuffer(payload, dek).toString('utf8')
}

