/** @vitest-environment jsdom */
import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useCurrentQuestion } from './useCurrentQuestion'
import type { SessionsApi } from '../types/api'

describe('useCurrentQuestion', () => {
  it('retrieves the question through the service layer', async () => {
    const api: SessionsApi = {
      beginResponse: vi.fn(),
      createSession: vi.fn(),
      getCurrentQuestion: vi.fn().mockResolvedValue({
        id: 'question-1',
        number: 1,
        prompt: 'Tell me about yourself.',
        sessionId: 'session-1',
        total: 5,
      }),
      getResult: vi.fn(),
      getSessionStatus: vi.fn(),
      uploadResponse: vi.fn(),
    }

    const { result } = renderHook(() =>
      useCurrentQuestion('session-1', { api }),
    )

    await waitFor(() =>
      expect(result.current.question?.prompt).toBe('Tell me about yourself.'),
    )
    expect(api.getCurrentQuestion).toHaveBeenCalledWith('session-1')
  })
})
