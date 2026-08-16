/**
 * Opt-in integration test that exercises the real FastAPI service layer
 * against a live backend instance. Skipped by default so it never runs in CI.
 *
 * Usage (with the backend running on :8000):
 *   VITE_API_URL=http://localhost:8000 PITCH_INTEGRATION=1 npx vitest run \
 *     src/services/sessionsApi.integration.test.ts
 */
import { describe, expect, it } from 'vitest'

const runIntegration = Boolean(import.meta.env.PITCH_INTEGRATION)

describe('FastAPI integration (live backend)', () => {
  it.skipIf(!runIntegration)(
    'hydrates a persisted evaluation without schema errors',
    async () => {
      const { fastApiSessionsApi } = await import('./sessionsApi')
      const { createSession } = await import('./api')

      // Create a session server-side with a transcript so the backend runs its
      // own transcription/evaluation pipeline and persists the result.
      const record = await createSession({
        title: 'integration check',
        transcript:
          'I am excited about this opportunity and eager to contribute to the team.',
      })
      expect(record.id).toBeTruthy()
      expect(record.evaluation).not.toBeNull()

      // getResult has no client-side runtime for this session, so it must
      // hydrate from the backend record — the same path a refreshed results
      // page takes. This guards against runtime schema errors in the mapping.
      const result = await fastApiSessionsApi.getResult(record.id)

      expect(result.sessionId).toBe(record.id)
      expect(typeof result.overallScore).toBe('number')
      expect(result.metrics.length).toBeGreaterThan(0)
      for (const metric of result.metrics) {
        expect(typeof metric.label).toBe('string')
        expect(typeof metric.score).toBe('number')
      }
      expect(Array.isArray(result.strengths)).toBe(true)
      expect(Array.isArray(result.improvements)).toBe(true)
      expect(typeof result.nextPractice).toBe('string')
    },
  )

  it.skipIf(!runIntegration)(
    'runs the session lifecycle through the real backend',
    async () => {
      const { fastApiSessionsApi } = await import('./sessionsApi')

      const session = await fastApiSessionsApi.createSession({
        mode: 'timed',
        category: 'behavioral-interview',
        difficulty: 'intermediate',
      })
      expect(session.id).toBeTruthy()
      expect(session.config.category).toBe('behavioral-interview')

      const question = await fastApiSessionsApi.getCurrentQuestion(session.id)
      expect(question.number).toBe(1)
      expect(question.prompt.length).toBeGreaterThan(0)

      const status = await fastApiSessionsApi.getSessionStatus(session.id)
      expect(status.sessionId).toBe(session.id)
      expect(status.mode).toBe('timed')
    },
  )
})