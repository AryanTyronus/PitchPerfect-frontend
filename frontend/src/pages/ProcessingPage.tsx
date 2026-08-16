import { useEffect, useState } from 'react'
import { Badge } from '../components/ui/Badge'
import { ErrorState } from '../components/ui/ErrorState'
import { RIBBON_WORDS } from '../components/ribbon/ribbonPresets'
import { SpeechRibbon } from '../components/ribbon/SpeechRibbon'
import { sessionsApi } from '../services/sessionsApi'
import type { SessionStatus } from '../types/session'

interface ProcessingPageProps {
  onNavigate: (path: string) => void
  sessionId: string
}

export function ProcessingPage({ onNavigate, sessionId }: ProcessingPageProps) {
  const [status, setStatus] = useState<SessionStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<'speech' | 'analysis'>('speech')

  useEffect(() => {
    const timerId = window.setTimeout(() => setPhase('analysis'), 1500)
    return () => window.clearTimeout(timerId)
  }, [])

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

  const evaluating =
    status?.evaluationStatus === 'processing' || status?.evaluationStatus === 'queued'

  return (
    <div className="processing-page">
      <div className="processing-ribbon" data-od-id="analysis-stream">
        <SpeechRibbon
          flow="forward"
          frozen={false}
          intensity={phase === 'speech' ? 0.6 : 0.45}
          organizing={phase === 'analysis'}
          stateLabel={phase === 'speech' ? 'Listening to your speech' : 'Resolving into analysis'}
          variant="analysis"
          words={phase === 'speech' ? RIBBON_WORDS.speech : RIBBON_WORDS.analysis}
        />
      </div>
      <section className="processing-card" aria-live="polite" data-od-id="processing">
        <div className="processing-spectrum" aria-hidden="true">
          <i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i />
        </div>
        <Badge tone="success">Response received</Badge>
        <h1>Analyzing your response</h1>
        <p>
          Reading the shape of what you said — how clearly you opened, held
          structure, and landed the close.
        </p>
        <div className="processing-steps">
          <span className="step-complete">Response received</span>
          <span className={evaluating ? 'step-active' : undefined}>
            Analyzing communication
          </span>
          <span className={status?.state === 'EVALUATED' || status?.state === 'COMPLETED' ? 'step-complete' : undefined}>
            {status?.state || 'Synchronizing status'}
          </span>
        </div>
      </section>
    </div>
  )
}