/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('../services/sessionsApi', async () => {
  const { MockInterviewBackend } = await import('../mocks/mockSessionsApi')
  const backend = new MockInterviewBackend({
    responseDelayMs: 0,
    processingDelayMs: 200,
    completionDelayMs: 100,
  })
  return { sessionsApi: backend }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  window.history.replaceState({}, '', '/')
})

function renderApp() {
  render(<App />)
}

describe('App routing smoke', () => {
  it('renders the landing route with the hero hook', () => {
    renderApp()

    expect(screen.getByText('Speak better.', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('Think clearer.', { exact: false })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start practicing' })).toBeInTheDocument()
  })

  it('navigates from landing to the setup route', () => {
    renderApp()

    fireEvent.click(screen.getByRole('button', { name: 'Start practicing' }))

    expect(screen.getByRole('heading', { name: 'Set the room. Then speak.' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/setup')
  })

  it('starts a session from setup and opens the interview room', async () => {
    renderApp()

    fireEvent.click(screen.getByRole('button', { name: 'Start practicing' }))
    fireEvent.click(screen.getByRole('button', { name: 'Begin session' }))

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Practice answer' })).toBeInTheDocument(),
    )
    expect(window.location.pathname).toMatch(/^\/interview\//)
    expect(screen.getByLabelText('AI interviewer')).toBeInTheDocument()
  })

  it('renders the not-found route for unknown paths', () => {
    window.history.replaceState({}, '', '/missing-room')
    renderApp()

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})