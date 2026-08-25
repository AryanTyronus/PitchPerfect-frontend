export interface Question {
  id: string
  sessionId: string
  number: number
  total: number
  prompt: string
}

export type RecordingState =
  | 'READY'
  | 'RECORDING'
  | 'RECORDED'
  | 'UPLOADING'
  | 'PROCESSING'
  | 'UPLOADED'
  | 'ERROR'

export type InterviewerUiState = 'IDLE' | 'ASKING' | 'LISTENING' | 'THINKING'

export interface RecordedMedia {
  /** Composite A/V recording, used for local playback preview only. */
  blob: Blob
  url: string
  mimeType: string
  durationSeconds: number
  /** Isolated lightweight audio-only blob sent to transcription. */
  audioBlob: Blob
  audioMimeType: string
}
