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
    <section className="interviewer-panel" aria-label="AI interviewer">
      <div className={`interviewer-avatar interviewer-${state.toLowerCase()}`}>
        <span>AI</span>
      </div>
      <div>
        <p className="eyebrow">AI Interviewer</p>
        <h2>{stateCopy[state]}</h2>
        <StatusIndicator
          label={state === 'LISTENING' ? 'Listening' : 'Present'}
          tone={state === 'LISTENING' ? 'live' : 'idle'}
        />
      </div>
    </section>
  )
}
