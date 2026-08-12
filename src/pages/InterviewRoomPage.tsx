import { useEffect } from 'react'
import { CameraPreview } from '../components/interview/CameraPreview'
import { InterviewerPanel } from '../components/interview/InterviewerPanel'
import { QuestionPanel } from '../components/interview/QuestionPanel'
import { TimerPanel } from '../components/interview/TimerPanel'
import { WarningBanner } from '../components/interview/WarningBanner'
import { RecordingControls } from '../components/recording/RecordingControls'
import { Badge } from '../components/ui/Badge'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { StatusIndicator } from '../components/ui/StatusIndicator'
import { useCurrentQuestion } from '../hooks/useCurrentQuestion'
import { useMediaRecorder } from '../hooks/useMediaRecorder'
import { useSessionStatus } from '../hooks/useSessionStatus'
import { useSessionTimerPresentation } from '../hooks/useSessionTimerPresentation'
import { useTimerAudio } from '../hooks/useTimerAudio'
import { useTimerAudioTransitions } from '../hooks/useTimerAudioTransitions'
import { sessionsApi } from '../services/sessionsApi'
import type { InterviewerUiState } from '../types/interview'

interface InterviewRoomPageProps {
  onNavigate: (path: string) => void
  sessionId: string
}

export function InterviewRoomPage({
  onNavigate,
  sessionId,
}: InterviewRoomPageProps) {
  const { error: questionError, isLoading: questionLoading, question } =
    useCurrentQuestion(sessionId)
  const {
    error: statusError,
    isLoading: statusLoading,
    refresh: refreshStatus,
    status,
  } = useSessionStatus(sessionId)
  const timer = useSessionTimerPresentation(status)
  const recorder = useMediaRecorder()
  const timerAudio = useTimerAudio()
  const { cutoffRecording, state: recordingState } = recorder
  const timeExpired = status?.state === 'TIME_EXPIRED'
  const isProcessing =
    status?.state === 'PROCESSING' ||
    status?.state === 'EVALUATED' ||
    status?.state === 'COMPLETED' ||
    recorder.state === 'UPLOADING' ||
    recorder.state === 'PROCESSING'
  const hasSubmitted =
    status?.uploadAccepted ||
    status?.state === 'PROCESSING' ||
    status?.state === 'EVALUATED' ||
    status?.state === 'COMPLETED'

  useEffect(() => {
    if (timeExpired && recordingState === 'RECORDING') {
      cutoffRecording()
    }
  }, [cutoffRecording, recordingState, timeExpired])

  useTimerAudioTransitions(status, timerAudio)

  async function startAnswerRecording() {
    await timerAudio.unlockAudio()
    const recordingStarted = await recorder.startRecording()

    if (!recordingStarted) {
      return
    }

    try {
      await sessionsApi.beginResponse(sessionId)
      await refreshStatus()
    } catch {
      cutoffRecording()
      recorder.setError('The answer timer could not be started. Please try again.')
    }
  }

  async function submitAnswer() {
    if (hasSubmitted) {
      recorder.setError('This answer has already been submitted.')
      return
    }

    if (!recorder.recordedMedia) {
      recorder.setError('Record an answer before submitting.')
      return
    }

    recorder.setUploading()

    try {
      await sessionsApi.uploadResponse(sessionId, recorder.recordedMedia)
      recorder.setProcessing()
      await refreshStatus()
      onNavigate(`/processing/${sessionId}`)
    } catch {
      recorder.setError('Upload error. Please try submitting again.')
    }
  }

  const interviewerState: InterviewerUiState =
    recorder.state === 'RECORDING'
      ? 'LISTENING'
      : isProcessing
        ? 'THINKING'
        : question
          ? 'ASKING'
          : 'IDLE'

  if (questionError && !question) {
    return (
      <ErrorState
        actionLabel="Start over"
        message={questionError}
        onAction={() => onNavigate('/setup')}
        title="Question unavailable"
      />
    )
  }

  if (!question || !status || questionLoading || statusLoading) {
    return (
      <LoadingState
        message="Getting the current question and server-authoritative status."
        title="Preparing interview room"
      />
    )
  }

  return (
    <div className="interview-page">
      <section className="interview-header">
        <div>
          <p className="eyebrow">PitchPerfect interview room</p>
          <h1>Practice answer</h1>
        </div>
        <div className="header-status">
          <Badge tone={status.warning ? 'warning' : 'neutral'}>{status.state}</Badge>
          <StatusIndicator
            label={
              recorder.permissionError ? 'Microphone unavailable' : 'Microphone ready'
            }
            tone={recorder.permissionError ? 'error' : 'success'}
          />
        </div>
      </section>

      {statusError ? <p className="sync-warning">{statusError}</p> : null}
      <WarningBanner state={status.state} warning={status.warning} />

      <div className="interview-grid">
        <div className="interview-main">
          <QuestionPanel question={question} />
          <CameraPreview
            error={recorder.permissionError}
            isRecording={recorder.state === 'RECORDING'}
            isTimeExpired={timeExpired}
            microphoneEnabled={!recorder.permissionError && !timeExpired}
            stream={recorder.stream}
          />
        </div>
        <aside className="interview-side">
          <InterviewerPanel state={interviewerState} />
          <TimerPanel
            expired={timeExpired}
            label={timer.label}
            modeLabel={status.mode === 'timed' ? 'Time remaining' : 'Free practice'}
            warning={timer.isUrgent}
          />
          <RecordingControls
            disabled={timeExpired || isProcessing}
            durationSeconds={recorder.durationSeconds}
            error={recorder.recordingError}
            hasSubmitted={hasSubmitted}
            onRecordAgain={() => void startAnswerRecording()}
            onStart={() => void startAnswerRecording()}
            onStop={recorder.stopRecording}
            onSubmit={submitAnswer}
            previewUrl={recorder.recordedMedia?.url ?? null}
            state={recorder.state}
            timeExpired={timeExpired}
          />
        </aside>
      </div>
    </div>
  )
}
