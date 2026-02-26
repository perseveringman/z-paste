import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useVaultStore } from '../../stores/vaultStore'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Fingerprint, Lock, Unlock, AlertCircle, HelpCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function VaultLocked(): React.JSX.Element {
  const { t } = useTranslation()
  const {
    security,
    loading,
    error,
    unlock,
    unlockWithRecoveryKey,
    unlockWithBiometric,
    unlockWithHint,
    clearError
  } = useVaultStore()

  const [password, setPassword] = useState('')
  const [recoveryKey, setRecoveryKey] = useState('')
  const [hintAnswer, setHintAnswer] = useState('')
  const [mode, setMode] = useState<'password' | 'recovery' | 'hint'>('password')

  const handleUnlock = async (): Promise<void> => {
    if (mode === 'password' && password) {
      await unlock(password)
    } else if (mode === 'recovery' && recoveryKey) {
      await unlockWithRecoveryKey(recoveryKey)
    } else if (mode === 'hint' && hintAnswer) {
      await unlockWithHint(hintAnswer)
    }
  }

  // Clear password on lock
  useEffect(() => {
    if (security.locked) {
      setPassword('')
      setRecoveryKey('')
      setHintAnswer('')
    }
  }, [security.locked])

  return (
    <div className="h-full w-full flex items-center justify-center bg-background/50 backdrop-blur-2xl relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm p-8 flex flex-col items-center relative z-10"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 shadow-sm border border-primary/10 group">
          <Lock className="w-8 h-8 text-primary group-hover:hidden" />
          <Unlock className="w-8 h-8 text-primary hidden group-hover:block" />
        </div>

        <h2 className="text-xl font-semibold mb-1">{t('vault.locked.title')}</h2>
        <p className="text-sm text-muted-foreground mb-8 text-center">{t('vault.locked.description')}</p>

        <div className="w-full space-y-4">
          <AnimatePresence mode="wait">
            {mode === 'password' && (
              <motion.div
                key="password"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-3"
              >
                <div className="space-y-1.5">
                  <Input
                    type="password"
                    autoFocus
                    placeholder={t('vault.locked.masterPassword')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && password && !loading && handleUnlock()}
                    className="h-11 px-4 text-center bg-muted/30 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/50 text-base"
                  />
                </div>
                {security.hasBiometricUnlock && (
                  <Button 
                    className="w-full h-11 border-none bg-muted/30 hover:bg-muted/50 text-foreground shadow-none" 
                    variant="outline" 
                    onClick={() => unlockWithBiometric()} 
                    disabled={loading}
                  >
                    <Fingerprint className="w-4 h-4 mr-2 text-primary" />
                    {t('vault.locked.unlockWithBiometric')}
                  </Button>
                )}
              </motion.div>
            )}

            {mode === 'recovery' && (
              <motion.div
                key="recovery"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-3"
              >
                <Input
                  placeholder={t('vault.locked.recoveryKey')}
                  value={recoveryKey}
                  onChange={(e) => setRecoveryKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && recoveryKey && !loading && handleUnlock()}
                  className="h-11 px-4 text-center bg-muted/30 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/50"
                />
              </motion.div>
            )}

            {mode === 'hint' && (
              <motion.div
                key="hint"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-3"
              >
                <div className="p-3 bg-muted/20 rounded-lg border border-muted mb-2 text-center">
                  <p className="text-xs font-medium text-muted-foreground mb-1">{t('vault.reset.step1')}</p>
                  <p className="text-sm font-semibold">{security.hintQuestion}</p>
                </div>
                <Input
                  placeholder={t('vault.reset.answerPlaceholder')}
                  value={hintAnswer}
                  onChange={(e) => setHintAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && hintAnswer && !loading && handleUnlock()}
                  className="h-11 px-4 text-center bg-muted/30 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/50"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <Button 
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg shadow-primary/20" 
            onClick={handleUnlock} 
            disabled={loading || (mode === 'password' && !password) || (mode === 'recovery' && !recoveryKey) || (mode === 'hint' && !hintAnswer)}
          >
            {loading ? t('vault.action.saving') : t('vault.locked.unlock')}
          </Button>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-1.5 text-xs text-destructive mt-4 font-medium"
              onClick={clearError}
            >
              <AlertCircle className="w-3 h-3" />
              {error}
            </motion.div>
          )}

          <div className="flex items-center justify-center gap-4 mt-8 pt-4 border-t border-muted/20">
            {mode !== 'password' && (
              <button 
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMode('password')}
              >
                {t('vault.reset.back')}
              </button>
            )}
            {mode !== 'recovery' && (
              <button 
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                onClick={() => setMode('recovery')}
              >
                <HelpCircle className="w-3 h-3" />
                {t('vault.locked.recoveryKey')}
              </button>
            )}
            {mode !== 'hint' && security.securityMode === 'relaxed' && security.hintQuestion && (
              <button 
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMode('hint')}
              >
                {t('vault.locked.forgotPassword')}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
