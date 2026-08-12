import { useState } from 'react'
import { OptionGroup } from '../components/setup/OptionGroup'
import { Button } from '../components/ui/Button'
import { ErrorState } from '../components/ui/ErrorState'
import { sessionsApi } from '../services/sessionsApi'
import type {
  Difficulty,
  PracticeCategory,
  SessionConfig,
  SessionMode,
} from '../types/session'

interface PracticeSetupPageProps {
  onNavigate: (path: string) => void
}

const modeOptions = [
  { value: 'free', label: 'Free Practice', description: 'Practice without a hard time limit.' },
  { value: 'timed', label: 'Timed Practice', description: '2 minutes per question.' },
] satisfies Array<{ value: SessionMode; label: string; description: string }>

const categoryOptions = [
  { value: 'job-interview', label: 'Job Interview' },
  { value: 'technical-interview', label: 'Technical Interview' },
  { value: 'behavioral-interview', label: 'Behavioral Interview' },
  { value: 'public-speaking', label: 'Public Speaking' },
  { value: 'college-interview', label: 'College/University Interview' },
] satisfies Array<{ value: PracticeCategory; label: string }>

const difficultyOptions = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
] satisfies Array<{ value: Difficulty; label: string }>

export function PracticeSetupPage({ onNavigate }: PracticeSetupPageProps) {
  const [config, setConfig] = useState<SessionConfig>({
    mode: 'timed',
    category: 'behavioral-interview',
    difficulty: 'intermediate',
  })
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startSession() {
    setIsCreating(true)
    setError(null)

    try {
      const session = await sessionsApi.createSession(config)
      onNavigate(`/interview/${session.id}`)
    } catch {
      setError('We could not create your session. Please check your connection and try again.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="setup-page">
      <section className="page-intro">
        <p className="eyebrow">Practice setup</p>
        <h1>Shape the room before you speak.</h1>
        <p>
          Choose the context, pace, and difficulty. The next phase will create
          sessions through FastAPI using this same service interface.
        </p>
      </section>

      {error ? (
        <ErrorState
          actionLabel="Try again"
          message={error}
          onAction={startSession}
          title="Session creation error"
        />
      ) : null}

      <section className="setup-form" aria-label="Practice configuration">
        <OptionGroup
          onChange={(mode) => setConfig((current) => ({ ...current, mode }))}
          options={modeOptions}
          title="Interview Mode"
          value={config.mode}
        />
        <OptionGroup
          onChange={(category) =>
            setConfig((current) => ({ ...current, category }))
          }
          options={categoryOptions}
          title="Practice Category"
          value={config.category}
        />
        <OptionGroup
          onChange={(difficulty) =>
            setConfig((current) => ({ ...current, difficulty }))
          }
          options={difficultyOptions}
          title="Difficulty"
          value={config.difficulty}
        />
        <Button disabled={isCreating} fullWidth onClick={startSession}>
          {isCreating ? 'Creating Session...' : 'Start Session'}
        </Button>
      </section>
    </div>
  )
}
