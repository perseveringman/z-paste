import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../../stores/settingsStore'

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
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <KeyCap label="⇧" />
            <span className="text-gray-400">+</span>
            <KeyCap label="⌘" />
            <span className="text-gray-400">+</span>
            <KeyCap label="V" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {t('onboarding.step2.shortcutHint')}
            <br />
            {t('onboarding.step2.autoPaste')}
          </p>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 mt-2 w-full">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">{t('onboarding.step2.moreShortcuts')}</p>
            <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex justify-between">
                <span>{t('onboarding.step2.numbers')}</span>
                <span className="text-gray-400">{t('onboarding.step2.numbersDesc')}</span>
              </div>
              <div className="flex justify-between">
                <span>⌘ ,</span>
                <span className="text-gray-400">{t('onboarding.step2.openSettings')}</span>
              </div>
              <div className="flex justify-between">
                <span>Esc</span>
                <span className="text-gray-400">{t('onboarding.step2.closePanel')}</span>
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
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-700 dark:text-gray-300 mb-2 font-medium">{t('onboarding.step3.storage.title')}</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
              {t('onboarding.step3.storage.desc')}
            </p>
          </div>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">{t('onboarding.step3.sync.title')}</p>
              <button
                onClick={() => setSyncChoice(!syncChoice)}
                className={`relative w-10 h-6 rounded-full transition-colors ${
                  syncChoice ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    syncChoice ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
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
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            Z
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed">
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
    <div className="w-full h-full flex flex-col bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-xl overflow-hidden border border-black/10 dark:border-white/10">
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-6">
        <span className="text-4xl mb-3">{step.icon}</span>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
          {step.title}
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 text-center">
          {step.description}
        </p>
        <div className="w-full max-w-sm">{step.content}</div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-black/5 dark:border-white/5">
        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === currentStep
                  ? 'bg-blue-500'
                  : i < currentStep
                    ? 'bg-blue-300'
                    : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          {!isLastStep && (
            <button
              onClick={handleSkip}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {t('onboarding.skip')}
            </button>
          )}
          <button
            onClick={handleNext}
            className="text-xs bg-blue-500 text-white px-4 py-1.5 rounded-md hover:bg-blue-600 transition-colors"
          >
            {isLastStep ? t('onboarding.start') : t('onboarding.next')}
          </button>
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
    <div className="flex items-start gap-3">
      <span className="text-base mt-0.5">{icon}</span>
      <div>
        <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{title}</p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">{desc}</p>
      </div>
    </div>
  )
}

function KeyCap({ label }: { label: string }): React.JSX.Element {
  return (
    <span className="inline-flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 text-sm font-mono shadow-sm">
      {label}
    </span>
  )
}
