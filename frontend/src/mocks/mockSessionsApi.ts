import { MAX_TIMED_SECONDS, WARNING_SECONDS, questionBanks } from '../data/questionBanks'
import type { EvaluationResult } from '../types/evaluation'
import type { Question, RecordedMedia } from '../types/interview'
import type { ApiError, SessionsApi, UploadResponse } from '../types/api'
import type {
  Difficulty,
  Session,
  SessionConfig,
  SessionState,
  SessionStatus,
} from '../types/session'

type FailureFlag =
  | 'createSession'
  | 'getCurrentQuestion'
  | 'uploadResponse'
  | 'getResult'
  | 'evaluation'

interface MockBackendOptions {
  now?: () => number
  responseDelayMs?: number
  processingDelayMs?: number
  completionDelayMs?: number
  idFactory?: () => string
  failures?: Partial<Record<FailureFlag, boolean>>
}

interface MockSessionRecord {
  id: string
  config: SessionConfig
  state: SessionState
  questionIndex: number
  questionBank: string[]
  startedAt: number | null
  processingStartedAt: number | null
  uploadAccepted: boolean
  evaluationFailed: boolean
  processingTimerId: ReturnType<typeof setTimeout> | null
  completionTimerId: ReturnType<typeof setTimeout> | null
}

const validTransitions: Record<SessionState, SessionState[]> = {
  CREATED: ['ACTIVE'],
  ACTIVE: ['WARNING', 'TIME_EXPIRED', 'PROCESSING'],
  WARNING: ['TIME_EXPIRED', 'PROCESSING'],
  TIME_EXPIRED: ['PROCESSING'],
  PROCESSING: ['EVALUATED'],
  EVALUATED: ['COMPLETED'],
  COMPLETED: [],
}

export class MockApiError extends Error implements ApiError {
  readonly code: ApiError['code']

  constructor(code: ApiError['code'], message: string) {
    super(message)
    this.name = 'MockApiError'
    this.code = code
  }
}

function wait(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve()
  }

  return new Promise((resolve) => globalThis.setTimeout(resolve, ms))
}

function questionId(sessionId: string, questionNumber: number): string {
  return `${sessionId}-question-${questionNumber}`
}

export class MockInterviewBackend implements SessionsApi {
  private readonly sessions = new Map<string, MockSessionRecord>()
  private failures: Partial<Record<FailureFlag, boolean>>
  private idSequence = 0
  private readonly now: () => number
  private readonly responseDelayMs: number
  private readonly processingDelayMs: number
  private readonly completionDelayMs: number
  private readonly idFactory?: () => string

  constructor(options: MockBackendOptions = {}) {
    this.now = options.now ?? (() => Date.now())
    this.responseDelayMs = options.responseDelayMs ?? 180
    this.processingDelayMs = options.processingDelayMs ?? 2800
    this.completionDelayMs = options.completionDelayMs ?? 900
    this.idFactory = options.idFactory
    this.failures = options.failures ?? {}
  }

  configureFailures(failures: Partial<Record<FailureFlag, boolean>>): void {
    this.failures = { ...this.failures, ...failures }
  }

  clear(): void {
    for (const session of this.sessions.values()) {
      this.clearProcessingTimers(session)
    }
    this.sessions.clear()
  }

  async createSession(config: SessionConfig): Promise<Session> {
    await wait(this.responseDelayMs)
    this.throwIfFailure('createSession', 'SESSION_CREATION_FAILED')

    const id = this.idFactory?.() ?? `mock-${++this.idSequence}`
    const session: MockSessionRecord = {
      id,
      config,
      state: 'CREATED',
      questionIndex: 0,
      questionBank: questionBanks[config.category][config.difficulty],
      startedAt: null,
      processingStartedAt: null,
      uploadAccepted: false,
      evaluationFailed: false,
      processingTimerId: null,
      completionTimerId: null,
    }
    this.sessions.set(id, session)

    return this.toSession(session)
  }

  async getCurrentQuestion(sessionId: string): Promise<Question> {
    await wait(this.responseDelayMs)
    this.throwIfFailure('getCurrentQuestion', 'QUESTION_UNAVAILABLE')
    const session = this.requireSession(sessionId)
    this.ensureActive(session)

    return this.toQuestion(session)
  }

  async beginResponse(sessionId: string): Promise<SessionStatus> {
    const session = this.requireSession(sessionId)
    this.ensureActive(session)

    if (
      session.config.mode === 'timed' &&
      session.startedAt === null &&
      session.state === 'ACTIVE'
    ) {
      session.startedAt = this.now()
    }

    this.projectTimedState(session)
    await wait(this.responseDelayMs)

    return this.toStatus(session)
  }

