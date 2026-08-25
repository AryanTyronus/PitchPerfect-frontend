/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import resultsSource from './ResultsPage.tsx?raw'
import { ResultsPage } from './ResultsPage'
import { sessionsApi } from '../services/sessionsApi'
import type { SessionsApi } from '../types/api'
import type { EvaluationResult, SubScores } from '../types/evaluation'

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

const subScores: SubScores = {
  clarity: 17,
  relevance: 18,
  professionalism: 16,
  structure: 15,
  impact: 14,
}

const evaluationResult: EvaluationResult = {
  sessionId: 'session-1',
  score: 84,
  disqualified: false,
  feedback:
    'Clear opening with a direct answer and a specific, measurable outcome.',
  sub_scores: subScores,
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

  it('renders all five sub-score channels with scores and progress indicators', async () => {
    renderPage()

    await waitFor(() => expect(screen.getByText('Clarity')).toBeInTheDocument())

    const expected: Array<[string, string]> = [
      ['Clarity', '17'],
      ['Relevance', '18'],
      ['Professionalism', '16'],
      ['Structure', '15'],
      ['Impact', '14'],
    ]

    for (const [label, score] of expected) {
      expect(screen.getByText(label)).toBeInTheDocument()
      expect(screen.getByText(score, { exact: false })).toBeInTheDocument()
    }

    const bars = screen.getAllByRole('progressbar')
    expect(bars).toHaveLength(5)
    expect(bars[0]).toHaveAttribute('aria-valuenow', '17')
    expect(bars[0]).toHaveAttribute('aria-valuemax', '20')
    expect(bars[4]).toHaveAttribute('aria-valuenow', '14')
  })

  it('renders the Eye Contact channel with a score threshold tone', async () => {
    getResult.mockResolvedValue({
      ...evaluationResult,
      eyeContactPercentage: 82,
    })

    renderPage()

    await waitFor(() => expect(screen.getByText('Eye Contact')).toBeInTheDocument())

    const bar = screen.getByRole('progressbar', { name: 'Eye Contact progress' })
    expect(bar).toHaveAttribute('aria-valuenow', '82')
    const row = screen.getByText('Eye Contact').closest('li')
    expect(row).toHaveClass('channel-row--good')
  })

  it('marks moderate eye contact with the warning tone', async () => {
    getResult.mockResolvedValue({
      ...evaluationResult,
      eyeContactPercentage: 55,
    })

    renderPage()

    await waitFor(() => expect(screen.getByText('Eye Contact')).toBeInTheDocument())

    const row = screen.getByText('Eye Contact').closest('li')
    expect(row).toHaveClass('channel-row--moderate')
  })

  it('marks low eye contact with the needs-work tone', async () => {
    getResult.mockResolvedValue({
      ...evaluationResult,
      eyeContactPercentage: 35,
    })

    renderPage()

    await waitFor(() => expect(screen.getByText('Eye Contact')).toBeInTheDocument())

    const row = screen.getByText('Eye Contact').closest('li')
    expect(row).toHaveClass('channel-row--needs-work')
  })

  it('renders the feedback returned by the API', async () => {
    getResult.mockResolvedValue({
      ...evaluationResult,
      feedback: 'Custom coaching note from the API.',
    })

    renderPage()

    await waitFor(() =>
      expect(screen.getByText('Custom coaching note from the API.')).toBeInTheDocument(),
    )
  })

  it('shows a disqualified banner when disqualified is true', async () => {
    getResult.mockResolvedValue({
      ...evaluationResult,
      score: 8,
      disqualified: true,
      feedback: 'Severe professional misconduct detected.',
      sub_scores: { clarity: 2, relevance: 0, professionalism: 0, structure: 1, impact: 0 },
    })

    renderPage()

    expect(
      await screen.findByRole('alert'),
    ).toBeInTheDocument()
    expect(screen.getByText('Disqualified')).toBeInTheDocument()
    expect(
      screen.getAllByText('Severe professional misconduct detected.').length,
    ).toBeGreaterThan(0)
  })

  it('shows the no-speech state when disqualified with a zero score', async () => {
    getResult.mockResolvedValue({
      ...evaluationResult,
      score: 0,
      disqualified: true,
      feedback: 'no audible speech or response detected in recording.',
      sub_scores: { clarity: 0, relevance: 0, professionalism: 0, structure: 0, impact: 0 },
    })

    renderPage()

    expect(await screen.findByText('No Speech Detected')).toBeInTheDocument()
  })

  it('renders the recommended next practice and a Practice Again CTA', async () => {
    renderPage()

    await waitFor(() =>
      expect(screen.getByText('Recommended Next Practice')).toBeInTheDocument(),
    )
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

  it('does not import the mock backend directly or hardcode evaluation data', () => {
    expect(resultsSource).not.toContain('mockSessionsApi')
    expect(resultsSource).not.toContain('MockInterviewBackend')
    expect(resultsSource).not.toMatch(/mocks\/mockSessionsApi/)
    expect(resultsSource).not.toContain('Clear opening')
    expect(resultsSource).not.toMatch(/(?:clarity|confidence|structure|conciseness|delivery):\s*\d/)
  })
})
