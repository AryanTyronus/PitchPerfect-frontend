interface FeedbackListProps {
  title: string
  items: string[]
  kind: 'strength' | 'improvement'
}

export function FeedbackList({ title, items, kind }: FeedbackListProps) {
  const iconSvg =
    kind === 'strength' ? (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ) : (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    )

  return (
    <section
      className={`feedback-panel feedback-${kind}`}
      data-od-id={`feedback-${kind}`}
    >
      <header className="feedback-panel-header">
        <h2>{title}</h2>
        <p className="feedback-counter">
          {items.length} {items.length === 1 ? 'point' : 'points'}
        </p>
      </header>
      <ul className="feedback-list">
        {items.map((item) => (
          <li key={item} className="feedback-item">
            <span className="feedback-icon">{iconSvg}</span>
            <p className="feedback-text">{item}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}