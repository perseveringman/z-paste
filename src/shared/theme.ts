export type ThemeMode = 'auto' | 'dark' | 'light'
export type ResolvedTheme = 'dark' | 'light'
export type AccentColor = 'orange' | 'purple' | 'blue' | 'green' | 'pink'

export function isThemeMode(value: string): value is ThemeMode {
  return value === 'auto' || value === 'dark' || value === 'light'
}

export function resolveThemeMode(
  theme: ThemeMode,
  systemTheme: ResolvedTheme
): ResolvedTheme {
  return theme === 'auto' ? systemTheme : theme
}

export function getThemeStatePatch(
  theme: ThemeMode,
  systemTheme: ResolvedTheme
): { theme: ThemeMode; resolvedTheme: ResolvedTheme } {
  return {
    theme,
    resolvedTheme: resolveThemeMode(theme, systemTheme),
  }
}
