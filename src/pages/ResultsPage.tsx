import { useEffect, useState } from 'react'
import { MetricBar } from '../components/results/MetricBar'
import { Button } from '../components/ui/Button'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { sessionsApi } from '../services/sessionsApi'
import type { EvaluationResult } from '../types/evaluation'

interface ResultsPageProps {
  onNavigate: (path: string) => void
  sessionId: string
}

export function ResultsPage({ onNavigate, sessionId }: ResultsPageProps) {
  const [result, setResult] = useState<EvaluationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadResult() {
      try {
        const nextResult = await sessionsApi.getResult(sessionId)
        if (active) {
          setResult(nextResult)
        }
      } catch {
        if (active) {
          setError('Result unavailable. Please try again after processing completes.')
        }
      }
    }

    void loadResult()

    return () => {
      active = false
    }
  }, [sessionId])

  if (error) {
    return (
      <ErrorState
        actionLabel="Practice again"
        message={error}
        onAction={() => onNavigate('/setup')}
        title="Result unavailable"
      />
    )
  }

  if (!result) {
    return <LoadingState title="Loading results" />
  }

  return (
    <div className="results-page">
      <section className="results-hero">
        <div>
          <p className="eyebrow">Feedback dashboard</p>
          <h1>Overall Score</h1>
        </div>
        <div className="score-ring">
          <strong>{result.overallScore}</strong>
          <span>/ 100</span>
        </div>
      </section>

      <section className="results-grid">
        <div className="metrics-panel">
          <h2>Communication metrics</h2>
          {result.metrics.map((metric) => (
            <MetricBar key={metric.label} metric={metric} />
          ))}
        </div>

        <div className="feedback-column">
          <article>
            <h2>What You Did Well</h2>
            <ul>
              {result.strengths.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article>
            <h2>Areas To Improve</h2>
            <ul>
              {result.improvements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article>
            <h2>Recommended Next Practice</h2>
            <p>{result.nextPractice}</p>
          </article>
        </div>
      </section>

      <div className="result-actions">
        <Button onClick={() => onNavigate('/setup')}>Practice Again</Button>
      </div>
    </div>
  )
}
