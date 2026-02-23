import { useEffect, useState } from 'react'
import WidgetPanel from './components/Widget/WidgetPanel'

type ThemeMode = 'auto' | 'dark' | 'light'

function getStoredTheme(): ThemeMode {
  try {
    const raw = localStorage.getItem('zpaste-settings')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.theme) return parsed.theme
    }
  } catch {
    // ignore
  }
  return 'auto'
}

function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

function WidgetApp(): React.JSX.Element {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => resolveTheme(getStoredTheme()))

  useEffect(() => {
    // Listen for system theme changes (for auto mode)
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemChange = (): void => {
      const mode = getStoredTheme()
      if (mode === 'auto') {
        setTheme(mql.matches ? 'dark' : 'light')
      }
    }
    mql.addEventListener('change', handleSystemChange)

    // Listen for storage changes (when user changes theme in settings)
    const handleStorage = (e: StorageEvent): void => {
      if (e.key === 'zpaste-settings') {
        setTheme(resolveTheme(getStoredTheme()))
      }
    }
    window.addEventListener('storage', handleStorage)

    // Poll for settings changes from same-origin windows (storage event doesn't fire for same-page writes)
    const interval = setInterval(() => {
      setTheme(resolveTheme(getStoredTheme()))
    }, 2000)

    return () => {
      mql.removeEventListener('change', handleSystemChange)
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }
  }, [theme])

  return (
    <div className={`w-full h-screen ${theme}`}>
      <WidgetPanel />
    </div>
  )
}

export default WidgetApp
