import React, { useState, useEffect, useCallback } from 'react'
import type { VaultSecurityState, VaultItemMeta } from '../shared/types'
import { t } from '../shared/i18n'
import { DisconnectedView } from './components/DisconnectedView'
import { NoSetupView } from './components/NoSetupView'
import { UnlockView } from './components/UnlockView'
import { VaultListView } from './components/VaultListView'
import { ItemDetailView } from './components/ItemDetailView'

type AppState =
  | { view: 'loading' }
  | { view: 'disconnected' }
  | { view: 'no-setup' }
  | { view: 'unlock'; securityState: VaultSecurityState }
  | { view: 'list'; securityState: VaultSecurityState }
  | { view: 'detail'; securityState: VaultSecurityState; item: VaultItemMeta }

export function App() {
  const [state, setState] = useState<AppState>({ view: 'loading' })
  const [retrying, setRetrying] = useState(false)

  const loadState = useCallback(async () => {
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'getState' })
      const { connected, security: securityState } = resp as {
        connected: boolean
        security: VaultSecurityState | null
      }

      if (!connected || !securityState) {
        setState({ view: 'disconnected' })
        return
      }

      if (!securityState.hasVaultSetup) {
        setState({ view: 'no-setup' })
        return
      }

      if (securityState.locked) {
        setState({ view: 'unlock', securityState })
      } else {
        setState({ view: 'list', securityState })
      }
    } catch {
      setState({ view: 'disconnected' })
    }
  }, [])

  useEffect(() => {
    loadState()
  }, [loadState])

  const handleRetry = async () => {
    setRetrying(true)
    await loadState()
    setRetrying(false)
  }

  const handleUnlock = async (password: string) => {
    const resp = await chrome.runtime.sendMessage({
      type: 'unlock',
      masterPassword: password,
    })
    const result = resp as { success: boolean }
    if (!result.success) {
      throw new Error(t('passwordError'))
    }
    await loadState()
  }

  const handleLock = async () => {
    await chrome.runtime.sendMessage({ type: 'lock' })
    await loadState()
  }

  const handleSelectItem = (item: VaultItemMeta) => {
    if (state.view === 'list') {
      setState({ view: 'detail', securityState: state.securityState, item })
    }
  }

  const handleBackToList = () => {
    if (state.view === 'detail') {
      setState({ view: 'list', securityState: state.securityState })
    }
  }

  return (
    <div className="relative w-full h-full">
      {state.view === 'loading' && (
        <div className="flex items-center justify-center h-full min-h-[480px] bg-white dark:bg-slate-900">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {state.view === 'disconnected' && (
        <DisconnectedView onRetry={handleRetry} loading={retrying} />
      )}

      {state.view === 'no-setup' && <NoSetupView />}

      {state.view === 'unlock' && (
        <UnlockView
          onUnlock={handleUnlock}
          securityMode={state.securityState.securityMode}
          hintQuestion={state.securityState.hintQuestion}
        />
      )}

      {state.view === 'list' && (
        <VaultListView onLock={handleLock} onSelectItem={handleSelectItem} />
      )}

      {state.view === 'detail' && (
        <ItemDetailView item={state.item} onBack={handleBackToList} />
      )}
    </div>
  )
}
