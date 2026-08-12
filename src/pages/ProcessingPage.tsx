import { useEffect, useState } from 'react'
import { Badge } from '../components/ui/Badge'
import { ErrorState } from '../components/ui/ErrorState'
import { sessionsApi } from '../services/sessionsApi'
import type { SessionStatus } from '../types/session'

interface ProcessingPageProps {
  onNavigate: (path: string) => void
  sessionId: string
}

export function ProcessingPage({ onNavigate, sessionId }: ProcessingPageProps) {
  const [status, setStatus] = useState<SessionStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function poll() {
      try {
        const nextStatus = await sessionsApi.getSessionStatus(sessionId)
        if (!active) {
          return
        }

        setStatus(nextStatus)

        if (nextStatus.evaluationStatus === 'ready') {
          onNavigate(`/results/${sessionId}`)
        }
      } catch {
        if (active) {
          setError('Processing error. We could not reach the session status service.')
        }
      }
    }

    void poll()
    const intervalId = window.setInterval(() => void poll(), 1500)

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [onNavigate, sessionId])

  if (error) {
    return (
      <ErrorState
        actionLabel="Back to setup"
        message={error}
        onAction={() => onNavigate('/setup')}
        title="Processing unavailable"
      />
    )
  }

  return (
    <div className="processing-page">
      <section className="processing-card" aria-live="polite">
        <div className="processing-orbit" aria-hidden="true">
          <span />
          <span />
        </div>
        <Badge tone="success">Response received</Badge>
        <h1>Analyzing your response</h1>
        <p>
          Analyzing communication signals. The next phase will read this from
          GET /sessions/{'{session_id}'}/status.
        </p>
        <div className="processing-steps">
          <span className="step-complete">Response received</span>
          <span>Analyzing communication...</span>
          <span>{status?.state ?? 'Synchronizing status'}</span>
        </div>
      </section>
    </div>
  )
}
