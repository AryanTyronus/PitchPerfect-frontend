import { Button } from './Button'

interface ErrorStateProps {
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function ErrorState({
  title,
  message,
  actionLabel,
  onAction,
}: ErrorStateProps) {
  return (
    <div className="state-panel state-panel-error" role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
      {actionLabel && onAction ? (
        <Button variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}
