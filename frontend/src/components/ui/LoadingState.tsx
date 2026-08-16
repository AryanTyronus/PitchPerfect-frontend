interface LoadingStateProps {
  title: string
  message?: string
}

export function LoadingState({ title, message }: LoadingStateProps) {
  return (
    <div className="state-panel" role="status" aria-live="polite">
      <div className="loader" aria-hidden="true" />
      <h2>{title}</h2>
      {message ? <p>{message}</p> : null}
    </div>
  )
}
