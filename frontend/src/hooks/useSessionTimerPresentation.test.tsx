/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useSessionTimerPresentation } from './useSessionTimerPresentation'
import type { SessionStatus } from '../types/session'

function status(
  remainingSeconds: number,
  warning = false,
  responseStarted = true,
): SessionStatus {
  return {
    evaluationStatus: 'idle',
    mode: 'timed',
    questionId: 'question-1',
    questionNumber: 1,
    remainingSeconds,
    responseStarted,
    sessionId: 'session-1',
    state: warning ? 'WARNING' : 'ACTIVE',
    totalQuestions: 5,
    uploadAccepted: false,
    warning,
  }
}

describe('useSessionTimerPresentation', () => {
  it('displays backend remaining_seconds and interpolates presentation only', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ nextStatus }) => useSessionTimerPresentation(nextStatus),
      { initialProps: { nextStatus: status(120) } },
    )

    expect(result.current.label).toBe('02:00')

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.label).toBe('01:59')

    rerender({ nextStatus: status(118) })
    expect(result.current.label).toBe('01:58')
    vi.useRealTimers()
  })

  it('marks backend warning as urgent without deciding the session state', () => {
    const { result } = renderHook(() => useSessionTimerPresentation(status(9, true)))

    expect(result.current.label).toBe('00:09')
    expect(result.current.isUrgent).toBe(true)
  })

  it('does not interpolate before the backend response window starts', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() =>
      useSessionTimerPresentation(status(120, false, false)),
    )

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(result.current.label).toBe('02:00')
    vi.useRealTimers()
  })
})
