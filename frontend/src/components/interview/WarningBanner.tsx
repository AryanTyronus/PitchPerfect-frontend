import type { SessionState } from '../../types/session'

interface WarningBannerProps {
  state: SessionState
  warning: boolean
}

export function WarningBanner({ state, warning }: WarningBannerProps) {
  if (state === 'TIME_EXPIRED') {
    return (
      <section className="warning-banner expired-banner" role="status">
        <strong>Time&apos;s up.</strong>
        <span>Your microphone has been stopped. Submit the recorded answer to continue.</span>
      </section>
    )
  }

  if (!warning) {
    return null
  }

  return (
    <section className="warning-banner" role="status" aria-live="polite">
      <strong>10 seconds remaining</strong>
      <span>Finish your answer clearly and calmly.</span>
    </section>
  )
}
