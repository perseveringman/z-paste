import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'crypto'
import { hashRaw } from '@node-rs/argon2'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 12
const DEFAULT_PBKDF2_ITERATIONS = 210000
const DEFAULT_PBKDF2_DIGEST = 'sha512'
const DEFAULT_ARGON2_MEMORY_KIB = 19456
const DEFAULT_ARGON2_TIME_COST = 3
const DEFAULT_ARGON2_PARALLELISM = 1

export interface VaultWrappedData {
  ciphertext: string
  iv: string
  tag: string
}

export interface VaultPbkdf2Params {
  iterations: number
  digest: string
}

export interface VaultArgon2idParams {
  memoryCost: number
  timeCost: number
  parallelism: number
  outputLen: number
}

export type VaultKdfParams = VaultPbkdf2Params | VaultArgon2idParams

export type VaultKdfType = 'argon2id' | 'pbkdf2'

export interface VaultSetupResult {
  salt: string
  kdfType: VaultKdfType
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

function isPbkdf2Params(params: VaultKdfParams): params is VaultPbkdf2Params {
  return 'iterations' in params && 'digest' in params
}

export async function deriveKey(
  secret: string,
  salt: Buffer,
  kdfType: VaultKdfType,
  params: VaultKdfParams
): Promise<Buffer> {
  if (kdfType === 'pbkdf2') {
    const pbkdf2Params = isPbkdf2Params(params)
      ? params
      : { iterations: DEFAULT_PBKDF2_ITERATIONS, digest: DEFAULT_PBKDF2_DIGEST }
    return pbkdf2Sync(secret, salt, pbkdf2Params.iterations, KEY_LENGTH, pbkdf2Params.digest)
  }

  const argon2Params: VaultArgon2idParams = isPbkdf2Params(params)
    ? {
        memoryCost: DEFAULT_ARGON2_MEMORY_KIB,
        timeCost: DEFAULT_ARGON2_TIME_COST,
        parallelism: DEFAULT_ARGON2_PARALLELISM,
        outputLen: KEY_LENGTH
      }
    : params

  return hashRaw(secret, {
    salt,
    // @node-rs/argon2 exports const enum, use literal for isolatedModules compatibility.
    algorithm: 2,
    memoryCost: argon2Params.memoryCost,
    timeCost: argon2Params.timeCost,
    parallelism: argon2Params.parallelism,
    outputLen: argon2Params.outputLen
  })
}

export function generateRecoveryKey(): string {
  return randomBytes(16)
    .toString('hex')
    .toUpperCase()
    .match(/.{1,4}/g)!
    .join('-')
}

export async function setupVaultKeys(masterPassword: string): Promise<VaultSetupResult> {
  const salt = randomBytes(32)
  const kdfParams: VaultArgon2idParams = {
    memoryCost: DEFAULT_ARGON2_MEMORY_KIB,
    timeCost: DEFAULT_ARGON2_TIME_COST,
    parallelism: DEFAULT_ARGON2_PARALLELISM,
    outputLen: KEY_LENGTH
  }
  const kdfType: VaultKdfType = 'argon2id'
  const recoveryKey = generateRecoveryKey()
  const dek = randomBytes(KEY_LENGTH)

  const masterKey = await deriveKey(masterPassword, salt, kdfType, kdfParams)
  const recoveryDerivedKey = await deriveKey(recoveryKey, salt, kdfType, kdfParams)

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

export async function unwrapDEKWithMasterPassword(
  wrapped: string,
  masterPassword: string,
  saltB64: string,
  kdfType: VaultKdfType,
  kdfParams: VaultKdfParams
): Promise<Buffer> {
  const key = await deriveKey(masterPassword, Buffer.from(saltB64, 'base64'), kdfType, kdfParams)
  const payload = JSON.parse(wrapped) as VaultWrappedData
  return decryptBuffer(payload, key)
}

export async function unwrapDEKWithRecoveryKey(
  wrapped: string,
  recoveryKey: string,
  saltB64: string,
  kdfType: VaultKdfType,
  kdfParams: VaultKdfParams
): Promise<Buffer> {
  const key = await deriveKey(recoveryKey, Buffer.from(saltB64, 'base64'), kdfType, kdfParams)
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
