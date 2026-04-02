import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../../stores/settingsStore'
import { useLicenseStore } from '../../stores/licenseStore'
import { Button } from '../ui/button'
import { Switch } from '../ui/switch'
import { Input } from '../ui/input'
import { AppLogo } from '../ui/app-logo'
import {
  Rocket,
  Keyboard,
  Lock,
  Sparkles,
  Shield,
  Fingerprint,
  Clock,
  Zap,
  Clipboard,
  Search,
  Palette,
  Eye,
  CheckCircle2,
} from 'lucide-react'

interface Step {
  title: string
  description: string
  icon: React.ElementType
  content: React.ReactNode
}

interface Props {
  onComplete: () => void
  isRevisit?: boolean
}

export default function OnboardingPage({ onComplete, isRevisit }: Props): React.JSX.Element {
  const { t } = useTranslation()
  const [currentStep, setCurrentStep] = useState(0)
  const { setICloudSync, setHasCompletedOnboarding } = useSettingsStore()
  const { activate: activateLicense } = useLicenseStore()
  const [syncChoice, setSyncChoice] = useState(false)
  const [showActivation, setShowActivation] = useState(false)
  const [activationCode, setActivationCode] = useState('')
  const [activationStatus, setActivationStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const steps: Step[] = [
    {
      title: t('onboarding.step1.title'),
      description: t('onboarding.step1.description'),
      icon: Rocket,
      content: (
        <div className="space-y-4">
          <Feature
            icon={Clipboard}
            title={t('onboarding.step1.feature1.title')}
            desc={t('onboarding.step1.feature1.desc')}
          />
          <Feature
            icon={Search}
            title={t('onboarding.step1.feature2.title')}
            desc={t('onboarding.step1.feature2.desc')}
          />
          <Feature
            icon={Palette}
            title={t('onboarding.step1.feature3.title')}
            desc={t('onboarding.step1.feature3.desc')}
          />
          <Feature
            icon={Eye}
            title={t('onboarding.step1.feature4.title')}
            desc={t('onboarding.step1.feature4.desc')}
          />
        </div>
      ),
    },
    {
      title: t('onboarding.step2.title'),
      description: t('onboarding.step2.description'),
      icon: Shield,
      content: (
        <div className="space-y-4">
          <Feature
            icon={Fingerprint}
            title={t('onboarding.step2.feature1.title')}
            desc={t('onboarding.step2.feature1.desc')}
          />
          <Feature
            icon={Lock}
            title={t('onboarding.step2.feature2.title')}
            desc={t('onboarding.step2.feature2.desc')}
          />
          <Feature
            icon={Clock}
            title={t('onboarding.step2.feature3.title')}
            desc={t('onboarding.step2.feature3.desc')}
          />
          <Feature
            icon={Zap}
            title={t('onboarding.step2.feature4.title')}
            desc={t('onboarding.step2.feature4.desc')}
          />
        </div>
      ),
    },
    {
      title: t('onboarding.step3.title'),
      description: t('onboarding.step3.description'),
      icon: Keyboard,
      content: (
        <div className="flex flex-col items-center gap-5">
          <div className="flex items-center gap-2">
            <KeyCap label="⇧" />
            <span className="text-muted-foreground">+</span>
            <KeyCap label="⌘" />
            <span className="text-muted-foreground">+</span>
            <KeyCap label="V" />
          </div>
          <p className="text-center text-xs leading-6 text-muted-foreground">
            {t('onboarding.step3.shortcutHint')}
            <br />
            {t('onboarding.step3.autoPaste')}
          </p>
          <div className="mt-1 w-full rounded-[1.25rem] border border-border/60 bg-card p-4 shadow-sm">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t('onboarding.step3.moreShortcuts')}
            </p>
            <div className="space-y-2 text-xs text-foreground/80">
              <div className="flex justify-between">
                <span>{t('onboarding.step3.numbers')}</span>
                <span className="text-muted-foreground">{t('onboarding.step3.numbersDesc')}</span>
              </div>
              <div className="flex justify-between">
                <span>⌘ ,</span>
                <span className="text-muted-foreground">{t('onboarding.step3.openSettings')}</span>
              </div>
              <div className="flex justify-between">
                <span>Esc</span>
                <span className="text-muted-foreground">{t('onboarding.step3.closePanel')}</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: t('onboarding.step4.title'),
      description: t('onboarding.step4.description'),
      icon: Lock,
      content: (
        <div className="space-y-4">
          <div className="rounded-[1.25rem] border border-border/60 bg-card p-4 shadow-sm">
            <p className="mb-2 text-xs font-semibold text-foreground">
              {t('onboarding.step4.storage.title')}
            </p>
            <p className="text-[11px] leading-6 text-muted-foreground">
              {t('onboarding.step4.storage.desc')}
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-border/60 bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-foreground">
                {t('onboarding.step4.sync.title')}
              </p>
              <Switch
                checked={syncChoice}
                onCheckedChange={setSyncChoice}
                aria-label={t('onboarding.step4.sync.title')}
              />
            </div>
            <p className="text-[11px] leading-6 text-muted-foreground">
              {t('onboarding.step4.sync.desc')}
            </p>
          </div>
        </div>
      ),
    },
    {
      title: t('onboarding.step5.title'),
      description: t('onboarding.step5.description'),
      icon: Sparkles,
      content: (
        <div className="flex flex-col items-center gap-5">
          <AppLogo size="lg" />
          <p className="text-center text-xs leading-6 text-muted-foreground">
            {t('onboarding.step5.ready')}
            <br />
            {t('onboarding.step5.trialInfo')}
          </p>
          {!showActivation ? (
            <button
              onClick={() => setShowActivation(true)}
              className="text-xs text-primary hover:underline"
            >
              {t('onboarding.step5.activateNow')}
            </button>
          ) : (
            <div className="w-full max-w-xs space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={activationCode}
                  onChange={(e) => {
                    setActivationCode(e.target.value)
                    setActivationStatus('idle')
                  }}
                  placeholder={t('onboarding.step5.activatePlaceholder')}
                  className="font-mono text-xs tracking-wider flex-1"
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && activationCode.trim()) {
                      const result = await activateLicense(activationCode.trim())
                      setActivationStatus(result.ok ? 'success' : 'error')
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!activationCode.trim()) return
                    const result = await activateLicense(activationCode.trim())
                    setActivationStatus(result.ok ? 'success' : 'error')
                  }}
                  disabled={!activationCode.trim()}
                >
                  {t('license.activate')}
                </Button>
              </div>
              {activationStatus === 'success' && (
                <p className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t('license.activateSuccess')}
                </p>
              )}
              {activationStatus === 'error' && (
                <p className="text-xs text-destructive">{t('license.activateError')}</p>
              )}
            </div>
          )}
        </div>
      ),
    },
  ]

  const isLastStep = currentStep === steps.length - 1

  const handleNext = useCallback(() => {
    if (isLastStep) {
      if (!isRevisit) {
        setICloudSync(syncChoice)
        setHasCompletedOnboarding(true)
      }
      onComplete()
    } else {
      setCurrentStep((s) => s + 1)
    }
  }, [isLastStep, isRevisit, syncChoice, setICloudSync, setHasCompletedOnboarding, onComplete])

  const handleSkip = useCallback(() => {
    if (!isRevisit) {
      setHasCompletedOnboarding(true)
    }
    onComplete()
  }, [isRevisit, setHasCompletedOnboarding, onComplete])

  const step = steps[currentStep]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative flex h-full w-full flex-col overflow-hidden rounded-[1.5rem] border border-border/70 bg-[linear-gradient(180deg,hsl(336_60%_96%),hsl(24_100%_98%))] dark:bg-[linear-gradient(180deg,hsl(330_15%_12%),hsl(330_18%_8%))]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,_rgba(255,138,74,0.12),_transparent_58%)]" />
      <div className="relative flex flex-1 min-h-0 flex-col px-10 py-6">
        <div className="mb-5 flex shrink-0 items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Stash
            </p>
            <p
              data-display="true"
              className="mt-2 text-2xl font-semibold text-balance text-foreground"
            >
              {t('onboarding.step1.description')}
            </p>
          </div>
          <div className="rounded-full border border-border bg-muted px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {currentStep + 1} / {steps.length}
          </div>
        </div>

        <div className="grid flex-1 min-h-0 gap-6 md:grid-cols-[140px_minmax(0,1fr)]">
          <div className="flex flex-col justify-between rounded-[1.5rem] border border-border/60 bg-card p-5 shadow-sm">
            <div>
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
                <step.icon className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                {steps.map((candidate, index) => (
                  <div
                    key={candidate.title}
                    className={`rounded-2xl px-3 py-2 text-xs transition-colors ${
                      index === currentStep
                        ? 'bg-primary/12 text-foreground'
                        : index < currentStep
                          ? 'bg-muted text-foreground/80'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {candidate.title}
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[11px] leading-6 text-muted-foreground">
              {t('onboarding.step5.hint')}
            </p>
          </div>

          <div className="flex flex-col rounded-[1.75rem] border border-border/60 bg-card px-6 py-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-y-auto">
            <h2
              data-display="true"
              className="mb-2 text-2xl font-semibold text-balance text-foreground"
            >
              {step.title}
            </h2>
            <p className="mb-5 text-sm leading-7 text-muted-foreground">
              {step.description}
            </p>
            <div className="w-full">{step.content}</div>
          </div>
        </div>
      </div>

      <div className="relative flex shrink-0 items-center justify-between border-t border-border/60 px-8 py-4">
        <div className="flex items-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === currentStep ? 'bg-primary' : i < currentStep ? 'bg-primary/40' : 'bg-border'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          {!isLastStep && (
            <Button
              onClick={handleSkip}
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t('onboarding.skip')}
            </Button>
          )}
          <Button onClick={handleNext} size="sm" className="px-4 text-xs">
            {isLastStep ? t('onboarding.start') : t('onboarding.next')}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

function Feature({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ElementType
  title: string
  desc: string
}): React.JSX.Element {
  return (
    <div className="flex items-start gap-3 rounded-[1.15rem] border border-border/50 bg-card px-4 py-3 shadow-sm">
      <Icon className="w-4 h-4 mt-0.5 text-foreground shrink-0" />
      <div>
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="text-[11px] leading-5 text-muted-foreground">{desc}</p>
      </div>
    </div>
  )
}

function KeyCap({ label }: { label: string }): React.JSX.Element {
  return (
    <span className="inline-flex h-11 w-11 items-center justify-center rounded-[1rem] border border-border bg-muted text-sm font-semibold text-foreground shadow-sm">
      {label}
    </span>
  )
}
