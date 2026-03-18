import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../../stores/settingsStore'
import { Button } from '../ui/button'
import { Switch } from '../ui/switch'

interface Step {
  title: string
  description: string
  icon: string
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
  const [syncChoice, setSyncChoice] = useState(false)

  const steps: Step[] = [
    {
      title: t('onboarding.step1.title'),
      description: t('onboarding.step1.description'),
      icon: '🚀',
      content: (
        <div className="space-y-4">
          <Feature icon="📋" title={t('onboarding.step1.feature1.title')} desc={t('onboarding.step1.feature1.desc')} />
          <Feature icon="🔍" title={t('onboarding.step1.feature2.title')} desc={t('onboarding.step1.feature2.desc')} />
          <Feature icon="📝" title={t('onboarding.step1.feature3.title')} desc={t('onboarding.step1.feature3.desc')} />
          <Feature icon="🎨" title={t('onboarding.step1.feature4.title')} desc={t('onboarding.step1.feature4.desc')} />
        </div>
      )
    },
    {
      title: t('onboarding.step2.title'),
      description: t('onboarding.step2.description'),
      icon: '⌨️',
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
            {t('onboarding.step2.shortcutHint')}
            <br />
            {t('onboarding.step2.autoPaste')}
          </p>
          <div className="mt-1 w-full rounded-[1.25rem] border border-border/60 bg-background/70 p-4 shadow-sm">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('onboarding.step2.moreShortcuts')}</p>
            <div className="space-y-2 text-xs text-foreground/80">
              <div className="flex justify-between">
                <span>{t('onboarding.step2.numbers')}</span>
                <span className="text-muted-foreground">{t('onboarding.step2.numbersDesc')}</span>
              </div>
              <div className="flex justify-between">
                <span>⌘ ,</span>
                <span className="text-muted-foreground">{t('onboarding.step2.openSettings')}</span>
              </div>
              <div className="flex justify-between">
                <span>Esc</span>
                <span className="text-muted-foreground">{t('onboarding.step2.closePanel')}</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: t('onboarding.step3.title'),
      description: t('onboarding.step3.description'),
      icon: '🔒',
      content: (
        <div className="space-y-4">
          <div className="rounded-[1.25rem] border border-border/60 bg-background/70 p-4 shadow-sm">
            <p className="mb-2 text-xs font-semibold text-foreground">{t('onboarding.step3.storage.title')}</p>
            <p className="text-[11px] leading-6 text-muted-foreground">
              {t('onboarding.step3.storage.desc')}
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-border/60 bg-background/70 p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-foreground">{t('onboarding.step3.sync.title')}</p>
              <Switch
                checked={syncChoice}
                onCheckedChange={setSyncChoice}
                aria-label={t('onboarding.step3.sync.title')}
              />
            </div>
            <p className="text-[11px] leading-6 text-muted-foreground">
              {t('onboarding.step3.sync.desc')}
            </p>
          </div>
        </div>
      )
    },
    {
      title: t('onboarding.step4.title'),
      description: t('onboarding.step4.description'),
      icon: '✨',
      content: (
        <div className="flex flex-col items-center gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-primary/10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.82),_rgba(255,255,255,0)_55%),linear-gradient(135deg,rgba(200,120,56,0.95),rgba(93,143,117,0.9))] text-3xl font-bold text-white shadow-[0_20px_45px_rgba(98,67,44,0.18)]">
            Z
          </div>
          <p className="text-center text-xs leading-6 text-muted-foreground">
            {t('onboarding.step4.ready')}
            <br />
            {t('onboarding.step4.hint')}
          </p>
        </div>
      )
    }
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
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[1.5rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,252,248,0.96),rgba(250,244,236,0.92))] backdrop-blur-xl dark:bg-[linear-gradient(180deg,rgba(41,34,29,0.96),rgba(30,25,22,0.92))]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,_rgba(208,140,82,0.18),_transparent_58%)]" />
      <div className="relative flex flex-1 flex-col justify-center px-10 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Stash</p>
            <p data-display="true" className="mt-2 text-2xl font-semibold text-balance text-foreground">
              {t('onboarding.step1.description')}
            </p>
          </div>
          <div className="rounded-full border border-border/60 bg-background/65 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {currentStep + 1} / {steps.length}
          </div>
        </div>

        <div className="grid flex-1 gap-8 md:grid-cols-[120px_minmax(0,1fr)]">
          <div className="flex flex-col justify-between rounded-[1.5rem] border border-border/60 bg-background/60 p-5 shadow-sm">
            <div>
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-secondary/75 text-4xl shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
                {step.icon}
              </div>
              <div className="space-y-2">
                {steps.map((candidate, index) => (
                  <div
                    key={candidate.title}
                    className={`rounded-2xl px-3 py-2 text-xs transition-colors ${
                      index === currentStep
                        ? 'bg-primary/12 text-foreground'
                        : index < currentStep
                          ? 'bg-secondary/70 text-foreground/80'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {candidate.title}
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[11px] leading-6 text-muted-foreground">{t('onboarding.step4.hint')}</p>
          </div>

          <div className="flex flex-col justify-center rounded-[1.75rem] border border-border/65 bg-background/78 px-8 py-8 shadow-[0_20px_55px_rgba(101,68,43,0.12)]">
            <h2 data-display="true" className="mb-2 text-3xl font-semibold text-balance text-foreground">
              {step.title}
            </h2>
            <p className="mb-8 max-w-md text-sm leading-7 text-muted-foreground">
              {step.description}
            </p>
            <div className="w-full max-w-md">{step.content}</div>
          </div>
        </div>
      </div>

      <div className="relative flex items-center justify-between border-t border-border/60 px-8 py-5">
        <div className="flex items-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === currentStep
                  ? 'bg-primary'
                  : i < currentStep
                    ? 'bg-primary/40'
                    : 'bg-border'
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
          <Button
            onClick={handleNext}
            size="sm"
            className="px-4 text-xs"
          >
            {isLastStep ? t('onboarding.start') : t('onboarding.next')}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Feature({
  icon,
  title,
  desc
}: {
  icon: string
  title: string
  desc: string
}): React.JSX.Element {
  return (
    <div className="flex items-start gap-3 rounded-[1.15rem] border border-border/55 bg-background/65 px-4 py-3 shadow-sm">
      <span className="mt-0.5 text-base">{icon}</span>
      <div>
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="text-[11px] leading-5 text-muted-foreground">{desc}</p>
      </div>
    </div>
  )
}

function KeyCap({ label }: { label: string }): React.JSX.Element {
  return (
    <span className="inline-flex h-11 w-11 items-center justify-center rounded-[1rem] border border-border/60 bg-background/75 text-sm font-semibold text-foreground shadow-sm">
      {label}
    </span>
  )
}
