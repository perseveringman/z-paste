import { useEffect } from 'react'
import { useVaultStore } from '../../stores/vaultStore'
import VaultSidebar from './VaultSidebar'
import VaultDetail from './VaultDetail'
import VaultLocked from './VaultLocked'
import VaultSetup from './VaultSetup'
import { motion } from 'framer-motion'

interface VaultViewProps {
  createType: 'login' | 'secure_note' | null
  onCreateTypeChange: (type: 'login' | 'secure_note' | null) => void
}

export default function VaultView({ createType, onCreateTypeChange }: VaultViewProps): React.JSX.Element {
  const { security, refreshSecurity, recoveryKey, detail } = useVaultStore()

  useEffect(() => {
    refreshSecurity()
  }, [refreshSecurity])

  useEffect(() => {
    const unsub = window.api.onPanelHidden(() => {
      refreshSecurity()
    })
    return unsub
  }, [refreshSecurity])

  useEffect(() => {
    if (detail) {
      onCreateTypeChange(null)
    }
  }, [detail?.meta.id])

  if (recoveryKey) {
    return <VaultSetup />
  }

  if (!security.hasVaultSetup) {
    return <VaultSetup />
  }

  if (security.locked) {
    return <VaultLocked />
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex overflow-hidden bg-background"
    >
      <VaultSidebar />
      <div className="flex-1 min-w-0">
        <VaultDetail createType={createType} onCancelCreate={() => onCreateTypeChange(null)} />
      </div>
    </motion.div>
  )
}
