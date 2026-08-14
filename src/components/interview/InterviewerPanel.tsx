import type { InterviewerUiState } from '../../types/interview'
import { StatusIndicator } from '../ui/StatusIndicator'

interface InterviewerPanelProps {
  state: InterviewerUiState
}

const stateCopy: Record<InterviewerUiState, string> = {
  IDLE: 'Ready to begin',
  ASKING: 'Question asked',
  LISTENING: 'Listening to your answer',
  THINKING: 'Preparing evaluation',
}

export function InterviewerPanel({ state }: InterviewerPanelProps) {
  return (
    <section
      className={`interviewer-panel interviewer-${state.toLowerCase()}`}
      aria-label="AI interviewer"
      data-od-id="interviewer-panel"
    >
      <div className="interviewer-mark" aria-hidden="true">
        <div className="interviewer-wave">
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
      <div>
        <p className="eyebrow">AI Interviewer</p>
        <h2>{stateCopy[state]}</h2>
        <p className="interviewer-sub">
          <StatusIndicator
            label={state === 'LISTENING' ? 'Listening' : 'Present'}
            tone={state === 'LISTENING' ? 'live' : 'idle'}
          />
        </p>
      </div>
    </section>
  )
}