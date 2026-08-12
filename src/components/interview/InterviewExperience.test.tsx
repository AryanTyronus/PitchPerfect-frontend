/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InterviewerPanel } from './InterviewerPanel'
import { TimerPanel } from './TimerPanel'
import { WarningBanner } from './WarningBanner'
import { RecordingControls } from '../recording/RecordingControls'
import { MockInterviewBackend } from '../../mocks/mockSessionsApi'
import type { SessionConfig } from '../../types/session'

const config: SessionConfig = {
  category: 'job-interview',
  difficulty: 'beginner',
  mode: 'timed',
}

describe('interview experience components', () => {
  it('renders backend remaining seconds in the session timer', () => {
    render(
      <TimerPanel
        expired={false}
        label="02:00"
        modeLabel="Time remaining"
        warning={false}
      />,
    )

    expect(screen.getByRole('timer')).toHaveTextContent('02:00')
  })

  it('renders the warning finish-period UI', () => {
    render(<WarningBanner state="WARNING" warning />)

    expect(screen.getByText('10 seconds remaining')).toBeInTheDocument()
    expect(screen.getByText('Finish your answer clearly and calmly.')).toBeInTheDocument()
  })

  it('renders time-expired UI and disables recording controls', () => {
    render(
      <>
        <WarningBanner state="TIME_EXPIRED" warning />
        <RecordingControls
          disabled
          durationSeconds={12}
          error={null}
          hasSubmitted={false}
          onRecordAgain={() => undefined}
          onStart={() => undefined}
          onStop={() => undefined}
          onSubmit={() => undefined}
          previewUrl="blob:recording"
          state="RECORDED"
          timeExpired
        />
      </>,
    )

    expect(screen.getByText("Time's up.")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start Recording' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Stop Recording' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Record Again' })).toBeDisabled()
  })

  it('prevents duplicate submissions after upload acceptance', () => {
    render(
      <RecordingControls
        disabled={false}
        durationSeconds={12}
        error={null}
        hasSubmitted
        onRecordAgain={() => undefined}
        onStart={() => undefined}
        onStop={() => undefined}
        onSubmit={() => undefined}
        previewUrl="blob:recording"
        state="RECORDED"
        timeExpired={false}
      />,
    )

    expect(screen.getByRole('button', { name: 'Submitted' })).toBeDisabled()
  })

  it('keeps interviewer UI state separate from backend session state', async () => {
    const backend = new MockInterviewBackend({ responseDelayMs: 0 })
    const session = await backend.createSession(config)
    await backend.getSessionStatus(session.id)

    render(<InterviewerPanel state="THINKING" />)

    expect(screen.getByText('Preparing evaluation')).toBeInTheDocument()
    expect((await backend.getSessionStatus(session.id)).state).toBe('ACTIVE')
  })
})
