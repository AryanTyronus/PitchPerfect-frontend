import type { ReactNode } from 'react'
import { ThemeToggle } from '../theme/ThemeToggle'
import { Button } from '../ui/Button'

interface AppShellProps {
  children: ReactNode
  onNavigate: (path: string) => void
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
        viewBox="0 0 24 24"
      >
        <path d="M3 12h2.2l1.6-5 2.6 10 2.2-7 1.6 4H21" />
      </svg>
    </span>
  )
}

export function AppShell({ children, onNavigate }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" data-od-id="brand" type="button" onClick={() => onNavigate('/')}>
          <BrandMark />
          <span>PitchPerfect</span>
        </button>
        <nav aria-label="Primary navigation" className="site-nav">
          <ThemeToggle />
          <Button variant="ghost" onClick={() => onNavigate('/setup')}>
            Practice
          </Button>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  )
}