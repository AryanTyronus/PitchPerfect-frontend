import { Badge } from '../ui/Badge'

interface TimerPanelProps {
  label: string
  modeLabel: string
  warning: boolean
  expired: boolean
}

export function TimerPanel({
  expired,
  label,
  modeLabel,
  warning,
}: TimerPanelProps) {
  if (label === 'Untimed') {
    return null
  }

  return (
    <aside
      className={`timer-panel${warning ? ' timer-warning' : ''}${expired ? ' timer-expired' : ''}`}
      role="timer"
      aria-label={`Time remaining ${label}`}
    >
      <span>{modeLabel}</span>
      <strong>{warning && !expired ? '!' : null} {label}</strong>
      {warning ? <Badge tone="warning">Final 10 seconds</Badge> : null}
      {expired ? <Badge tone="danger">Time expired</Badge> : null}
    </aside>
  )
}
