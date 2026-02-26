import { useEffect, useState } from 'react'
import { useVaultStore } from '../../stores/vaultStore'
import VaultSidebar from './VaultSidebar'
import VaultDetail from './VaultDetail'
import VaultLocked from './VaultLocked'
import VaultSetup from './VaultSetup'
import { motion } from 'framer-motion'

export default function VaultView(): React.JSX.Element {
  const { security, refreshSecurity, recoveryKey, detail } = useVaultStore()
  const [createType, setCreateType] = useState<'login' | 'secure_note' | null>(null)

  useEffect(() => {
    refreshSecurity()
  }, [refreshSecurity])

  useEffect(() => {
    if (detail) {
      setCreateType(null)
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
      <VaultSidebar onCreate={(type) => setCreateType(type)} />
      <div className="flex-1 min-w-0">
        <VaultDetail createType={createType} onCancelCreate={() => setCreateType(null)} />
      </div>
    </motion.div>
  )
}
