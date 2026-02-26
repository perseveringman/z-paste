import { ChildProcess, fork } from 'child_process'
import { join } from 'path'
import { VaultKdfParams, VaultKdfType } from './crypto'

interface WorkerSuccessResponse {
  id: number
  ok: true
  result?: unknown
}

interface WorkerErrorResponse {
  id: number
  ok: false
  error: string
}

type WorkerResponse = WorkerSuccessResponse | WorkerErrorResponse

interface PendingRequest<T> {
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
}

export interface WorkerSetupResult {
  salt: string
  kdfType: VaultKdfType
  kdfParams: VaultKdfParams
  dekWrappedByMaster: string
  dekWrappedByRecovery: string
  recoveryKey: string
  dekWrappedByHint: string | null
}

export class VaultCryptoWorkerClient {
  private workerProcess: ChildProcess | null = null
  private requestId = 0
  private pending = new Map<number, PendingRequest<unknown>>()

  private ensureWorkerStarted(): ChildProcess {
    if (this.workerProcess && this.workerProcess.connected) {
      return this.workerProcess
    }

    const workerPath = join(__dirname, 'vault-worker.js')
    const processRef = fork(workerPath, [], {
      stdio: ['ignore', 'ignore', 'ignore', 'ipc']
    })

    processRef.on('message', (message: unknown) => {
      this.handleWorkerMessage(message)
    })
    processRef.on('error', error => {
      this.rejectAllPending(error)
    })
    processRef.on('exit', () => {
      this.rejectAllPending(new Error('Vault worker process exited'))
      this.workerProcess = null
    })

    this.workerProcess = processRef
    return processRef
  }

  private handleWorkerMessage(message: unknown): void {
    if (!message || typeof message !== 'object') {
      return
    }

    const response = message as WorkerResponse
    if (typeof response.id !== 'number' || typeof response.ok !== 'boolean') {
      return
    }

    const pending = this.pending.get(response.id)
    if (!pending) {
      return
    }
    this.pending.delete(response.id)

    if (response.ok) {
      pending.resolve(response.result)
      return
    }

    pending.reject(new Error(response.error || 'Vault worker request failed'))
  }

  private rejectAllPending(error: unknown): void {
    const pendingRequests = [...this.pending.values()]
    this.pending.clear()
    for (const request of pendingRequests) {
      request.reject(error)
    }
  }

  private async request<T>(action: string, payload?: Record<string, unknown>): Promise<T> {
    const processRef = this.ensureWorkerStarted()
    if (!processRef.connected) {
      throw new Error('Vault worker is not connected')
    }

    const id = ++this.requestId

    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: value => resolve(value as T),
        reject
      })
      processRef.send({ id, action, payload: payload ?? {} }, error => {
        if (!error) {
          return
        }
        this.pending.delete(id)
        reject(error)
      })
    })
  }

  async setupMasterPassword(masterPassword: string, hintAnswer?: string): Promise<WorkerSetupResult> {
    return this.request<WorkerSetupResult>('setupMasterPassword', { masterPassword, hintAnswer })
  }

  async unlockWithMasterPassword(input: {
    wrapped: string
    masterPassword: string
    salt: string
    kdfType: VaultKdfType
    kdfParams: VaultKdfParams
  }): Promise<void> {
    await this.request('unlockWithMasterPassword', input)
  }

  async unlockWithRecoveryKey(input: {
    wrapped: string
    recoveryKey: string
    salt: string
    kdfType: VaultKdfType
    kdfParams: VaultKdfParams
  }): Promise<void> {
    await this.request('unlockWithRecoveryKey', input)
  }

  async setDEK(dekBase64: string): Promise<void> {
    await this.request('setDEK', { dekBase64 })
  }

  async exportDEK(): Promise<{ dekBase64: string }> {
    return this.request<{ dekBase64: string }>('exportDEK')
  }

  async lock(): Promise<void> {
    await this.request('lock')
  }

  async isUnlocked(): Promise<boolean> {
    const result = await this.request<{ unlocked: boolean }>('isUnlocked')
    return result.unlocked
  }

  async encryptItemPayload(plaintext: string): Promise<{
    encryptedPayload: string
    wrappedItemKey: string
    encVersion: number
  }> {
    return this.request('encryptItemPayload', { plaintext })
  }

  async decryptItemPayload(input: {
    encryptedPayload: string
    wrappedItemKey: string
  }): Promise<{ plaintext: string }> {
    return this.request('decryptItemPayload', input)
  }

  async reencryptItemPayload(input: {
    plaintext: string
    wrappedItemKey: string
  }): Promise<{ encryptedPayload: string }> {
    return this.request('reencryptItemPayload', input)
  }

  async changeMasterPassword(newMasterPassword: string, hintAnswer?: string): Promise<WorkerSetupResult> {
    return this.request<WorkerSetupResult>('changeMasterPassword', { newMasterPassword, hintAnswer })
  }

  async shutdown(): Promise<void> {
    if (!this.workerProcess) {
      return
    }
    try {
      await this.request('shutdown')
    } catch {
      // ignore shutdown race if process already exiting
    }
  }
}
