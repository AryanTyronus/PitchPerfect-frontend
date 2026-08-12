import type { RecordingState } from '../../types/interview'
import { Button } from '../ui/Button'
import { StatusIndicator } from '../ui/StatusIndicator'

interface RecordingControlsProps {
  durationSeconds: number
  disabled: boolean
  error: string | null
  hasSubmitted: boolean
  onStart: () => void
  onStop: () => void
  onRecordAgain: () => void
  onSubmit: () => void
  previewUrl: string | null
  state: RecordingState
  timeExpired: boolean
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return `${minutes.toString().padStart(2, '0')}:${remaining
    .toString()
    .padStart(2, '0')}`
}

export function RecordingControls({
  durationSeconds,
  disabled,
  error,
  hasSubmitted,
  onRecordAgain,
  onStart,
  onStop,
  onSubmit,
  previewUrl,
  state,
  timeExpired,
}: RecordingControlsProps) {
  const isRecording = state === 'RECORDING'
  const isBusy = state === 'UPLOADING' || state === 'PROCESSING'
  const canSubmit = state === 'RECORDED' && !hasSubmitted

  return (
    <section className="recording-panel" aria-live="polite">
      <div className="recording-head">
        <StatusIndicator
          label={
            isRecording
              ? 'Recording'
              : state === 'RECORDED'
                ? 'Answer recorded'
                : state.toLowerCase()
          }
          tone={isRecording ? 'live' : state === 'ERROR' ? 'error' : 'idle'}
        />
        <strong>{formatDuration(durationSeconds)}</strong>
      </div>

      {previewUrl ? (
        <div className="preview-box">
          <span>Preview</span>
          <video controls src={previewUrl} />
        </div>
      ) : (
        <div className="preview-empty">Preview appears after recording.</div>
      )}

      {error ? <p className="inline-error">{error}</p> : null}
      {timeExpired ? (
        <p className="inline-note">Recording is closed because the timed answer expired.</p>
      ) : null}

      <div className="control-row">
        <Button disabled={disabled || isRecording || isBusy} onClick={onStart}>
          Start Recording
        </Button>
        <Button disabled={disabled || !isRecording || isBusy} onClick={onStop} variant="danger">
          Stop Recording
        </Button>
        <Button
          disabled={disabled || isRecording || isBusy || !previewUrl}
          onClick={onRecordAgain}
          variant="ghost"
        >
          Record Again
        </Button>
        <Button disabled={!canSubmit || isBusy} onClick={onSubmit} variant="secondary">
          {hasSubmitted ? 'Submitted' : isBusy ? 'Submitting...' : 'Submit Answer'}
        </Button>
      </div>
    </section>
  )
}