  async getSessionStatus(sessionId: string): Promise<SessionStatus> {
    await wait(this.responseDelayMs)
    const session = this.requireSession(sessionId)
    this.ensureActive(session)
    this.projectTimedState(session)

    return this.toStatus(session)
  }

  async uploadResponse(
    sessionId: string,
    _media: RecordedMedia,
  ): Promise<UploadResponse> {
    await wait(this.responseDelayMs)
    this.throwIfFailure('uploadResponse', 'UPLOAD_FAILED')
    const session = this.requireSession(sessionId)
    this.ensureActive(session)
    this.projectTimedState(session)

    if (!['ACTIVE', 'WARNING', 'TIME_EXPIRED'].includes(session.state)) {
      throw new MockApiError(
        'INVALID_TRANSITION',
        `Cannot submit an answer while session is ${session.state}.`,
      )
    }

    this.transition(session, 'PROCESSING')
    session.uploadAccepted = true
    session.processingStartedAt = this.now()
    this.scheduleEvaluation(session)

    return {
      accepted: true,
      status: 'received',
      message: 'Response received and queued for evaluation.',
    }
  }

  async getResult(sessionId: string): Promise<EvaluationResult> {
    await wait(this.responseDelayMs)
    this.throwIfFailure('getResult', 'EVALUATION_FAILED')
    const session = this.requireSession(sessionId)

    if (session.evaluationFailed || this.failures.evaluation) {
      throw new MockApiError(
        'EVALUATION_FAILED',
        'The mock evaluation failed for this session.',
      )
    }

    if (!['EVALUATED', 'COMPLETED'].includes(session.state)) {
      throw new MockApiError(
        'EVALUATION_FAILED',
        'Evaluation results are not ready yet.',
      )
    }

    return this.toResult(session)
  }

  transitionForTest(sessionId: string, nextState: SessionState): SessionStatus {
    const session = this.requireSession(sessionId)
    this.transition(session, nextState)
    return this.toStatus(session)
  }

  advanceQuestionForTest(sessionId: string): Question {
    const session = this.requireSession(sessionId)

    if (session.questionIndex < session.questionBank.length - 1) {
      session.questionIndex += 1
      session.state = 'CREATED'
      session.startedAt = null
      session.processingStartedAt = null
      session.uploadAccepted = false
      session.evaluationFailed = false
      this.clearProcessingTimers(session)
    }

    return this.toQuestion(session)
  }

  private throwIfFailure(
    flag: FailureFlag,
    code: ApiError['code'],
  ): void {
    if (this.failures[flag]) {
      throw new MockApiError(code, this.messageForCode(code))
    }
  }

  private messageForCode(code: ApiError['code']): string {
    switch (code) {
      case 'SESSION_CREATION_FAILED':
        return 'Mock session creation failed.'
      case 'QUESTION_UNAVAILABLE':
        return 'Mock question is unavailable.'
      case 'UPLOAD_FAILED':
        return 'Mock upload failed.'
      case 'EVALUATION_FAILED':
        return 'Mock evaluation failed.'
      default:
        return 'Mock API request failed.'
    }
  }

  private requireSession(sessionId: string): MockSessionRecord {
    const session = this.sessions.get(sessionId)

    if (!session) {
      throw new MockApiError(
        'SESSION_NOT_FOUND',
        'Session unavailable. Please start a new practice session.',
      )
    }

    return session
  }

  private ensureActive(session: MockSessionRecord): void {
    if (session.state === 'CREATED') {
      this.transition(session, 'ACTIVE')
    }
  }

  private projectTimedState(session: MockSessionRecord): void {
    if (
      session.config.mode !== 'timed' ||
      session.startedAt === null ||
      !['ACTIVE', 'WARNING'].includes(session.state)
    ) {
      return
    }

    const remainingSeconds = this.getRemainingSeconds(session)

    if (remainingSeconds === 0) {
      this.transition(session, 'TIME_EXPIRED')
      return
    }

    if (
      remainingSeconds !== null &&
      remainingSeconds <= WARNING_SECONDS &&
      session.state === 'ACTIVE'
    ) {
      this.transition(session, 'WARNING')
    }
  }

  private getRemainingSeconds(session: MockSessionRecord): number | null {
    if (session.config.mode === 'free') {
      return null
    }

    if (session.startedAt === null) {
      return MAX_TIMED_SECONDS
    }

    const elapsedSeconds = Math.floor((this.now() - session.startedAt) / 1000)
    return Math.max(MAX_TIMED_SECONDS - elapsedSeconds, 0)
  }

