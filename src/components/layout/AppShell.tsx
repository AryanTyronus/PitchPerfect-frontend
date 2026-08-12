import type { ReactNode } from 'react'
import { Button } from '../ui/Button'

interface AppShellProps {
  children: ReactNode
  onNavigate: (path: string) => void
}

export function AppShell({ children, onNavigate }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" type="button" onClick={() => onNavigate('/')}>
          <span className="brand-mark">P</span>
          <span>PitchPerfect</span>
        </button>
        <nav aria-label="Primary navigation">
          <Button variant="ghost" onClick={() => onNavigate('/setup')}>
            Practice
          </Button>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  )
}
