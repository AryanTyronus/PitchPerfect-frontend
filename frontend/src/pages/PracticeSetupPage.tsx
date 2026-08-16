import { useState } from 'react'
import { OptionGroup } from '../components/setup/OptionGroup'
import { Reveal } from '../components/motion/Reveal'
import { RIBBON_WORDS } from '../components/ribbon/ribbonPresets'
import { SpeechRibbon } from '../components/ribbon/SpeechRibbon'
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
  {
    value: 'free',
    label: 'Free practice',
    description: 'Open-ended room — speak until your answer feels done.',
  },
  {
    value: 'timed',
    label: 'Timed practice',
    description: 'Two minutes per answer, with a calm countdown.',
  },
] satisfies Array<{ value: SessionMode; label: string; description: string }>

const categoryOptions = [
  {
    value: 'job-interview',
    label: 'Job interview',
    description: 'Experience, motivation, and fit for a specific role.',
  },
  {
    value: 'technical-interview',
    label: 'Technical interview',
    description: 'Design problems and tradeoffs, explained out loud.',
  },
  {
    value: 'behavioral-interview',
    label: 'Behavioral interview',
    description: 'Stories and situations that show how you work.',
  },
  {
    value: 'public-speaking',
    label: 'Public speaking',
    description: 'Talks, pitches, and updates delivered to an audience.',
  },
  {
    value: 'college-interview',
    label: 'College interview',
    description: 'Academic fit, interests, and what you bring to campus.',
  },
] satisfies Array<{ value: PracticeCategory; label: string; description: string }>

const difficultyOptions = [
  { value: 'beginner', label: 'Beginner', description: 'Direct questions, room to find your voice.' },
  { value: 'intermediate', label: 'Intermediate', description: 'Scenarios that ask for structure and evidence.' },
  { value: 'advanced', label: 'Advanced', description: 'Ambiguous questions under real pressure.' },
] satisfies Array<{ value: Difficulty; label: string; description: string }>

const modeLabels: Record<SessionMode, string> = {
  free: 'Free practice',
  timed: 'Timed · 2:00',
}

const categoryLabels: Record<PracticeCategory, string> = {
  'job-interview': 'Job interview',
  'technical-interview': 'Technical interview',
  'behavioral-interview': 'Behavioral',
  'public-speaking': 'Public speaking',
  'college-interview': 'College',
}

const difficultyLabels: Record<Difficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

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
      setError(
        'We could not create your session. Please check your connection and try again.',
      )
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="setup-page" data-od-id="setup">
      <section className="page-intro">
        <Reveal>
          <p className="eyebrow">Prepare</p>
        </Reveal>
        <Reveal delay={60}>
          <h1>Set the room. Then speak.</h1>
        </Reveal>
        <Reveal delay={120}>
          <p className="page-intro-lead">
            Choose the context, pace, and difficulty of this session. The room
            shapes itself around your answer.
          </p>
        </Reveal>
      </section>

      <div className="setup-ribbon" aria-hidden="true">
        <SpeechRibbon
          flow="forward"
          intensity={0.22}
          stateLabel="The room is ready to hear you"
          variant="stream"
          words={RIBBON_WORDS.speech}
        />
      </div>

      {error ? (
        <ErrorState
          actionLabel="Try again"
          message={error}
          onAction={startSession}
          title="Session creation error"
        />
      ) : null}

      <section className="setup-form" aria-label="Practice configuration">
        <Reveal delay={60}>
          <OptionGroup
            index="01"
            onChange={(mode) => setConfig((current) => ({ ...current, mode }))}
            options={modeOptions}
            title="Interview mode"
            value={config.mode}
          />
        </Reveal>
        <Reveal delay={140}>
          <OptionGroup
            index="02"
            onChange={(category) =>
              setConfig((current) => ({ ...current, category }))
            }
            options={categoryOptions}
            title="Practice category"
            value={config.category}
          />
        </Reveal>
        <Reveal delay={220}>
          <OptionGroup
            index="03"
            onChange={(difficulty) =>
              setConfig((current) => ({ ...current, difficulty }))
            }
            options={difficultyOptions}
            title="Difficulty"
            value={config.difficulty}
          />
        </Reveal>

        <Reveal delay={300}>
          <div className="setup-brief">
            <div className="setup-brief-copy">
              <p className="eyebrow">Session brief</p>
              <p className="setup-brief-config" aria-live="polite">
                <span>{categoryLabels[config.category]}</span>
                <span className="cfg-sep">·</span>
                <span>{modeLabels[config.mode]}</span>
                <span className="cfg-sep">·</span>
                <span>{difficultyLabels[config.difficulty]}</span>
              </p>
            </div>
            <Button
              data-od-id="cta-begin-session"
              disabled={isCreating}
              onClick={startSession}
            >
              {isCreating ? 'Reserving room...' : 'Begin session'}
            </Button>
          </div>
        </Reveal>
      </section>
    </div>
  )
}