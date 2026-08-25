interface DisqualifiedBannerProps {
  message?: string
}

/**
 * Shown when the backend evaluation flagged the response as disqualified
 * (professional misconduct, incoherent audio, or a policy violation).
 */
export function DisqualifiedBanner({ message }: DisqualifiedBannerProps) {
  return (
    <section className="disqualified-banner" role="alert" data-od-id="disqualified-banner">
      <span className="disqualified-badge">Disqualified</span>
      <p>
        {message ||
          'This response was flagged by the evaluator and cannot receive a standard score.'}
      </p>
    </section>
  )
}
