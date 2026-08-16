/** @vitest-environment jsdom */
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useTimerAudioTransitions } from './useTimerAudioTransitions'
import type { SessionStatus } from '../types/session'

function status(
  overrides: Partial<SessionStatus> = {},
): SessionStatus {
  return {
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
    ...overrides,
  }
}

describe('useTimerAudioTransitions', () => {
  it('plays warning beep exactly once when entering WARNING', () => {
    const audio = {
      playEndBeep: vi.fn().mockResolvedValue(undefined),
      playWarningBeep: vi.fn().mockResolvedValue(undefined),
    }
    const { rerender } = renderHook(
      ({ nextStatus }) => useTimerAudioTransitions(nextStatus, audio),
      { initialProps: { nextStatus: status() } },
    )

    rerender({
      nextStatus: status({
        remainingSeconds: 10,
        state: 'WARNING',
        warning: true,
      }),
    })
    rerender({
      nextStatus: status({
        remainingSeconds: 9,
        state: 'WARNING',
        warning: true,
      }),
    })

    expect(audio.playWarningBeep).toHaveBeenCalledTimes(1)
    expect(audio.playEndBeep).not.toHaveBeenCalled()
  })

  it('plays end beep exactly once on TIME_EXPIRED', () => {
    const audio = {
      playEndBeep: vi.fn().mockResolvedValue(undefined),
      playWarningBeep: vi.fn().mockResolvedValue(undefined),
    }
    const { rerender } = renderHook(
      ({ nextStatus }) => useTimerAudioTransitions(nextStatus, audio),
      {
        initialProps: {
          nextStatus: status({
            remainingSeconds: 1,
            state: 'WARNING',
            warning: true,
          }),
        },
      },
    )

    rerender({
      nextStatus: status({
        remainingSeconds: 0,
        state: 'TIME_EXPIRED',
        warning: true,
      }),
    })
    rerender({
      nextStatus: status({
        remainingSeconds: 0,
        state: 'TIME_EXPIRED',
        warning: true,
      }),
    })

    expect(audio.playEndBeep).toHaveBeenCalledTimes(1)
  })

  it('does not stack warning audio when polling lands directly on TIME_EXPIRED', () => {
    const audio = {
      playEndBeep: vi.fn().mockResolvedValue(undefined),
      playWarningBeep: vi.fn().mockResolvedValue(undefined),
    }

    renderHook(() =>
      useTimerAudioTransitions(
        status({
          remainingSeconds: 0,
          state: 'TIME_EXPIRED',
          warning: true,
        }),
        audio,
      ),
    )

    expect(audio.playWarningBeep).not.toHaveBeenCalled()
    expect(audio.playEndBeep).toHaveBeenCalledTimes(1)
  })


  it('does not play timer audio for free practice', () => {
    const audio = {
      playEndBeep: vi.fn().mockResolvedValue(undefined),
      playWarningBeep: vi.fn().mockResolvedValue(undefined),
    }

    renderHook(() =>
      useTimerAudioTransitions(
        status({
          mode: 'free',
          remainingSeconds: null,
          responseStarted: true,
          state: 'ACTIVE',
          warning: false,
        }),
        audio,
      ),
    )

    expect(audio.playWarningBeep).not.toHaveBeenCalled()
    expect(audio.playEndBeep).not.toHaveBeenCalled()
  })

  it('does not throw when audio playback fails', () => {
    const audio = {
      playEndBeep: vi.fn().mockRejectedValue(new Error('blocked')),
      playWarningBeep: vi.fn().mockRejectedValue(new Error('blocked')),
    }

    expect(() =>
      renderHook(() =>
        useTimerAudioTransitions(
          status({
            remainingSeconds: 10,
            state: 'WARNING',
            warning: true,
          }),
          audio,
        ),
      ),
    ).not.toThrow()
  })
})
