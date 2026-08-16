import { useEffect, useRef } from 'react'
import type { SessionStatus } from '../types/session'

interface TimerAudioControls {
  playEndBeep: () => Promise<void>
  playWarningBeep: () => Promise<void>
}

export function useTimerAudioTransitions(
  status: SessionStatus | null,
  audio: TimerAudioControls,
) {
  const previousStatusRef = useRef<SessionStatus | null>(null)

  useEffect(() => {
    const previousStatus = previousStatusRef.current
    previousStatusRef.current = status

    if (!status || status.mode !== 'timed' || !status.responseStarted) {
      return
    }

    if (
      status.state === 'WARNING' &&
      status.warning &&
      !previousStatus?.warning
    ) {
      void audio.playWarningBeep().catch(() => undefined)
    }

    if (
      status.state === 'TIME_EXPIRED' &&
      previousStatus?.state !== 'TIME_EXPIRED'
    ) {
      void audio.playEndBeep().catch(() => undefined)
    }
  }, [audio, status])
}
