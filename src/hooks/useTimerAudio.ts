import { useCallback, useRef } from 'react'

type BrowserAudioContext = AudioContext

function getAudioContextConstructor() {
  return window.AudioContext
}

export function useTimerAudio() {
  const audioContextRef = useRef<BrowserAudioContext | null>(null)

  const getAudioContext = useCallback(() => {
    const AudioContextConstructor = getAudioContextConstructor()

    if (!AudioContextConstructor) {
      return null
    }

    audioContextRef.current ??= new AudioContextConstructor()
    return audioContextRef.current
  }, [])

  const unlockAudio = useCallback(async () => {
    try {
      const context = getAudioContext()
      if (context?.state === 'suspended') {
        await context.resume()
      }
    } catch {
      // Browser audio policies vary; visual warnings remain the source of truth.
    }
  }, [getAudioContext])

  const playTone = useCallback(
    async (frequency: number, durationMs: number, gainValue: number) => {
      try {
        const context = getAudioContext()

        if (!context) {
          return
        }

        if (context.state === 'suspended') {
          await context.resume()
        }

        const oscillator = context.createOscillator()
        const gain = context.createGain()
        const now = context.currentTime
        oscillator.frequency.value = frequency
        oscillator.type = 'sine'
        gain.gain.setValueAtTime(0.0001, now)
        gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.015)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000)
        oscillator.connect(gain)
        gain.connect(context.destination)
        oscillator.start(now)
        oscillator.stop(now + durationMs / 1000)
      } catch {
        // Audio is supplemental; blocked playback must not interrupt the interview.
      }
    },
    [getAudioContext],
  )

  const playWarningBeep = useCallback(
    () => playTone(880, 140, 0.06),
    [playTone],
  )

  const playEndBeep = useCallback(
    () => playTone(440, 260, 0.08),
    [playTone],
  )

  return { playEndBeep, playWarningBeep, unlockAudio }
}
