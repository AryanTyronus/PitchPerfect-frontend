import { useEffect, useRef, useState } from 'react'
import { CameraPreview } from '../components/interview/CameraPreview'
import { InterviewerPanel } from '../components/interview/InterviewerPanel'
import { QuestionPanel } from '../components/interview/QuestionPanel'
import { TimerPanel } from '../components/interview/TimerPanel'
import { WarningBanner } from '../components/interview/WarningBanner'
import { RecordingControls } from '../components/recording/RecordingControls'
import { RIBBON_WORDS } from '../components/ribbon/ribbonPresets'
import { SpeechRibbon } from '../components/ribbon/SpeechRibbon'
import type { RibbonFlow } from '../components/ribbon/ribbonPresets'
import { Badge } from '../components/ui/Badge'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { StatusIndicator } from '../components/ui/StatusIndicator'
import { useCurrentQuestion } from '../hooks/useCurrentQuestion'
import { useEyeContactTracker } from '../hooks/useEyeContactTracker'
import { useMediaRecorder } from '../hooks/useMediaRecorder'
import { useSessionStatus } from '../hooks/useSessionStatus'
import { useSessionTimerPresentation } from '../hooks/useSessionTimerPresentation'
import { useTimerAudio } from '../hooks/useTimerAudio'
import { useTimerAudioTransitions } from '../hooks/useTimerAudioTransitions'
import { AudioStreamClient } from '../services/audioStream'
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
  const videoRef = useRef<HTMLVideoElement>(null)
  const { eyeContactPercentage } = useEyeContactTracker(
    videoRef,
    recorder.state === 'RECORDING',
  )
  const { cutoffRecording, state: recordingState } = recorder
  const [liveTranscript, setLiveTranscript] = useState('')
  const [liveStreamError, setLiveStreamError] = useState<string | null>(null)
  const streamClientRef = useRef<AudioStreamClient | null>(null)
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

  useEffect(() => {
    const client = new AudioStreamClient({
      onError: (message) => setLiveStreamError(message),
      onPartial: (message) => {
        const text = message.text?.trim()
        if (!text) {
          return
        }
        setLiveStreamError(null)
        setLiveTranscript((current) => (current ? `${current} ${text}` : text))
      },
    })
    streamClientRef.current = client

    return () => {
      client.close()
      streamClientRef.current = null
    }
  }, [])

  async function startAnswerRecording() {
    await timerAudio.unlockAudio()
    setLiveTranscript('')
    setLiveStreamError(null)
    streamClientRef.current?.connect()
    const recordingStarted = await recorder.startRecording((chunk) => {
      streamClientRef.current?.send(chunk)
    })

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
      await sessionsApi.uploadResponse(sessionId, recorder.recordedMedia, {
        eyeContactPercentage,
      })
      recorder.setProcessing()
      await refreshStatus()
      streamClientRef.current?.close()
      onNavigate(`/processing/${sessionId}`)
    } catch (error) {
      if (error instanceof Error && 'code' in error && (error as { code?: string }).code === 'NO_SPEECH_DETECTED') {
        recorder.setError('No speech detected. Please record a clear answer of at least 3 seconds.')
      } else {
        recorder.setError('Upload error. Please try submitting again.')
      }
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

  const isWarning = status?.warning || (timer.isUrgent && !timeExpired)

  const ribbon = (() => {
    if (timeExpired) {
      return {
        compact: false,
        flow: 'still',
        frozen: true,
        intensity: 0,
        label: 'Answer closed',
        pulsing: false,
        tone: 'danger',
      } as const
    }
    if (isWarning) {
      return {
        compact: true,
        flow: 'forward',
        frozen: false,
        intensity: 0.9,
        label: 'Final seconds — hold the close',
        pulsing: recorder.state === 'RECORDING',
        tone: 'warning',
      } as const
    }
    if (recorder.state === 'RECORDING') {
      return {
        compact: false,
        flow: 'forward',
        frozen: false,
        intensity: 0.72,
        label: 'Answer flowing',
        pulsing: true,
        tone: 'live',
      } as const
    }
    if (interviewerState === 'THINKING') {
      return {
        compact: false,
        flow: 'still',
        frozen: false,
        intensity: 0.18,
        label: 'Reading your answer',
        organizing: true,
        pulsing: false,
        tone: 'neutral',
      } as const
    }
    if (interviewerState === 'ASKING') {
      return {
        compact: false,
        flow: 'reverse',
        frozen: false,
        intensity: 0.42,
        label: 'Question open',
        pulsing: false,
        tone: 'neutral',
      } as const
    }
    if (interviewerState === 'LISTENING') {
      return {
        compact: false,
        flow: 'forward',
        frozen: false,
        intensity: 0.6,
        label: 'Listening',
        pulsing: true,
        tone: 'live',
      } as const
    }
    return {
      compact: false,
      flow: 'forward',
      frozen: false,
      intensity: 0.18,
      label: 'Ready',
      pulsing: false,
      tone: 'neutral',
    } as const
  })()

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
    <div className="interview-page" data-od-id="interview-room">
      <header className="interview-header">
        <div>
          <p className="eyebrow">Interview room</p>
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
      </header>

      <div className="interview-ribbon" data-od-id="answer-stream">
        <SpeechRibbon
          compact={ribbon.compact}
          flow={ribbon.flow as RibbonFlow}
          frozen={ribbon.frozen}
          intensity={ribbon.intensity}
          labelTone={ribbon.tone}
          organizing={(ribbon as { organizing?: boolean }).organizing ?? false}
          pulsing={ribbon.pulsing}
          stateLabel={ribbon.label}
          variant="stream"
          words={RIBBON_WORDS.speech}
        />
        <span className="interview-ribbon-scale" aria-hidden="true">
          so the takeaway —
        </span>
      </div>

      {liveStreamError ? (
        <p className="live-caption live-caption-error">{liveStreamError}</p>
      ) : liveTranscript ? (
        <p className="live-caption" data-od-id="live-transcript">
          {liveTranscript}
        </p>
      ) : null}

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
            videoRef={videoRef}
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