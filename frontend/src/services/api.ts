import { apiRequest } from './apiClient'

// The types below mirror the FastAPI models in backend/app/models so the
// client stays in lockstep with the backend API surface.

export interface WordTimestamp {
  word: string
  start: number
  end: number
}

export interface PauseInfo {
  duration: number
  start: number
  end: number
}

export interface TranscriptionResult {
  text: string
  duration: number
  words: WordTimestamp[]
  eye_contact_percentage?: number | null
}

export interface SpeechMetrics {
  duration_seconds: number
  word_count: number
  words_per_minute: number
  filler_word_count: number
  filler_ratio: number
  pause_count: number
  total_pause_seconds: number
  average_pause_seconds: number
  energy_rms: number
  energy_peak: number
}

export interface MetricScore {
  score: number
  rationale: string
}

export interface EvaluationResult {
  overall_score: number
  clarity: MetricScore
  confidence: MetricScore
  structure: MetricScore
  eye_contact_percentage?: number | null
  strengths: string[]
  improvements: string[]
  source: string
}

export interface QuestionAnswerInput {
  question: string
  transcript: string
  duration_seconds: number
  words: WordTimestamp[]
}

export interface QuestionAnswer extends QuestionAnswerInput {
  metrics: SpeechMetrics | null
  evaluation: EvaluationResult | null
  wpm: number | null
  filler_word_count: number | null
  filler_breakdown: Record<string, number>
  pause_count: number
  pauses: PauseInfo[]
}

export interface SessionCreatePayload {
  title: string
  transcript?: string | null
  questions?: QuestionAnswerInput[] | null
}

export interface SessionRecord {
  id: string
  title: string
  created_at: string
  transcription: TranscriptionResult | null
  metrics: SpeechMetrics | null
  evaluation: EvaluationResult | null
  questions: QuestionAnswer[]
}

export interface SessionOverview {
  id: string
  title: string
  score: number | null
  created_at: string
  status: string
}

export interface FeedbackCreatePayload {
  session_id: string
  rating: number
  comment: string
}

export interface FeedbackRecord extends FeedbackCreatePayload {
  id: string
}

export interface AnalyticsSummary {
  session_count: number
  evaluated_session_count: number
  average_score: number | null
}

const SESSIONS_PATH = '/api/v1/sessions'

export function createSession(
  payload: SessionCreatePayload,
): Promise<SessionRecord> {
  return apiRequest<SessionRecord>(SESSIONS_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function listSessions(): Promise<SessionOverview[]> {
  return apiRequest<SessionOverview[]>(SESSIONS_PATH)
}

export function getSession(sessionId: string): Promise<SessionRecord> {
  return apiRequest<SessionRecord>(`${SESSIONS_PATH}/${sessionId}`)
}

export function createFeedback(
  sessionId: string,
  payload: FeedbackCreatePayload,
): Promise<FeedbackRecord> {
  return apiRequest<FeedbackRecord>(`${SESSIONS_PATH}/${sessionId}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function transcribeAudio(
  file: Blob,
  filename = 'audio.webm',
): Promise<TranscriptionResult> {
  const formData = new FormData()
  formData.append('file', file, filename)
  return apiRequest<TranscriptionResult>('/api/v1/audio/transcribe', {
    method: 'POST',
    body: formData,
  })
}

export function calculateMetrics(
  transcription: TranscriptionResult,
): Promise<SpeechMetrics> {
  return apiRequest<SpeechMetrics>('/api/v1/audio/metrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transcription),
  })
}

export function evaluateInterview(
  transcription: TranscriptionResult,
): Promise<EvaluationResult> {
  return apiRequest<EvaluationResult>('/api/v1/interview/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transcription),
  })
}

export function analyzeInterview(
  transcription: TranscriptionResult,
): Promise<{ transcription: TranscriptionResult; metrics: SpeechMetrics; evaluation: EvaluationResult }> {
  return apiRequest<{ transcription: TranscriptionResult; metrics: SpeechMetrics; evaluation: EvaluationResult }>(
    '/api/v1/interview/analyze',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transcription),
    },
  )
}

export function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  return apiRequest<AnalyticsSummary>('/api/v1/analytics/summary')
}