import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { sessionsApi } from '../services/sessionsApi'
import type { SessionsApi } from '../types/api'
import type { SessionState, SessionStatus } from '../types/session'

const DEFAULT_POLLING_INTERVAL_MS = 1500
const POLLING_STATES: SessionState[] = ['CREATED', 'ACTIVE', 'WARNING', 'PROCESSING']

interface UseSessionStatusOptions {
  api?: SessionsApi
  pollingIntervalMs?: number
}

function shouldPoll(state: SessionState): boolean {
  return POLLING_STATES.includes(state)
}

export function useSessionStatus(
  sessionId: string,
  options: UseSessionStatusOptions = {},
) {
  const api = options.api ?? sessionsApi
  const pollingIntervalMs =
    options.pollingIntervalMs ?? DEFAULT_POLLING_INTERVAL_MS
  const [status, setStatus] = useState<SessionStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(false)
  const requestInFlightRef = useRef(false)

  const syncStatus = useCallback(async () => {
    if (requestInFlightRef.current) {
      return null
    }

    requestInFlightRef.current = true

    try {
      const nextStatus = await api.getSessionStatus(sessionId)

      if (mountedRef.current) {
        setStatus(nextStatus)
        setError(null)
      }

      return nextStatus
    } catch {
      if (mountedRef.current) {
        setError('Session status is temporarily unavailable. Retrying...')
      }
      return null
    } finally {
      requestInFlightRef.current = false
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [api, sessionId])

  useEffect(() => {
    mountedRef.current = true
    setIsLoading(true)
    setStatus(null)
    setError(null)
    void syncStatus()

    return () => {
      mountedRef.current = false
    }
  }, [syncStatus])

  useEffect(() => {
    if (status && !shouldPoll(status.state)) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      void syncStatus()
    }, pollingIntervalMs)

    return () => window.clearInterval(intervalId)
  }, [pollingIntervalMs, status, syncStatus])

  return useMemo(
    () => ({
      error,
      isLoading,
      refresh: syncStatus,
      status,
    }),
    [error, isLoading, status, syncStatus],
  )
}
