import { useState } from 'react'
import SettingsPage from './components/Settings/SettingsPage'
import OnboardingPage from './components/Onboarding/OnboardingPage'
import { useSettingsStore } from './stores/settingsStore'

function SettingsApp(): React.JSX.Element {
  const resolvedTheme = useSettingsStore((s) => s.resolvedTheme)
  const [view] = useState<'settings' | 'onboarding'>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('view') === 'onboarding' ? 'onboarding' : 'settings'
  })

  const handleClose = (): void => {
    window.close()
  }

  return (
    <div className={`w-full h-screen ${resolvedTheme}`}>
      {view === 'onboarding' ? (
        <OnboardingPage onComplete={handleClose} isRevisit />
      ) : (
        <SettingsPage onClose={handleClose} />
      )}
    </div>
  )
}

export default SettingsApp
