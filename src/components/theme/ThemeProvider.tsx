import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ThemeContext,
  THEME_CHROME_COLORS,
  THEME_STORAGE_KEY,
} from '../../hooks/useTheme'
import type { ThemeName } from '../../hooks/useTheme'

function isTheme(value: string | null): value is ThemeName {
  return value === 'ink' || value === 'space'
}

function readInitialTheme(): ThemeName {
  if (typeof window === 'undefined') {
    return 'ink'
  }
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (isTheme(saved)) {
      return saved
    }
  } catch {
    /* storage unavailable — fall through */
  }
  return 'ink'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const initial = readInitialTheme()
    // Apply before first paint to avoid a flash of the wrong theme.
    document.documentElement.setAttribute('data-theme', initial)
    return initial
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)

    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (meta) {
      meta.content = THEME_CHROME_COLORS[theme]
    }
  }, [theme])

  const setTheme = (next: ThemeName) => {
    setThemeState(next)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      /* storage unavailable — preference is session-only */
    }
  }

  const toggleTheme = () => setTheme(theme === 'ink' ? 'space' : 'ink')

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}