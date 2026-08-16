import { env } from '../config/env'
import {
  MAX_TIMED_SECONDS,
  WARNING_SECONDS,
  questionBanks,
} from '../data/questionBanks'
import { mockSessionsApi } from '../mocks/mockSessionsApi'
import { ApiClientError } from './apiClient'
import * as api from './api'
import type { EvaluationResult as BackendEvaluationResult, TranscriptionResult } from './api'
import type { SessionsApi, UploadResponse, UploadResponseOptions } from '../types/api'
import type { EvaluationResult } from '../types/evaluation'
import type { Question, RecordedMedia } from '../types/interview'
import type {
  Session,
  SessionConfig,
  SessionState,
  SessionStatus,
} from '../types/session'

/**
 * The FastAPI backend owns session persistence plus the real STT/evaluation
 * work, but it does not yet model the interview state machine (question bank,
 * per-question progression, answer submission) that the UI drives. This bridge
 * keeps a small client-side runtime alongside each backend session so the
 * existing hooks and pages keep working against the real API.
 */
interface SessionRuntime {
  config: SessionConfig
  questionIndex: number
  startedAt: number | null
  responseStarted: boolean
  uploadAccepted: boolean
  evaluationStatus: 'idle' | 'processing' | 'ready' | 'failed'
  transcription: TranscriptionResult | null
  evaluation: BackendEvaluationResult | null
  evaluationPromise: Promise<BackendEvaluationResult> | null
}

const runtimes = new Map<string, SessionRuntime>()

function requireRuntime(sessionId: string): SessionRuntime {
  const runtime = runtimes.get(sessionId)
  if (!runtime) {
    throw new ApiClientError(
      'Session unavailable. Please start a new practice session.',
      404,
    )
  }
  return runtime
}

function questionCount(config: SessionConfig): number {
  return questionBanks[config.category][config.difficulty].length
}

function currentQuestionId(sessionId: string, number: number): string {
  return `${sessionId}-question-${number}`
}

function toSession(sessionId: string, runtime: SessionRuntime): Session {
  const remainingSeconds =
    runtime.config.mode === 'timed' ? MAX_TIMED_SECONDS : null
  return {
    id: sessionId,
    config: runtime.config,
    state: 'CREATED',
    currentQuestionNumber: runtime.questionIndex + 1,
    totalQuestions: questionCount(runtime.config),
    remainingSeconds,
    warning: false,
  }
}

function toStatus(sessionId: string, runtime: SessionRuntime): SessionStatus {
  const remainingSeconds = getRemainingSeconds(runtime)
  const state: SessionState =
    runtime.evaluationStatus === 'ready'
      ? 'EVALUATED'
      : runtime.uploadAccepted
        ? 'PROCESSING'
        : runtime.responseStarted
          ? 'ACTIVE'
          : 'CREATED'
  return {
    sessionId,
    state,
    mode: runtime.config.mode,
    questionId: currentQuestionId(sessionId, runtime.questionIndex + 1),
    questionNumber: runtime.questionIndex + 1,
    totalQuestions: questionCount(runtime.config),
    remainingSeconds,
    warning:
      remainingSeconds !== null && remainingSeconds <= WARNING_SECONDS,
    responseStarted: runtime.responseStarted,
    uploadAccepted: runtime.uploadAccepted,
    evaluationStatus: runtime.evaluationStatus,
  }
}

function getRemainingSeconds(runtime: SessionRuntime): number | null {
  if (runtime.config.mode !== 'timed' || runtime.startedAt === null) {
    return runtime.config.mode === 'timed' ? MAX_TIMED_SECONDS : null
  }
  const elapsedSeconds = Math.floor((Date.now() - runtime.startedAt) / 1000)
  return Math.max(MAX_TIMED_SECONDS - elapsedSeconds, 0)
}

function clampScore(value: unknown, fallback = 0): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) {
    return fallback
  }
  return Math.round(Math.min(Math.max(numeric, 0), 100))
}

function toUiEvaluation(
  sessionId: string,
  evaluation: BackendEvaluationResult,
  transcriptionEyeContact?: number | null,
): EvaluationResult {
  const strengths = Array.isArray(evaluation.strengths)
    ? evaluation.strengths.map(String)
    : []
  const improvements = Array.isArray(evaluation.improvements)
    ? evaluation.improvements.map(String)
    : []

  // Prefer the evaluation's own value, falling back to the percentage that was
  // attached to the transcription we sent up (the backend echoes it back).
  const rawEyeContact =
    evaluation.eye_contact_percentage ?? transcriptionEyeContact ?? null
  const eyeContactPercentage =
    typeof rawEyeContact === 'number' && Number.isFinite(rawEyeContact)
      ? clampScore(rawEyeContact)
      : null

  const metrics: EvaluationResult['metrics'] = [
    { label: 'Clarity', score: clampScore(evaluation.clarity?.score) },
    { label: 'Confidence', score: clampScore(evaluation.confidence?.score) },
    { label: 'Structure', score: clampScore(evaluation.structure?.score) },
  ]
  if (eyeContactPercentage !== null) {
    metrics.push({ label: 'Eye Contact', score: eyeContactPercentage })
  }

  return {
    sessionId,
    overallScore: clampScore(evaluation.overall_score),
    metrics,
    eyeContactPercentage,
    strengths,
    improvements,
    nextPractice:
      improvements[0] ??
      'Practice another answer with a clear opening, structure, and close.',
  }
}

