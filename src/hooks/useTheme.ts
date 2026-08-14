import { createContext, useContext } from 'react'

export const THEMES = ['ink', 'space'] as const
export type ThemeName = (typeof THEMES)[number]

export const THEME_STORAGE_KEY = 'pitchperfect-theme'

/** Browser-chrome colour per theme (meta theme-color only takes serialized colours). */
export const THEME_CHROME_COLORS: Record<ThemeName, string> = {
  ink: '#1b1c22',
  space: '#191632',
}

export interface ThemeContextValue {
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext)
  if (value === null) {
    return {
      theme: 'ink',
      setTheme: () => undefined,
      toggleTheme: () => undefined,
    }
  }
  return value
}