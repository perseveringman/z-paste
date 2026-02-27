import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useVaultStore } from '../../stores/vaultStore'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Shield, Lock, Key, Copy, Check, ArrowRight, ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function VaultSetup(): React.JSX.Element {
  const { t } = useTranslation()
  const {
    loading,
    error,
    recoveryKey,
    setupMasterPassword,
    clearError
  } = useVaultStore()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [securityMode, setSecurityMode] = useState<'strict' | 'relaxed'>('strict')
  const [masterPassword, setMasterPassword] = useState('')
  const [masterPasswordConfirm, setMasterPasswordConfirm] = useState('')
  const [hintQuestion, setHintQuestion] = useState('')
  const [hintAnswer, setHintAnswer] = useState('')
  const [copied, setCopied] = useState(false)

  const HINT_QUESTIONS = [
    'What was the name of your first pet?',
    'What city were you born in?',
    'What was the name of your first school?',
    'What is your favorite movie?',
    'What is your childhood nickname?'
  ]

  const canContinueToStep2 = securityMode !== null
  const canContinueToStep3 = masterPassword.length >= 8 && masterPassword === masterPasswordConfirm && (securityMode === 'strict' || (hintQuestion && hintAnswer))

  const handleSetup = async (): Promise<void> => {
    await setupMasterPassword({
      masterPassword,
      securityMode,
      hintQuestion: securityMode === 'relaxed' ? hintQuestion : undefined,
      hintAnswer: securityMode === 'relaxed' ? hintAnswer : undefined
    })
    setStep(3)
  }

  const handleCopy = async (): Promise<void> => {
    if (recoveryKey) {
      await navigator.clipboard.writeText(recoveryKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleFinish = (): void => {
    // This will trigger the refresh in VaultView
    useVaultStore.setState({ recoveryKey: null })
  }

  return (
    <div className="h-full w-full flex items-center justify-center p-6 bg-background/50 backdrop-blur-md relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-background border shadow-xl rounded-2xl overflow-hidden z-10"
      >
        <div className="p-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">{t('vault.setup.title')}</h2>
            <p className="text-sm text-muted-foreground max-w-xs">{t('vault.setup.description')}</p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <div 
                key={s} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === s ? 'w-8 bg-primary' : s < step ? 'w-4 bg-primary/40' : 'w-4 bg-muted'
                }`} 
              />
            ))}
          </div>

          <div className="min-h-[280px]">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 gap-4">
                    <button 
                      onClick={() => setSecurityMode('strict')}
                      className={`p-5 rounded-xl border text-left transition-all ${
                        securityMode === 'strict' ? 'bg-primary/5 border-primary shadow-sm' : 'hover:bg-muted/40 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Lock className={`w-5 h-5 ${securityMode === 'strict' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <h4 className="font-semibold text-sm">{t('vault.setup.strict')}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{t('vault.setup.strictDesc')}</p>
                    </button>

                    <button 
                      onClick={() => setSecurityMode('relaxed')}
                      className={`p-5 rounded-xl border text-left transition-all ${
                        securityMode === 'relaxed' ? 'bg-primary/5 border-primary shadow-sm' : 'hover:bg-muted/40 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Shield className={`w-5 h-5 ${securityMode === 'relaxed' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <h4 className="font-semibold text-sm">{t('vault.setup.relaxed')}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{t('vault.setup.relaxedDesc')}</p>
                    </button>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button onClick={() => setStep(2)} disabled={!canContinueToStep2} className="w-full h-11">
                      {t('vault.reset.stepArrow')} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{t('vault.setup.masterPassword')}</label>
                      <Input type="password" value={masterPassword} onChange={(e) => setMasterPassword(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{t('vault.setup.confirmPassword')}</label>
                      <Input type="password" value={masterPasswordConfirm} onChange={(e) => setMasterPasswordConfirm(e.target.value)} />
                    </div>
                  </div>

                  {securityMode === 'relaxed' && (
                    <div className="space-y-4 pt-4 border-t border-muted/20">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">{t('vault.setup.securityQuestion')}</label>
                        <div className="flex flex-wrap gap-2">
                          {HINT_QUESTIONS.map((q) => (
                            <button
                              key={q}
                              onClick={() => setHintQuestion(q)}
                              className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                                hintQuestion === q ? 'bg-primary text-primary-foreground border-transparent shadow-sm' : 'hover:bg-muted/40 border-muted text-muted-foreground'
                              }`}
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                        <Input placeholder={t('vault.setup.customQuestionPlaceholder')} value={hintQuestion} onChange={(e) => setHintQuestion(e.target.value)} className="h-9 mt-2" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">{t('vault.setup.answer')}</label>
                        <Input placeholder={t('vault.setup.answerPlaceholder')} value={hintAnswer} onChange={(e) => setHintAnswer(e.target.value)} />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-6">
                    <Button variant="outline" onClick={() => setStep(1)} className="h-11 px-4">
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Button onClick={handleSetup} disabled={!canContinueToStep3 || loading} className="flex-1 h-11">
                      {loading ? t('vault.setup.settingUp') : t('vault.setup.setMasterPassword')}
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="p-6 bg-primary/5 border border-primary/10 rounded-2xl relative group overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                      <Key className="w-12 h-12" />
                    </div>
                    <p className="text-xs text-primary/70 font-semibold uppercase tracking-wider mb-2">{t('vault.setup.recoveryKeyLabel')}</p>
                    <p className="text-lg font-mono break-all font-bold tracking-tight text-primary select-all py-2">{recoveryKey}</p>
                    <div className="flex gap-2 mt-4 pt-4 border-t border-primary/10">
                      <Button variant="ghost" size="sm" onClick={handleCopy} className="text-xs h-9 bg-white shadow-sm hover:bg-white/90">
                        {copied ? <Check className="w-3.5 h-3.5 mr-2 text-green-500" /> : <Copy className="w-3.5 h-3.5 mr-2" />}
                        {t('vault.setup.copyRecoveryKey')}
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                    <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                      ⚠️ {t('vault.setup.recoveryKeyDesc') || 'This recovery key is the ONLY way to access your vault if you forget your master password. Save it in a safe place!'}
                    </p>
                  </div>

                  <Button onClick={handleFinish} className="w-full h-12 shadow-xl shadow-primary/20">
                    <Check className="w-5 h-5 mr-2" /> {t('vault.setup.savedContinue')}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {error && (
          <div className="px-8 pb-4">
            <div className="p-3 bg-destructive/5 border border-destructive/10 rounded-lg flex items-center gap-2 text-xs text-destructive font-medium cursor-pointer" onClick={clearError}>
              <AlertCircle className="w-3 h-3" />
              {error}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

function AlertCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}
