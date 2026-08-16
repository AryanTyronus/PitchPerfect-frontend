import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
}

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}