function toStatusFromRecord(
  sessionId: string,
  record: api.SessionRecord,
): SessionStatus {
  const ready = record.evaluation !== null
  const questionNumber = Math.max(record.questions.length, 1)
  return {
    sessionId,
    state: ready ? 'EVALUATED' : 'ACTIVE',
    mode: 'free',
    questionId: currentQuestionId(sessionId, 1),
    questionNumber: 1,
    totalQuestions: questionNumber,
    remainingSeconds: null,
    warning: false,
    responseStarted: false,
    uploadAccepted: record.transcription !== null,
    evaluationStatus: ready ? 'ready' : 'idle',
  }
}

function questionForRecord(sessionId: string, record: api.SessionRecord): Question {
  const first = record.questions[0]
  return {
    id: currentQuestionId(sessionId, 1),
    sessionId,
    number: 1,
    total: Math.max(record.questions.length, 1),
    prompt: first?.question ?? 'Answer the current question.',
  }
}

export const fastApiSessionsApi: SessionsApi = {
  async createSession(config: SessionConfig): Promise<Session> {
    const record = await api.createSession({
      title: `${config.category} · ${config.difficulty}`,
    })

    const runtime: SessionRuntime = {
      config,
      questionIndex: 0,
      startedAt: null,
      responseStarted: config.mode === 'free',
      uploadAccepted: false,
      evaluationStatus: 'idle',
      transcription: null,
      evaluation: null,
      evaluationPromise: null,
    }
    runtimes.set(record.id, runtime)

    return toSession(record.id, runtime)
  },

  async beginResponse(sessionId: string): Promise<SessionStatus> {
    const runtime = requireRuntime(sessionId)
    runtime.responseStarted = true
    if (runtime.config.mode === 'timed' && runtime.startedAt === null) {
      runtime.startedAt = Date.now()
    }
    return toStatus(sessionId, runtime)
  },

  async getCurrentQuestion(sessionId: string): Promise<Question> {
    const runtime = runtimes.get(sessionId)
    if (runtime) {
      const bank = questionBanks[runtime.config.category][runtime.config.difficulty]
      const number = Math.min(runtime.questionIndex + 1, bank.length)
      return {
        id: currentQuestionId(sessionId, number),
        sessionId,
        number,
        total: bank.length,
        prompt: bank[number - 1],
      }
    }
    // No client-side runtime (e.g. after a page refresh): hydrate from the
    // persisted backend record.
    return questionForRecord(sessionId, await api.getSession(sessionId))
  },

  async getSessionStatus(sessionId: string): Promise<SessionStatus> {
    // Surface backend connectivity / session existence failures to the UI.
    const record = await api.getSession(sessionId)

    const runtime = runtimes.get(sessionId)
    if (!runtime) {
      return toStatusFromRecord(sessionId, record)
    }

    if (
      runtime.evaluationStatus === 'processing' &&
      runtime.evaluationPromise
    ) {
      try {
        await runtime.evaluationPromise
      } catch {
        // Rejection is recorded on the runtime by uploadResponse.
      }
    }

    return toStatus(sessionId, runtime)
  },

  async uploadResponse(
    sessionId: string,
    media: RecordedMedia,
    options?: UploadResponseOptions,
  ): Promise<UploadResponse> {
    const runtime = requireRuntime(sessionId)

    if (runtime.uploadAccepted) {
      return {
        accepted: true,
        status: 'received',
        message: 'Response already received.',
      }
    }

    runtime.uploadAccepted = true
    runtime.evaluationStatus = 'processing'

    // Transcribe the full recording, then kick off evaluation in the
    // background so the processing page can surface the real analysis time.
    const transcription: TranscriptionResult = {
      ...(await api.transcribeAudio(
        media.blob,
        media.mimeType.includes('wav') ? 'audio.wav' : 'audio.webm',
      )),
      eye_contact_percentage: options?.eyeContactPercentage ?? null,
    }

    if (!transcription.text.trim()) {
      runtime.evaluationStatus = 'failed'
      throw new ApiClientError(
        'No speech was detected in your recording. Please try again.',
        422,
      )
    }

    runtime.transcription = transcription
    runtime.evaluationPromise = api
      .evaluateInterview(transcription)
      .then((evaluation) => {
        runtime.evaluation = evaluation
        runtime.evaluationStatus = 'ready'
        return evaluation
      })
      .catch((error: unknown) => {
        runtime.evaluationStatus = 'failed'
        throw error
      })

    return {
      accepted: true,
      status: 'received',
      message: 'Response received and queued for evaluation.',
    }
  },

  async getResult(sessionId: string): Promise<EvaluationResult> {
    const runtime = runtimes.get(sessionId)

    if (runtime?.evaluationPromise) {
      try {
        await runtime.evaluationPromise
      } catch {
        throw new ApiClientError(
          'The evaluation failed for this session.',
          409,
          'EVALUATION_FAILED',
        )
      }
    }

    if (runtime?.evaluation) {
      return toUiEvaluation(
        sessionId,
        runtime.evaluation,
        runtime.transcription?.eye_contact_percentage,
      )
    }

    if (runtime?.evaluationStatus === 'failed') {
      throw new ApiClientError(
        'The evaluation failed for this session.',
        409,
        'EVALUATION_FAILED',
      )
    }

    // No client-side runtime (e.g. after a page refresh): hydrate the result
    // from the persisted backend record.
    const record = await api.getSession(sessionId)
    if (record.evaluation) {
      return toUiEvaluation(
        sessionId,
        record.evaluation,
        record.transcription?.eye_contact_percentage,
      )
    }

    throw new ApiClientError(
      'Evaluation results are not ready yet.',
      409,
      'EVALUATION_FAILED',
    )
  },
}

export const sessionsApi: SessionsApi = env.useMockApi
  ? mockSessionsApi
  : fastApiSessionsApi