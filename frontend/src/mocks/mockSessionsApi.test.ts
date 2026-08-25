import { afterEach, describe, expect, it, vi } from 'vitest'
import { MockApiError, MockInterviewBackend } from './mockSessionsApi'
import type { RecordedMedia } from '../types/interview'
import type { SessionConfig } from '../types/session'

const timedConfig: SessionConfig = {
  mode: 'timed',
  category: 'behavioral-interview',
  difficulty: 'intermediate',
}

const freeConfig: SessionConfig = {
  mode: 'free',
  category: 'public-speaking',
  difficulty: 'beginner',
}

function media(): RecordedMedia {
  return {
    blob: new Blob(['mock'], { type: 'video/webm' }),
    durationSeconds: 12,
    mimeType: 'video/webm',
    url: 'blob:mock',
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('MockInterviewBackend', () => {
  it('creates a session with the selected configuration', async () => {
    const backend = new MockInterviewBackend({
      idFactory: () => 'session-1',
      responseDelayMs: 0,
    })

    const session = await backend.createSession(timedConfig)

    expect(session.id).toBe('session-1')
    expect(session.config).toEqual(timedConfig)
    expect(session.state).toBe('CREATED')
    expect(session.currentQuestionNumber).toBe(1)
    expect(session.totalQuestions).toBe(5)
  })

  it('can simulate session creation failure', async () => {
    const backend = new MockInterviewBackend({
      responseDelayMs: 0,
      failures: { createSession: true },
    })

    await expect(backend.createSession(timedConfig)).rejects.toMatchObject({
      code: 'SESSION_CREATION_FAILED',
    })
  })

  it('waits to start the timed response deadline until beginResponse', async () => {
    let now = 1_000
    const backend = new MockInterviewBackend({
      idFactory: () => 'session-1',
      now: () => now,
      responseDelayMs: 0,
    })
    const session = await backend.createSession(timedConfig)

    const status = await backend.getSessionStatus(session.id)

    expect(status.state).toBe('ACTIVE')
    expect(status.remainingSeconds).toBe(120)
    expect(status.responseStarted).toBe(false)
    expect(status.warning).toBe(false)
    now += 20_000
    expect((await backend.getSessionStatus(session.id)).remainingSeconds).toBe(120)

    await backend.beginResponse(session.id)
    now += 20_000
    const activeResponseStatus = await backend.getSessionStatus(session.id)
    expect(activeResponseStatus.responseStarted).toBe(true)
    expect(activeResponseStatus.remainingSeconds).toBe(100)
  })

  it('transitions timed sessions to WARNING at ten seconds', async () => {
    let now = 5_000
    const backend = new MockInterviewBackend({
      now: () => now,
      responseDelayMs: 0,
    })
    const session = await backend.createSession(timedConfig)
    await backend.beginResponse(session.id)

    now += 110_000
    const status = await backend.getSessionStatus(session.id)

    expect(status.state).toBe('WARNING')
    expect(status.remainingSeconds).toBe(10)
    expect(status.warning).toBe(true)
  })

  it('keeps answer elapsed time synchronized with the response deadline', async () => {
    let now = 10_000
    const backend = new MockInterviewBackend({
      now: () => now,
      responseDelayMs: 0,
    })
    const session = await backend.createSession(timedConfig)
    await backend.beginResponse(session.id)

    now += 56_000
    const status = await backend.getSessionStatus(session.id)
    const answerElapsedSeconds = 120 - (status.remainingSeconds ?? 120)

    expect(status.remainingSeconds).toBe(64)
    expect(answerElapsedSeconds).toBe(56)
  })


  it('transitions timed sessions to TIME_EXPIRED at zero', async () => {
    let now = 10_000
    const backend = new MockInterviewBackend({
      now: () => now,
      responseDelayMs: 0,
    })
    const session = await backend.createSession(timedConfig)
    await backend.beginResponse(session.id)

    now += 120_000
    const status = await backend.getSessionStatus(session.id)

    expect(status.state).toBe('TIME_EXPIRED')
    expect(status.remainingSeconds).toBe(0)
    expect(status.warning).toBe(true)
  })

  it('does not expire free practice after 120 seconds', async () => {
    let now = 10_000
    const backend = new MockInterviewBackend({
      now: () => now,
      responseDelayMs: 0,
    })
    const session = await backend.createSession(freeConfig)
    await backend.getSessionStatus(session.id)

    now += 180_000
    const status = await backend.getSessionStatus(session.id)

    expect(status.state).toBe('ACTIVE')
    expect(status.remainingSeconds).toBeNull()
    expect(status.warning).toBe(false)
  })

  it('allows valid state transitions and rejects invalid transitions', async () => {
    const backend = new MockInterviewBackend({ responseDelayMs: 0 })
    const session = await backend.createSession(timedConfig)

    expect(backend.transitionForTest(session.id, 'ACTIVE').state).toBe('ACTIVE')
    expect(backend.transitionForTest(session.id, 'WARNING').state).toBe('WARNING')
    expect(() => backend.transitionForTest(session.id, 'COMPLETED')).toThrow(
      MockApiError,
    )
  })

  it('returns questions from the configured category and difficulty bank', async () => {
    const backend = new MockInterviewBackend({ responseDelayMs: 0 })
    const session = await backend.createSession({
      mode: 'timed',
      category: 'technical-interview',
      difficulty: 'advanced',
    })

    const question = await backend.getCurrentQuestion(session.id)

    expect(question.id).toBe(`${session.id}-question-1`)
    expect(question.number).toBe(1)
    expect(question.total).toBe(5)
    expect(question.prompt).toContain('session synchronization')
  })

  it('can simulate question unavailable errors', async () => {
    const backend = new MockInterviewBackend({
      responseDelayMs: 0,
      failures: { getCurrentQuestion: true },
    })
    const session = await backend.createSession(timedConfig)

    await expect(backend.getCurrentQuestion(session.id)).rejects.toMatchObject({
      code: 'QUESTION_UNAVAILABLE',
    })
  })

  it('supports question progression inside the mock backend', async () => {
    const backend = new MockInterviewBackend({ responseDelayMs: 0 })
    const session = await backend.createSession(timedConfig)

    const nextQuestion = backend.advanceQuestionForTest(session.id)

    expect(nextQuestion.number).toBe(2)
    expect(nextQuestion.id).toBe(`${session.id}-question-2`)
  })

  it('moves submitted answers through processing, evaluated, and completed', async () => {
    vi.useFakeTimers()
    const backend = new MockInterviewBackend({
      responseDelayMs: 0,
      processingDelayMs: 500,
      completionDelayMs: 250,
    })
    const session = await backend.createSession(timedConfig)
    await backend.getSessionStatus(session.id)

    await backend.uploadResponse(session.id, media())

    expect((await backend.getSessionStatus(session.id)).state).toBe('PROCESSING')
    await vi.advanceTimersByTimeAsync(500)
    expect((await backend.getSessionStatus(session.id)).state).toBe('EVALUATED')
    await vi.advanceTimersByTimeAsync(250)
    expect((await backend.getSessionStatus(session.id)).state).toBe('COMPLETED')
  })

  it('returns results only after evaluation is available', async () => {
    vi.useFakeTimers()
    const backend = new MockInterviewBackend({
      responseDelayMs: 0,
      processingDelayMs: 100,
      completionDelayMs: 100,
    })
    const session = await backend.createSession(timedConfig)
    await backend.getSessionStatus(session.id)
    await backend.uploadResponse(session.id, media())

    await expect(backend.getResult(session.id)).rejects.toMatchObject({
      code: 'EVALUATION_FAILED',
    })

    await vi.advanceTimersByTimeAsync(100)
    const result = await backend.getResult(session.id)

    expect(result.sessionId).toBe(session.id)
    expect(result.score).toBeGreaterThan(0)
    expect(result.disqualified).toBe(false)
    expect(Object.values(result.sub_scores)).toHaveLength(5)
  })

  it('can simulate evaluation failure', async () => {
    vi.useFakeTimers()
    const backend = new MockInterviewBackend({
      responseDelayMs: 0,
      processingDelayMs: 100,
      completionDelayMs: 100,
      failures: { evaluation: true },
    })
    const session = await backend.createSession(timedConfig)
    await backend.getSessionStatus(session.id)
    await backend.uploadResponse(session.id, media())

    await vi.advanceTimersByTimeAsync(100)

    expect((await backend.getSessionStatus(session.id)).evaluationStatus).toBe(
      'failed',
    )
    await expect(backend.getResult(session.id)).rejects.toMatchObject({
      code: 'EVALUATION_FAILED',
    })
  })

  it('throws typed errors for missing sessions', async () => {
    const backend = new MockInterviewBackend({ responseDelayMs: 0 })

    await expect(backend.getSessionStatus('missing')).rejects.toMatchObject({
      code: 'SESSION_NOT_FOUND',
    })
  })

  it('can simulate upload failure without random errors', async () => {
    const backend = new MockInterviewBackend({
      responseDelayMs: 0,
      failures: { uploadResponse: true },
    })
    const session = await backend.createSession(timedConfig)

    await expect(backend.uploadResponse(session.id, media())).rejects.toMatchObject({
      code: 'UPLOAD_FAILED',
    })
  })
})