  private transition(session: MockSessionRecord, nextState: SessionState): void {
    if (!validTransitions[session.state].includes(nextState)) {
      throw new MockApiError(
        'INVALID_TRANSITION',
        `Invalid mock transition: ${session.state} to ${nextState}.`,
      )
    }

    session.state = nextState
  }

  private scheduleEvaluation(session: MockSessionRecord): void {
    if (session.processingTimerId !== null) {
      return
    }

    session.processingTimerId = globalThis.setTimeout(() => {
      session.processingTimerId = null

      if (this.failures.evaluation) {
        session.evaluationFailed = true
        return
      }

      if (session.state === 'PROCESSING') {
        this.transition(session, 'EVALUATED')
      }

      session.completionTimerId = globalThis.setTimeout(() => {
        session.completionTimerId = null
        if (session.state === 'EVALUATED') {
          this.transition(session, 'COMPLETED')
        }
      }, this.completionDelayMs)
    }, this.processingDelayMs)
  }

  private clearProcessingTimers(session: MockSessionRecord): void {
    if (session.processingTimerId !== null) {
      globalThis.clearTimeout(session.processingTimerId)
      session.processingTimerId = null
    }

    if (session.completionTimerId !== null) {
      globalThis.clearTimeout(session.completionTimerId)
      session.completionTimerId = null
    }
  }

  private toSession(session: MockSessionRecord): Session {
    const remainingSeconds = this.getRemainingSeconds(session)

    return {
      id: session.id,
      config: session.config,
      state: session.state,
      currentQuestionNumber: session.questionIndex + 1,
      totalQuestions: session.questionBank.length,
      remainingSeconds,
      warning:
        session.startedAt !== null &&
        remainingSeconds !== null &&
        remainingSeconds <= WARNING_SECONDS,
    }
  }

  private toQuestion(session: MockSessionRecord): Question {
    return {
      id: questionId(session.id, session.questionIndex + 1),
      sessionId: session.id,
      number: session.questionIndex + 1,
      total: session.questionBank.length,
      prompt: session.questionBank[session.questionIndex],
    }
  }

  private toStatus(session: MockSessionRecord): SessionStatus {
    const remainingSeconds = this.getRemainingSeconds(session)

    return {
      sessionId: session.id,
      state: session.state,
      mode: session.config.mode,
      questionId: questionId(session.id, session.questionIndex + 1),
      questionNumber: session.questionIndex + 1,
      totalQuestions: session.questionBank.length,
      remainingSeconds,
      warning:
        session.startedAt !== null &&
        remainingSeconds !== null &&
        remainingSeconds <= WARNING_SECONDS,
      responseStarted: session.config.mode === 'free' || session.startedAt !== null,
      uploadAccepted: session.uploadAccepted,
      evaluationStatus: this.toEvaluationStatus(session),
    }
  }

  private toEvaluationStatus(
    session: MockSessionRecord,
  ): SessionStatus['evaluationStatus'] {
    if (session.evaluationFailed) {
      return 'failed'
    }

    switch (session.state) {
      case 'PROCESSING':
        return 'processing'
      case 'EVALUATED':
      case 'COMPLETED':
        return 'ready'
      default:
        return 'idle'
    }
  }

  private toResult(session: MockSessionRecord): EvaluationResult {
    const difficultyAdjustment: Record<Difficulty, number> = {
      beginner: 1,
      intermediate: 0,
      advanced: -1,
    }
    const adjustment = difficultyAdjustment[session.config.difficulty]
    const clampSub = (value: number): number =>
      Math.min(Math.max(Math.round(value), 0), 20)

    return {
      sessionId: session.id,
      score: 84 + difficultyAdjustment[session.config.difficulty] * 5,
      disqualified: false,
      feedback:
        'Clear opening with a direct answer to the question and steady pacing ' +
        'through the main example. Tighten the middle section so the main point ' +
        'arrives sooner, and pause deliberately instead of filling every silence.',
      sub_scores: {
        clarity: clampSub(17 + adjustment),
        relevance: clampSub(18 + adjustment),
        professionalism: clampSub(17 + adjustment),
        structure: clampSub(16 + adjustment),
        impact: clampSub(15 + adjustment),
      },
    }
  }
}

export const mockSessionsBackend = new MockInterviewBackend()
export const configureMockApiFailures = (
  failures: Partial<Record<FailureFlag, boolean>>,
) => mockSessionsBackend.configureFailures(failures)
export const mockSessionsApi: SessionsApi = mockSessionsBackend
