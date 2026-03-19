import { useEffect } from 'react'
import { useVaultStore } from '../../stores/vaultStore'
import VaultSidebar from './VaultSidebar'
import VaultDetail from './VaultDetail'
import VaultLocked from './VaultLocked'
import VaultSetup from './VaultSetup'
import VaultStackedView from './VaultStackedView'
import VaultCardCarousel from './VaultCardCarousel'
import { motion } from 'framer-motion'

interface VaultViewProps {
  layoutMode: 'center' | 'side' | 'bottom'
  createType: 'login' | 'secure_note' | null
  onCreateTypeChange: (type: 'login' | 'secure_note' | null) => void
}

export default function VaultView({ layoutMode, createType, onCreateTypeChange }: VaultViewProps): React.JSX.Element {
  const { security, securityInitialized, refreshSecurity, recoveryKey, detail } = useVaultStore()

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

  if (!securityInitialized) {
    return <div className="h-full" />
  }

  if (recoveryKey) {
    return <VaultSetup />
  }

  if (!security.hasVaultSetup) {
    return <VaultSetup />
  }

  if (security.locked) {
    return <VaultLocked />
  }

  // Bottom layout: horizontal card carousel
  if (layoutMode === 'bottom') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full flex flex-col overflow-hidden bg-background"
      >
        <VaultCardCarousel createType={createType} onCreateTypeChange={onCreateTypeChange} />
      </motion.div>
    )
  }

  // Side layout: full-width list + bottom drawer
  if (layoutMode === 'side') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full flex flex-col overflow-hidden bg-background"
      >
        <VaultStackedView createType={createType} onCreateTypeChange={onCreateTypeChange} />
      </motion.div>
    )
  }

  // Center layout: sidebar + detail (existing)
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
