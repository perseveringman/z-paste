import i18n from '../i18n'

const rawVaultErrorKeyMap: Record<string, string> = {
  'Vault worker process exited': 'vault.error.workerExited',
  'Vault worker request failed': 'vault.error.workerRequestFailed',
  'Vault worker is not connected': 'vault.error.workerNotConnected',
}

export function normalizeVaultMessage(message: string, fallbackKey: string): string {
  const trimmed = message.trim()
  if (!trimmed) {
    return i18n.t(fallbackKey)
  }

  const mappedKey = rawVaultErrorKeyMap[trimmed]
  return mappedKey ? i18n.t(mappedKey) : trimmed
}

export function normalizeVaultDisplayError(error: unknown, fallbackKey: string): string {
  if (error instanceof Error) {
    return normalizeVaultMessage(error.message, fallbackKey)
  }

  if (typeof error === 'string') {
    return normalizeVaultMessage(error, fallbackKey)
  }

  return i18n.t(fallbackKey)
}
