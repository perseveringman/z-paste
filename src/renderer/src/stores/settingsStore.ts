import { create } from 'zustand'

export type ThemeMode = 'auto' | 'dark' | 'light'

export interface Settings {
  theme: ThemeMode
  launchAtLogin: boolean
  historyRetention: number // days, 0 = forever
  maxItems: number
  iCloudSync: boolean
  encryptionEnabled: boolean
  hasCompletedOnboarding: boolean
  customShortcut: string
  sequencePasteShortcut: string
  batchPasteShortcut: string
  addToQueueShortcut: string
  batchPasteSeparator: string
}

interface SettingsState extends Settings {
  resolvedTheme: 'dark' | 'light'
  setTheme: (theme: ThemeMode) => void
  setLaunchAtLogin: (value: boolean) => void
  setHistoryRetention: (days: number) => void
  setMaxItems: (count: number) => void
  setICloudSync: (value: boolean) => void
  setEncryptionEnabled: (value: boolean) => void
  setHasCompletedOnboarding: (value: boolean) => void
  setCustomShortcut: (shortcut: string) => void
  setSequencePasteShortcut: (shortcut: string) => void
  setBatchPasteShortcut: (shortcut: string) => void
  setAddToQueueShortcut: (shortcut: string) => void
  setBatchPasteSeparator: (separator: string) => void
  loadSettings: () => void
  saveSettings: () => void
}

const STORAGE_KEY = 'zpaste-settings'

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode === 'auto') return getSystemTheme()
  return mode
}

function loadFromStorage(): Partial<Settings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return {}
}

function saveToStorage(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // ignore
  }
}

const defaults: Settings = {
  theme: 'auto',
  launchAtLogin: false,
  historyRetention: 30,
  maxItems: 2000,
  iCloudSync: false,
  encryptionEnabled: false,
  hasCompletedOnboarding: false,
  customShortcut: 'Shift+CommandOrControl+V',
  sequencePasteShortcut: 'CommandOrControl+;',
  batchPasteShortcut: "CommandOrControl+'",
  addToQueueShortcut: 'Space',
  batchPasteSeparator: '\n'
}

const stored = loadFromStorage()
const initialSettings: Settings = { ...defaults, ...stored }

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...initialSettings,
  resolvedTheme: resolveTheme(initialSettings.theme),

  setTheme: (theme) => {
    const resolved = resolveTheme(theme)
    set({ theme, resolvedTheme: resolved })
    get().saveSettings()
    applyTheme(resolved)
  },

  setLaunchAtLogin: (value) => {
    set({ launchAtLogin: value })
    get().saveSettings()
  },

  setHistoryRetention: (days) => {
    set({ historyRetention: days })
    get().saveSettings()
  },

  setMaxItems: (count) => {
    set({ maxItems: count })
    get().saveSettings()
  },

  setICloudSync: (value) => {
    set({ iCloudSync: value })
    get().saveSettings()
  },

  setEncryptionEnabled: (value) => {
    set({ encryptionEnabled: value })
    get().saveSettings()
  },

  setHasCompletedOnboarding: (value) => {
    set({ hasCompletedOnboarding: value })
    get().saveSettings()
  },

  setCustomShortcut: (shortcut) => {
    set({ customShortcut: shortcut })
    get().saveSettings()
  },

  setSequencePasteShortcut: (shortcut) => {
    set({ sequencePasteShortcut: shortcut })
    get().saveSettings()
  },

  setBatchPasteShortcut: (shortcut) => {
    set({ batchPasteShortcut: shortcut })
    get().saveSettings()
  },

  setAddToQueueShortcut: (shortcut) => {
    set({ addToQueueShortcut: shortcut })
    get().saveSettings()
  },

  setBatchPasteSeparator: (separator) => {
    set({ batchPasteSeparator: separator })
    get().saveSettings()
  },

  loadSettings: () => {
    const stored = loadFromStorage()
    const merged = { ...defaults, ...stored }
    const resolved = resolveTheme(merged.theme)
    set({ ...merged, resolvedTheme: resolved })
    applyTheme(resolved)
  },

  saveSettings: () => {
    const state = get()
    const settings: Settings = {
      theme: state.theme,
      launchAtLogin: state.launchAtLogin,
      historyRetention: state.historyRetention,
      maxItems: state.maxItems,
      iCloudSync: state.iCloudSync,
      encryptionEnabled: state.encryptionEnabled,
      hasCompletedOnboarding: state.hasCompletedOnboarding,
      customShortcut: state.customShortcut,
      sequencePasteShortcut: state.sequencePasteShortcut,
      batchPasteShortcut: state.batchPasteShortcut,
      addToQueueShortcut: state.addToQueueShortcut,
      batchPasteSeparator: state.batchPasteSeparator
    }
    saveToStorage(settings)
  }
}))

function applyTheme(theme: 'dark' | 'light'): void {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.add('light')
    root.classList.remove('dark')
  }
}

// Listen for system theme changes
if (typeof window !== 'undefined') {
  const mql = window.matchMedia('(prefers-color-scheme: dark)')
  mql.addEventListener('change', () => {
    const state = useSettingsStore.getState()
    if (state.theme === 'auto') {
      const resolved = getSystemTheme()
      useSettingsStore.setState({ resolvedTheme: resolved })
      applyTheme(resolved)
    }
  })

  // Apply initial theme
  applyTheme(resolveTheme(initialSettings.theme))
}
