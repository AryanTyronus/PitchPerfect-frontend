/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import resultsSource from './ResultsPage.tsx?raw'
import { ResultsPage } from './ResultsPage'
import { sessionsApi } from '../services/sessionsApi'
import type { SessionsApi } from '../types/api'
import type { EvaluationResult } from '../types/evaluation'

vi.mock('../services/sessionsApi', () => {
  const api = {
    createSession: vi.fn(),
    beginResponse: vi.fn(),
    getCurrentQuestion: vi.fn(),
    getSessionStatus: vi.fn(),
    uploadResponse: vi.fn(),
    getResult: vi.fn(),
  }
  return { sessionsApi: api }
})

const mockedApi = sessionsApi as unknown as SessionsApi
const getResult = vi.mocked(mockedApi.getResult)

const evaluationResult: EvaluationResult = {
  sessionId: 'session-1',
  overallScore: 84,
  metrics: [
    { label: 'Clarity', score: 88 },
    { label: 'Confidence', score: 81 },
    { label: 'Structure', score: 86 },
    { label: 'Conciseness', score: 79 },
    { label: 'Delivery', score: 85 },
  ],
  strengths: [
    'Clear opening with a direct answer to the question.',
    'Good answer structure.',
  ],
  improvements: ['Tighten the middle section so the main point arrives sooner.'],
  nextPractice:
    'Practice a 90-second answer with a clear setup, action, and measurable result.',
}

function renderPage(navigate = vi.fn()) {
  render(<ResultsPage onNavigate={navigate} sessionId="session-1" />)
  return navigate
}

beforeEach(() => {
  getResult.mockResolvedValue(evaluationResult)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ResultsPage', () => {
  it('shows a loading state while the result is being fetched', () => {
    getResult.mockReturnValue(new Promise(() => undefined))

    renderPage()

    expect(screen.getByText('Loading your results')).toBeInTheDocument()
  })

  it('loads the result through the service layer', async () => {
    renderPage()

    await waitFor(() => expect(screen.getByText('84')).toBeInTheDocument())
    expect(getResult).toHaveBeenCalledWith('session-1')
    expect(screen.queryByText('Loading your results')).not.toBeInTheDocument()
  })

  it('renders the overall score from the API', async () => {
    renderPage()

    await waitFor(() =>
      expect(
        screen.getByRole('img', { name: 'Overall score 84 out of 100' }),
      ).toBeInTheDocument(),
    )
    expect(screen.getByText('84')).toBeInTheDocument()
    expect(screen.getByText('/ 100')).toBeInTheDocument()
    expect(screen.getByText('Overall Score')).toBeInTheDocument()
  })

  it('renders all five communication metrics with scores and progress indicators', async () => {
    renderPage()

    await waitFor(() => expect(screen.getByText('Clarity')).toBeInTheDocument())

    const expected: Array<[string, string]> = [
      ['Clarity', '88'],
      ['Confidence', '81'],
      ['Structure', '86'],
      ['Conciseness', '79'],
      ['Delivery', '85'],
    ]

    for (const [label, score] of expected) {
      expect(screen.getByText(label)).toBeInTheDocument()
      expect(screen.getByText(score)).toBeInTheDocument()
    }

    const bars = screen.getAllByRole('progressbar')
    expect(bars).toHaveLength(5)
    expect(bars[0]).toHaveAttribute('aria-valuenow', '88')
    expect(bars[4]).toHaveAttribute('aria-valuenow', '85')
  })

  it('renders the strengths returned by the API', async () => {
    renderPage()

    await waitFor(() =>
      expect(screen.getByText('What You Did Well')).toBeInTheDocument(),
    )
    expect(
      screen.getByText('Clear opening with a direct answer to the question.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Good answer structure.')).toBeInTheDocument()
  })

  it('renders the improvements returned by the API', async () => {
    renderPage()

    await waitFor(() =>
      expect(screen.getByText('Areas to Improve')).toBeInTheDocument(),
    )
    expect(
      screen.getByText('Tighten the middle section so the main point arrives sooner.'),
    ).toBeInTheDocument()
  })

  it('renders the recommended next practice and a Practice Again CTA', async () => {
    renderPage()

    await waitFor(() =>
      expect(screen.getByText('Recommended Next Practice')).toBeInTheDocument(),
    )
    expect(
      screen.getByText(
        'Practice a 90-second answer with a clear setup, action, and measurable result.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Practice Again' })).toBeInTheDocument()
  })

  it('shows a processing state when the result is not ready yet', async () => {
    getResult.mockRejectedValue({
      code: 'EVALUATION_FAILED',
      message: 'Evaluation results are not ready yet.',
    })

    renderPage()

    expect(
      await screen.findByText('Your results are still processing'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Check Again' }),
    ).toBeInTheDocument()
  })

  it('shows an error state when loading fails', async () => {
    getResult.mockRejectedValue(new Error('network down'))

    renderPage()

    expect(
      await screen.findByText("Your results couldn't be loaded"),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
  })

  it('retries loading after a temporary failure', async () => {
    getResult
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(evaluationResult)

    renderPage()

    expect(
      await screen.findByText("Your results couldn't be loaded"),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))

    await waitFor(() =>
      expect(screen.getByRole('img', { name: 'Overall score 84 out of 100' })).toBeInTheDocument(),
    )
    expect(getResult).toHaveBeenCalledTimes(2)
  })

  it('lets Practice Again navigate back to setup', async () => {
    const navigate = renderPage()

    await waitFor(() =>
      expect(screen.getByRole('img', { name: 'Overall score 84 out of 100' })).toBeInTheDocument(),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Practice Again' }))

    expect(navigate).toHaveBeenCalledWith('/setup')
  })

  it('renders the feedback returned by the API instead of hardcoded data', async () => {
    getResult.mockResolvedValue({
      ...evaluationResult,
      strengths: ['Custom strength from the API.'],
      improvements: ['Custom improvement from the API.'],
      nextPractice: 'Custom next practice from the API.',
    })

    renderPage()

    await waitFor(() =>
      expect(screen.getByText('Custom strength from the API.')).toBeInTheDocument(),
    )
    expect(screen.getByText('Custom improvement from the API.')).toBeInTheDocument()
    expect(screen.getByText('Custom next practice from the API.')).toBeInTheDocument()
    expect(
      screen.queryByText('Clear opening with a direct answer to the question.'),
    ).not.toBeInTheDocument()
  })

  it('does not import the mock backend directly or hardcode evaluation data', () => {
    expect(resultsSource).not.toContain('mockSessionsApi')
    expect(resultsSource).not.toContain('MockInterviewBackend')
    expect(resultsSource).not.toMatch(/mocks\/mockSessionsApi/)
    expect(resultsSource).not.toContain('Clear opening')
    expect(resultsSource).not.toMatch(/(?:clarity|confidence|structure|conciseness|delivery):\s*\d/)
  })
})