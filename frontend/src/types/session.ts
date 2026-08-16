export type SessionMode = 'free' | 'timed'

export type PracticeCategory =
  | 'job-interview'
  | 'technical-interview'
  | 'behavioral-interview'
  | 'public-speaking'
  | 'college-interview'

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export type SessionState =
  | 'CREATED'
  | 'ACTIVE'
  | 'WARNING'
  | 'PROCESSING'
  | 'TIME_EXPIRED'
  | 'EVALUATED'
  | 'COMPLETED'

export interface SessionConfig {
  mode: SessionMode
  category: PracticeCategory
  difficulty: Difficulty
}

export interface Session {
  id: string
  config: SessionConfig
  state: SessionState
  currentQuestionNumber: number
  totalQuestions: number
  remainingSeconds: number | null
  warning: boolean
}

export interface SessionStatus {
  sessionId: string
  state: SessionState
  mode: SessionMode
  questionId: string
  questionNumber: number
  totalQuestions: number
  remainingSeconds: number | null
  warning: boolean
  responseStarted: boolean
  uploadAccepted: boolean
  evaluationStatus: 'idle' | 'queued' | 'processing' | 'ready' | 'failed'
}
