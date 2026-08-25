import { useCallback, useEffect, useState } from 'react'
import { DisqualifiedBanner } from '../components/results/DisqualifiedBanner'
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
import type { EvaluationResult, SubScores } from '../types/evaluation'

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

const PRACTICE_TIPS: Record<keyof SubScores, string> = {
  clarity: 'Slow down and replace filler words with deliberate pauses.',
  relevance:
    'Open by directly answering the question before adding any context.',
  professionalism:
    'Keep your examples workplace-appropriate and neutral in tone.',
  structure:
    'Practice a 90-second answer with a clear setup, action, and measurable result.',
  impact: 'Close every answer with a concrete, quantified outcome.',
}

const SUB_LABELS: Record<keyof SubScores, string> = {
  clarity: 'clarity',
  relevance: 'relevance',
  professionalism: 'professionalism',
  structure: 'structure',
  impact: 'impact',
}

function nextPracticeTip(subScores: SubScores): string {
  const weakest = (Object.keys(PRACTICE_TIPS) as Array<keyof SubScores>).reduce(
    (a, b) => (subScores[b] < subScores[a] ? b : a),
    'clarity' as keyof SubScores,
  )
  return `${PRACTICE_TIPS[weakest]} Focus next on ${SUB_LABELS[weakest]}.`
}

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
          // A zero-score disqualified evaluation means no usable speech was
          // captured — show the dedicated no-speech state instead of results.
          const isNoSpeech = result.disqualified && result.score === 0
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

      {result.disqualified && (
        <Reveal delay={60}>
          <DisqualifiedBanner message={result.feedback || undefined} />
        </Reveal>
      )}

      <section
        className="debrief-hero"
        aria-labelledby="overall-performance"
        data-od-id="overall-performance"
      >
        <Reveal className="debrief-score">
          <p id="overall-performance" className="debrief-label">
            Overall Score
          </p>
          <ScoreRing score={result.score} animate />
          <p className="debrief-note">
            An overall read of the communication signals below.
          </p>
        </Reveal>
        <div className="debrief-metrics">
          <Reveal delay={110}>
            <h2>How your speech read</h2>
          </Reveal>
          <Reveal delay={150}>
            <RibbonChannels
              subScores={result.sub_scores}
              eyeContactPercentage={result.eyeContactPercentage}
              animate
            />
          </Reveal>
        </div>
      </section>

      <section className="feedback-section" aria-labelledby="feedback-heading">
        <Reveal>
          <h2 id="feedback-heading">Coaching notes</h2>
        </Reveal>
        <div className="feedback-grid">
          <div className="feedback-col">
            <Reveal delay={100} dataOdId="feedback-notes">
              <blockquote className="feedback-quote">
                {result.feedback ||
                  'The evaluator did not return written notes for this response.'}
              </blockquote>
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
          <p>{nextPracticeTip(result.sub_scores)}</p>
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
