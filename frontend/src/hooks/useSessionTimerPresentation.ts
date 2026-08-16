import { useEffect, useMemo, useState } from 'react'
import type { SessionStatus } from '../types/session'

interface TimerPresentation {
  displaySeconds: number | null
  isUrgent: boolean
  label: string
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return `${minutes.toString().padStart(2, '0')}:${remaining
    .toString()
    .padStart(2, '0')}`
}

export function useSessionTimerPresentation(
  status: SessionStatus | null,
): TimerPresentation {
  const [displaySeconds, setDisplaySeconds] = useState<number | null>(
    status?.remainingSeconds ?? null,
  )

  useEffect(() => {
    setDisplaySeconds(status?.remainingSeconds ?? null)
  }, [status?.remainingSeconds])

  useEffect(() => {
    if (
      status?.remainingSeconds === null ||
      status?.remainingSeconds === undefined ||
      !status.responseStarted ||
      status.state === 'TIME_EXPIRED' ||
      status.state === 'PROCESSING' ||
      status.state === 'EVALUATED' ||
      status.state === 'COMPLETED'
    ) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setDisplaySeconds((current) => {
        if (current === null) {
          return current
        }

        return Math.max(current - 1, 0)
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [status?.remainingSeconds, status?.responseStarted, status?.state])

  return useMemo(
    () => ({
      displaySeconds,
      isUrgent: Boolean(status?.warning),
      label: displaySeconds === null ? 'Untimed' : formatTime(displaySeconds),
    }),
    [displaySeconds, status?.warning],
  )
}
