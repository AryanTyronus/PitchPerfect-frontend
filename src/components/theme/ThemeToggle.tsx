import { THEMES, useTheme } from '../../hooks/useTheme'
import type { ThemeName } from '../../hooks/useTheme'

const LABELS: Record<ThemeName, string> = {
  ink: 'Ink',
  space: 'Space',
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div
      aria-label="Color theme"
      className="theme-toggle"
      data-od-id="theme-toggle"
      role="group"
    >
      {THEMES.map((name) => (
        <button
          aria-pressed={theme === name}
          className={`theme-toggle-option${theme === name ? ' is-active' : ''}`}
          key={name}
          onClick={() => setTheme(name)}
          type="button"
        >
          {LABELS[name]}
        </button>
      ))}
    </div>
  )
}