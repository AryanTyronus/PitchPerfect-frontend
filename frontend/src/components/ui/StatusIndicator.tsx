interface StatusIndicatorProps {
  label: string
  tone?: 'idle' | 'live' | 'success' | 'warning' | 'error'
}

export function StatusIndicator({
  label,
  tone = 'idle',
}: StatusIndicatorProps) {
  return (
    <span className={`status status-${tone}`}>
      <span aria-hidden="true" />
      {label}
    </span>
  )
}
