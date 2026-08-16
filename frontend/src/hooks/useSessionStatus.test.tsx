/** @vitest-environment jsdom */
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSessionStatus } from './useSessionStatus'
import type { SessionsApi } from '../types/api'
import type { SessionStatus } from '../types/session'

const activeStatus: SessionStatus = {
  evaluationStatus: 'idle',
  mode: 'timed',
  questionId: 'question-1',
  questionNumber: 1,
  remainingSeconds: 120,
  responseStarted: true,
  sessionId: 'session-1',
  state: 'ACTIVE',
  totalQuestions: 5,
  uploadAccepted: false,
  warning: false,
}

function apiWithStatus(status: SessionStatus): SessionsApi {
  return {
    createSession: vi.fn(),
    beginResponse: vi.fn(),
    getCurrentQuestion: vi.fn(),
    getResult: vi.fn(),
    getSessionStatus: vi.fn().mockResolvedValue(status),
    uploadResponse: vi.fn(),
  }
}

describe('useSessionStatus', () => {
  afterEach(() => {
    cleanup()
  })

  it('polls active sessions and cleans up polling on unmount', async () => {
    const api = apiWithStatus(activeStatus)

    const { result, unmount } = renderHook(() =>
      useSessionStatus('session-1', { api, pollingIntervalMs: 5 }),
    )

    await waitFor(() => expect(result.current.status?.state).toBe('ACTIVE'))
    expect(api.getSessionStatus).toHaveBeenCalled()

    await waitFor(() =>
      expect(vi.mocked(api.getSessionStatus).mock.calls.length).toBeGreaterThan(1),
    )

    unmount()
    const callsAfterUnmount = vi.mocked(api.getSessionStatus).mock.calls.length
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(api.getSessionStatus).toHaveBeenCalledTimes(callsAfterUnmount)
  })

  it('keeps the current status after a temporary polling failure', async () => {
    const api = apiWithStatus(activeStatus)
    vi.mocked(api.getSessionStatus)
      .mockResolvedValueOnce(activeStatus)
      .mockRejectedValue(new Error('offline'))

    const { result } = renderHook(() =>
      useSessionStatus('session-1', { api, pollingIntervalMs: 5 }),
    )

    await waitFor(() => expect(result.current.status?.state).toBe('ACTIVE'))
    await waitFor(() => expect(result.current.error).toContain('temporarily unavailable'))

    expect(result.current.status?.state).toBe('ACTIVE')
  })
})
