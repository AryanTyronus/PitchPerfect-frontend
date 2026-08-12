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
  blob: Blob
  url: string
  mimeType: string
  durationSeconds: number
}
