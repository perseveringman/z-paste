import { nanoid } from 'nanoid'
import * as vaultRepository from '../database/vault-repository'
import {
  VaultKdfParams,
  setupVaultKeys,
  unwrapDEKWithMasterPassword,
  unwrapDEKWithRecoveryKey
} from './crypto'
import { hasBiometricDEK, loadBiometricDEK, saveBiometricDEK } from './biometric'

const DEFAULT_AUTO_LOCK_MINUTES = 10
const META_ID = 'primary'

export interface VaultSecurityState {
  locked: boolean
  hasVaultSetup: boolean
  autoLockMinutes: number
  lastUnlockMethod: 'master' | 'recovery' | 'biometric' | null
  hasBiometricUnlock: boolean
}

export class VaultSessionManager {
  private dek: Buffer | null = null
  private autoLockMinutes = DEFAULT_AUTO_LOCK_MINUTES
  private autoLockTimer: ReturnType<typeof setTimeout> | null = null
  private lastUnlockMethod: 'master' | 'recovery' | 'biometric' | null = null

  async setupMasterPassword(masterPassword: string): Promise<{ recoveryKey: string }> {
    const existingMeta = vaultRepository.getVaultCryptoMeta(META_ID)
    if (existingMeta) {
      throw new Error('Vault is already initialized')
    }

    const now = Date.now()
    const keys = setupVaultKeys(masterPassword)
    vaultRepository.upsertVaultCryptoMeta({
      id: META_ID,
      kdf_type: keys.kdfType,
      kdf_params: JSON.stringify(keys.kdfParams),
      salt: keys.salt,
      dek_wrapped_by_master: keys.dekWrappedByMaster,
      dek_wrapped_by_recovery: keys.dekWrappedByRecovery,
      created_at: now,
      updated_at: now
    })

    this.dek = keys.dek
    this.lastUnlockMethod = 'master'
    this.touch()
    await saveBiometricDEK(keys.dek)

    vaultRepository.appendVaultAuditEvent({
      id: nanoid(),
      event_type: 'setup',
      result: 'success',
      reason_code: null,
      created_at: now
    })

    return { recoveryKey: keys.recoveryKey }
  }

  async unlockWithMasterPassword(masterPassword: string): Promise<void> {
    const meta = vaultRepository.getVaultCryptoMeta(META_ID)
    if (!meta) {
      throw new Error('Vault is not initialized')
    }

    try {
      const kdfParams = JSON.parse(meta.kdf_params) as VaultKdfParams
      this.dek = unwrapDEKWithMasterPassword(
        meta.dek_wrapped_by_master,
        masterPassword,
        meta.salt,
        kdfParams
      )
      this.lastUnlockMethod = 'master'
      this.touch()
      await saveBiometricDEK(this.dek)
      vaultRepository.appendVaultAuditEvent({
        id: nanoid(),
        event_type: 'unlock',
        result: 'success',
        reason_code: null,
        created_at: Date.now()
      })
    } catch {
      vaultRepository.appendVaultAuditEvent({
        id: nanoid(),
        event_type: 'unlock',
        result: 'failed',
        reason_code: 'invalid_master_password',
        created_at: Date.now()
      })
      throw new Error('Invalid master password')
    }
  }

  async unlockWithRecoveryKey(recoveryKey: string): Promise<void> {
    const meta = vaultRepository.getVaultCryptoMeta(META_ID)
    if (!meta) {
      throw new Error('Vault is not initialized')
    }

    try {
      const kdfParams = JSON.parse(meta.kdf_params) as VaultKdfParams
      this.dek = unwrapDEKWithRecoveryKey(
        meta.dek_wrapped_by_recovery,
        recoveryKey,
        meta.salt,
        kdfParams
      )
      this.lastUnlockMethod = 'recovery'
      this.touch()
      await saveBiometricDEK(this.dek)
      vaultRepository.appendVaultAuditEvent({
        id: nanoid(),
        event_type: 'unlock_recovery',
        result: 'success',
        reason_code: null,
        created_at: Date.now()
      })
    } catch {
      vaultRepository.appendVaultAuditEvent({
        id: nanoid(),
        event_type: 'unlock_recovery',
        result: 'failed',
        reason_code: 'invalid_recovery_key',
        created_at: Date.now()
      })
      throw new Error('Invalid recovery key')
    }
  }

  async unlockWithBiometric(): Promise<void> {
    const meta = vaultRepository.getVaultCryptoMeta(META_ID)
    if (!meta) {
      throw new Error('Vault is not initialized')
    }

    const dek = await loadBiometricDEK()
    if (!dek) {
      vaultRepository.appendVaultAuditEvent({
        id: nanoid(),
        event_type: 'unlock_biometric',
        result: 'failed',
        reason_code: 'biometric_material_not_found',
        created_at: Date.now()
      })
      throw new Error('Biometric unlock is not available')
    }

    this.dek = dek
    this.lastUnlockMethod = 'biometric'
    this.touch()
    vaultRepository.appendVaultAuditEvent({
      id: nanoid(),
      event_type: 'unlock_biometric',
      result: 'success',
      reason_code: null,
      created_at: Date.now()
    })
  }

  lock(): void {
    this.dek = null
    this.clearTimer()
    vaultRepository.appendVaultAuditEvent({
      id: nanoid(),
      event_type: 'lock',
      result: 'success',
      reason_code: null,
      created_at: Date.now()
    })
  }

  isUnlocked(): boolean {
    return this.dek !== null
  }

  getDEKOrThrow(): Buffer {
    if (!this.dek) {
      throw new Error('Vault is locked')
    }
    this.touch()
    return this.dek
  }

  async getSecurityState(): Promise<VaultSecurityState> {
    return {
      locked: !this.isUnlocked(),
      hasVaultSetup: !!vaultRepository.getVaultCryptoMeta(META_ID),
      autoLockMinutes: this.autoLockMinutes,
      lastUnlockMethod: this.lastUnlockMethod,
      hasBiometricUnlock: await hasBiometricDEK()
    }
  }

  setAutoLockMinutes(minutes: number): void {
    this.autoLockMinutes = Math.max(1, minutes)
    if (this.isUnlocked()) {
      this.touch()
    }
  }

  private touch(): void {
    this.clearTimer()
    this.autoLockTimer = setTimeout(() => {
      this.lock()
    }, this.autoLockMinutes * 60 * 1000)
  }

  private clearTimer(): void {
    if (this.autoLockTimer) {
      clearTimeout(this.autoLockTimer)
      this.autoLockTimer = null
    }
  }
}
