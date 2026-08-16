import type { EvaluationResult } from './evaluation'
import type { Question, RecordedMedia } from './interview'
import type { Session, SessionConfig, SessionStatus } from './session'

export interface ApiError {
  code:
    | 'SESSION_CREATION_FAILED'
    | 'SESSION_NOT_FOUND'
    | 'QUESTION_UNAVAILABLE'
    | 'UPLOAD_FAILED'
    | 'EVALUATION_FAILED'
    | 'INVALID_TRANSITION'
    | 'NETWORK_ERROR'
    | 'UNKNOWN_ERROR'
  message: string
}

export interface UploadResponse {
  accepted: boolean
  status: 'received' | 'rejected'
  message: string
}

export interface UploadResponseOptions {
  eyeContactPercentage?: number
}

export interface SessionsApi {
  createSession(config: SessionConfig): Promise<Session>
  beginResponse(sessionId: string): Promise<SessionStatus>
  getCurrentQuestion(sessionId: string): Promise<Question>
  getSessionStatus(sessionId: string): Promise<SessionStatus>
  uploadResponse(
    sessionId: string,
    media: RecordedMedia,
    options?: UploadResponseOptions,
  ): Promise<UploadResponse>
  getResult(sessionId: string): Promise<EvaluationResult>
}
