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

  const urgent = warning && !expired

  return (
    <aside
      className={`timer-panel${urgent ? ' timer-warning' : ''}${expired ? ' timer-expired' : ''}`}
      role="timer"
      aria-label={`Time remaining ${label}`}
      data-od-id="timer-panel"
    >
      <span>{modeLabel}</span>
      <strong>{label}</strong>
      <div className="timer-brief">
        {urgent ? <Badge tone="warning">Final 10 seconds</Badge> : null}
        {expired ? <Badge tone="danger">Time expired</Badge> : null}
      </div>
    </aside>
  )
}