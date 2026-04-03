import { translateDesktop } from '../localization'

type VaultTextParams = Record<string, string | number>
const LOCALIZED_VAULT_ERROR_NAME = 'LocalizedVaultError'

export function createVaultError(key: string, params?: VaultTextParams): Error {
  const error = new Error(translateDesktop(key, undefined, params))
  error.name = LOCALIZED_VAULT_ERROR_NAME
  return error
}

export function isVaultError(error: unknown): error is Error {
  return error instanceof Error && error.name === LOCALIZED_VAULT_ERROR_NAME
}

export function translateVaultText(key: string, params?: VaultTextParams): string {
  return translateDesktop(key, undefined, params)
}
