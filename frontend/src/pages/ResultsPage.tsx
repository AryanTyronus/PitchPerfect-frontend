import { useCallback, useEffect, useState } from 'react'
import { FeedbackList } from '../components/results/FeedbackList'
import { ScoreRing } from '../components/results/ScoreRing'
import { Reveal } from '../components/motion/Reveal'
import { RIBBON_WORDS } from '../components/ribbon/ribbonPresets'
import { RibbonChannels } from '../components/ribbon/RibbonChannels'
import { SpeechRibbon } from '../components/ribbon/SpeechRibbon'
import { Button } from '../components/ui/Button'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { sessionsApi } from '../services/sessionsApi'
import type { ApiError } from '../types/api'
import type { EvaluationResult } from '../types/evaluation'

interface ResultsPageProps {
  onNavigate: (path: string) => void
  sessionId: string
}

type ResultsLoadState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'error' }
  | { status: 'no_speech' }
  | { status: 'ready'; result: EvaluationResult }

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
  )
}

export function ResultsPage({ onNavigate, sessionId }: ResultsPageProps) {
  const [state, setState] = useState<ResultsLoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setState({ status: 'loading' })

    async function loadResult() {
      try {
        const result = await sessionsApi.getResult(sessionId)
        if (active) {
          const isNoSpeech =
            result.overallScore === 0 &&
            (result.metrics.some((m) => m.score === 0 && m.label !== 'Eye Contact') ||
              result.strengths.length === 0)
          if (isNoSpeech) {
            setState({ status: 'no_speech' })
          } else {
            setState({ status: 'ready', result })
          }
        }
      } catch (error) {
        if (!active) {
          return
        }
        if (isApiError(error) && error.code === 'EVALUATION_FAILED') {
          setState({ status: 'unavailable' })
          return
        }
        setState({ status: 'error' })
      }
    }

    void loadResult()

    return () => {
      active = false
    }
  }, [attempt, sessionId])

  const retry = useCallback(() => {
    setAttempt((current) => current + 1)
  }, [])

  if (state.status === 'loading') {
    return (
      <LoadingState
        message="Fetching your performance report."
        title="Loading your results"
      />
    )
  }

  if (state.status === 'unavailable') {
    return (
      <div className="state-panel" role="status">
        <div className="loader" aria-hidden="true" />
        <h2>Your results are still processing</h2>
        <p>Evaluation is still running. Check again in a moment.</p>
        <Button onClick={retry} variant="secondary">
          Check Again
        </Button>
      </div>
    )
  }

  if (state.status === 'no_speech') {
    return (
      <div className="state-panel no-speech-state" role="status">
        <div className="no-speech-icon" aria-hidden="true">🎤</div>
        <h2>No Speech Detected</h2>
        <p>Your recording appears to be empty, too short, or contains no audible speech.</p>
        <p className="no-speech-hint">Please record a clear answer of at least 3 seconds.</p>
        <Button onClick={() => onNavigate('/setup')} variant="primary">
          Start New Practice
        </Button>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <ErrorState
        actionLabel="Try Again"
        message="We could not load your results. Please try again."
        onAction={retry}
        title="Your results couldn't be loaded"
      />
    )
  }

  const { result } = state

  return (
    <div className="results-page" data-od-id="results">
      <header className="results-header">
        <div className="results-header-content">
          <Reveal>
            <p className="eyebrow">Coaching debrief</p>
          </Reveal>
          <Reveal delay={50}>
            <h1>Your performance</h1>
          </Reveal>
          <Reveal delay={100} as="p" className="results-subtitle">
            Here's how you performed in this practice session.
          </Reveal>
        </div>
        <Reveal delay={120}>
          <span className="results-meta">
            Session <span className="mono">{result.sessionId}</span>
          </span>
        </Reveal>
      </header>

      <section
        className="debrief-hero"
        aria-labelledby="overall-performance"
        data-od-id="overall-performance"
      >
        <Reveal className="debrief-score">
          <p id="overall-performance" className="debrief-label">
            Overall Score
          </p>
          <ScoreRing score={result.overallScore} animate />
          <p className="debrief-note">
            An overall read of the five communication signals below.
          </p>
        </Reveal>
        <div className="debrief-metrics">
          <Reveal delay={110}>
            <h2>How your speech read</h2>
          </Reveal>
          <Reveal delay={150}>
            <RibbonChannels metrics={result.metrics} animate />
          </Reveal>
        </div>
      </section>

      <section className="feedback-section" aria-labelledby="feedback-heading">
        <Reveal>
          <h2 id="feedback-heading">Coaching notes</h2>
        </Reveal>
        <div className="feedback-grid">
          <div className="feedback-col">
            <Reveal delay={60}>
              <p className="eyebrow">What worked</p>
            </Reveal>
            <Reveal delay={100} dataOdId="feedback-strengths">
              <FeedbackList
                items={result.strengths}
                kind="strength"
                title="What You Did Well"
              />
            </Reveal>
          </div>
          <div className="feedback-col">
            <Reveal delay={140}>
              <p className="eyebrow">What to improve</p>
            </Reveal>
            <Reveal delay={180} dataOdId="feedback-improvements">
              <FeedbackList
                items={result.improvements}
                kind="improvement"
                title="Areas to Improve"
              />
            </Reveal>
          </div>
        </div>
      </section>

      <section
        className="next-practice"
        aria-labelledby="next-practice-heading"
        data-od-id="next-practice"
      >
        <Reveal className="next-practice-copy">
          <p className="eyebrow">Your Next Rep</p>
          <h2 id="next-practice-heading">Recommended Next Practice</h2>
          <p>{result.nextPractice}</p>
        </Reveal>
        <Reveal delay={120}>
          <Button data-od-id="cta-practice-again" onClick={() => onNavigate('/setup')}>
            Practice Again
          </Button>
        </Reveal>
      </section>

      <div className="results-flow" aria-hidden="true">
        <SpeechRibbon
          flow="forward"
          intensity={0.45}
          stateLabel="The loop continues"
          variant="loop"
          words={RIBBON_WORDS.loop}
        />
      </div>
    </div>
  )
}