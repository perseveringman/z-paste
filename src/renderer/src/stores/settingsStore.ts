import { create } from 'zustand'
import i18n from '../i18n'

export type ThemeMode = 'auto' | 'dark' | 'light'
export type LanguageMode = 'auto' | 'zh-CN' | 'en' | 'zh-TW'

export interface Settings {
  theme: ThemeMode
  language: LanguageMode
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
  toggleFilterShortcut: string
  togglePreviewShortcut: string
  openTagShortcut: string
  openSettingsShortcut: string
}

interface SettingsState extends Settings {
  resolvedTheme: 'dark' | 'light'
  setTheme: (theme: ThemeMode) => void
  setLanguage: (lang: LanguageMode) => void
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
  setToggleFilterShortcut: (shortcut: string) => void
  setTogglePreviewShortcut: (shortcut: string) => void
  setOpenTagShortcut: (shortcut: string) => void
  setOpenSettingsShortcut: (shortcut: string) => void
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

function resolveLanguage(mode: LanguageMode): string {
  if (mode !== 'auto') return mode
  const sysLang = navigator.language || 'zh-CN'
  if (sysLang.startsWith('zh-TW') || sysLang.startsWith('zh-Hant')) return 'zh-TW'
  if (sysLang.startsWith('zh')) return 'zh-CN'
  if (sysLang.startsWith('en')) return 'en'
  return 'zh-CN'
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
  language: 'auto',
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
  batchPasteSeparator: '\n',
  toggleFilterShortcut: 'CommandOrControl+F',
  togglePreviewShortcut: 'Alt',
  openTagShortcut: 'T',
  openSettingsShortcut: 'CommandOrControl+,'
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

  setLanguage: (lang) => {
    set({ language: lang })
    const resolved = resolveLanguage(lang)
    i18n.changeLanguage(resolved)
    window.api.setLanguage?.(resolved)
    get().saveSettings()
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

  setToggleFilterShortcut: (shortcut) => {
    set({ toggleFilterShortcut: shortcut })
    get().saveSettings()
  },

  setTogglePreviewShortcut: (shortcut) => {
    set({ togglePreviewShortcut: shortcut })
    get().saveSettings()
  },

  setOpenTagShortcut: (shortcut) => {
    set({ openTagShortcut: shortcut })
    get().saveSettings()
  },

  setOpenSettingsShortcut: (shortcut) => {
    set({ openSettingsShortcut: shortcut })
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
      language: state.language,
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
      batchPasteSeparator: state.batchPasteSeparator,
      toggleFilterShortcut: state.toggleFilterShortcut,
      togglePreviewShortcut: state.togglePreviewShortcut,
      openTagShortcut: state.openTagShortcut,
      openSettingsShortcut: state.openSettingsShortcut
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
