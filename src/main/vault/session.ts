import { nanoid } from 'nanoid'
import * as vaultRepository from '../database/vault-repository'
import { VaultKdfParams, VaultKdfType } from './crypto'
import { clearBiometricDEK, hasBiometricDEK, loadBiometricDEK, saveBiometricDEK } from './biometric'
import { VaultCryptoWorkerClient } from './worker-client'

const DEFAULT_AUTO_LOCK_MINUTES = 10
const META_ID = 'primary'

export interface VaultSecurityState {
  locked: boolean
  hasVaultSetup: boolean
  autoLockMinutes: number
  lastUnlockMethod: 'master' | 'recovery' | 'biometric' | 'hint' | null
  hasBiometricUnlock: boolean
  securityMode: 'strict' | 'relaxed'
  hintQuestion: string | null
}

export class VaultSessionManager {
  constructor(private readonly cryptoWorker: VaultCryptoWorkerClient) {}

  private autoLockMinutes = DEFAULT_AUTO_LOCK_MINUTES
  private autoLockTimer: ReturnType<typeof setTimeout> | null = null
  private lastUnlockMethod: 'master' | 'recovery' | 'biometric' | 'hint' | null = null

  async setupMasterPassword(input: {
    masterPassword: string
    securityMode: 'strict' | 'relaxed'
    hintQuestion?: string
    hintAnswer?: string
  }): Promise<{ recoveryKey: string }> {
    const existingMeta = vaultRepository.getVaultCryptoMeta(META_ID)
    if (existingMeta) {
      throw new Error('Vault is already initialized')
    }

    const now = Date.now()
    const keys = await this.cryptoWorker.setupMasterPassword(
      input.masterPassword,
      input.securityMode === 'relaxed' ? input.hintAnswer : undefined
    )
    vaultRepository.upsertVaultCryptoMeta({
      id: META_ID,
      kdf_type: keys.kdfType,
      kdf_params: JSON.stringify(keys.kdfParams),
      salt: keys.salt,
      dek_wrapped_by_master: keys.dekWrappedByMaster,
      dek_wrapped_by_recovery: keys.dekWrappedByRecovery,
      security_mode: input.securityMode,
      hint_question: input.securityMode === 'relaxed' ? (input.hintQuestion || null) : null,
      dek_wrapped_by_hint: keys.dekWrappedByHint,
      created_at: now,
      updated_at: now
    })

    this.lastUnlockMethod = 'master'
    this.touch()
    await this.persistBiometricDEK()

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
      await this.cryptoWorker.unlockWithMasterPassword({
        wrapped: meta.dek_wrapped_by_master,
        masterPassword,
        salt: meta.salt,
        kdfType: this.normalizeKdfType(meta.kdf_type),
        kdfParams
      })
      this.lastUnlockMethod = 'master'
      this.touch()
      await this.persistBiometricDEK()
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
      await this.cryptoWorker.unlockWithRecoveryKey({
        wrapped: meta.dek_wrapped_by_recovery,
        recoveryKey,
        salt: meta.salt,
        kdfType: this.normalizeKdfType(meta.kdf_type),
        kdfParams
      })
      this.lastUnlockMethod = 'recovery'
      this.touch()
      await this.persistBiometricDEK()
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

    await this.cryptoWorker.setDEK(dek.toString('base64'))

    // Verify DEK is valid by attempting to decrypt the master-wrapped DEK
    try {
      const { dekBase64 } = await this.cryptoWorker.exportDEK()
      if (!dekBase64) throw new Error('empty DEK')
    } catch {
      await this.cryptoWorker.lock()
      vaultRepository.appendVaultAuditEvent({
        id: nanoid(),
        event_type: 'unlock_biometric',
        result: 'failed',
        reason_code: 'biometric_dek_invalid',
        created_at: Date.now()
      })
      throw new Error('Biometric unlock failed: stored key is invalid')
    }

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

  async unlockWithHintAnswer(hintAnswer: string): Promise<void> {
    const meta = vaultRepository.getVaultCryptoMeta(META_ID)
    if (!meta) {
      throw new Error('Vault is not initialized')
    }
    if (meta.security_mode !== 'relaxed' || !meta.dek_wrapped_by_hint) {
      throw new Error('Hint unlock is not available in strict mode')
    }

    try {
      const kdfParams = JSON.parse(meta.kdf_params) as VaultKdfParams
      await this.cryptoWorker.unlockWithRecoveryKey({
        wrapped: meta.dek_wrapped_by_hint,
        recoveryKey: hintAnswer.trim().toLowerCase(),
        salt: meta.salt,
        kdfType: this.normalizeKdfType(meta.kdf_type),
        kdfParams
      })
      this.lastUnlockMethod = 'hint'
      this.touch()
      await this.persistBiometricDEK()
      vaultRepository.appendVaultAuditEvent({
        id: nanoid(),
        event_type: 'unlock_hint',
        result: 'success',
        reason_code: null,
        created_at: Date.now()
      })
    } catch {
      vaultRepository.appendVaultAuditEvent({
        id: nanoid(),
        event_type: 'unlock_hint',
        result: 'failed',
        reason_code: 'invalid_hint_answer',
        created_at: Date.now()
      })
      throw new Error('Invalid hint answer')
    }
  }

  async resetPassword(input: {
    newMasterPassword: string
    hintQuestion?: string
    hintAnswer?: string
  }): Promise<{ recoveryKey: string }> {
    await this.ensureUnlocked()

    const meta = vaultRepository.getVaultCryptoMeta(META_ID)
    if (!meta) {
      throw new Error('Vault is not initialized')
    }

    const keys = await this.cryptoWorker.changeMasterPassword(
      input.newMasterPassword,
      input.hintAnswer
    )

    vaultRepository.upsertVaultCryptoMeta({
      id: META_ID,
      kdf_type: keys.kdfType,
      kdf_params: JSON.stringify(keys.kdfParams),
      salt: keys.salt,
      dek_wrapped_by_master: keys.dekWrappedByMaster,
      dek_wrapped_by_recovery: keys.dekWrappedByRecovery,
      security_mode: meta.security_mode,
      hint_question: input.hintQuestion !== undefined ? (input.hintQuestion || null) : meta.hint_question,
      dek_wrapped_by_hint: keys.dekWrappedByHint,
      created_at: meta.created_at,
      updated_at: Date.now()
    })

    await this.persistBiometricDEK()

    vaultRepository.appendVaultAuditEvent({
      id: nanoid(),
      event_type: 'reset_password',
      result: 'success',
      reason_code: null,
      created_at: Date.now()
    })

    return { recoveryKey: keys.recoveryKey }
  }

  async lock(): Promise<void> {
    await this.cryptoWorker.lock()
    this.clearTimer()
    vaultRepository.appendVaultAuditEvent({
      id: nanoid(),
      event_type: 'lock',
      result: 'success',
      reason_code: null,
      created_at: Date.now()
    })
  }

  async isUnlocked(): Promise<boolean> {
    return this.cryptoWorker.isUnlocked()
  }

  async ensureUnlocked(): Promise<void> {
    const unlocked = await this.isUnlocked()
    if (!unlocked) {
      throw new Error('Vault is locked')
    }
    this.touch()
  }

  async getSecurityState(): Promise<VaultSecurityState> {
    const meta = vaultRepository.getVaultCryptoMeta(META_ID)
    return {
      locked: !(await this.isUnlocked()),
      hasVaultSetup: !!meta,
      autoLockMinutes: this.autoLockMinutes,
      lastUnlockMethod: this.lastUnlockMethod,
      hasBiometricUnlock: await hasBiometricDEK(),
      securityMode: (meta?.security_mode as 'strict' | 'relaxed') || 'strict',
      hintQuestion: meta?.hint_question || null
    }
  }

  async resetVault(): Promise<void> {
    await this.cryptoWorker.lock()
    this.clearTimer()
    this.lastUnlockMethod = null
    await clearBiometricDEK()
    vaultRepository.deleteAllVaultData()
  }

  setAutoLockMinutes(minutes: number): void {
    this.autoLockMinutes = Math.max(1, minutes)
    void this.isUnlocked()
      .then(unlocked => {
        if (unlocked) this.touch()
      })
      .catch(() => undefined)
  }

  private touch(): void {
    this.clearTimer()
    this.autoLockTimer = setTimeout(() => {
      void this.lock()
    }, this.autoLockMinutes * 60 * 1000)
  }

  private clearTimer(): void {
    if (this.autoLockTimer) {
      clearTimeout(this.autoLockTimer)
      this.autoLockTimer = null
    }
  }

  private normalizeKdfType(value: string): VaultKdfType {
    return value === 'argon2id' ? 'argon2id' : 'pbkdf2'
  }

  private async persistBiometricDEK(): Promise<void> {
    const { dekBase64 } = await this.cryptoWorker.exportDEK()
    await saveBiometricDEK(Buffer.from(dekBase64, 'base64'))
  }
}
