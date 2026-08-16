import { useId } from 'react'
import type { CSSProperties } from 'react'

interface ScoreRingProps {
  score: number
  max?: number
  size?: number
  animate?: boolean
}

export function ScoreRing({
  score,
  max = 100,
  size,
  animate = true,
}: ScoreRingProps) {
  const gradientId = useId()
  const radius = 74
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(Math.max(score, 0), max)
  const progress = clamped / max
  const offset = circumference * (1 - progress)

  const ringStyle = size
    ? ({ '--ring-size': `${size}px` } as CSSProperties)
    : undefined

  const fillStyle = {
    strokeDashoffset: offset,
    '--ring-dashoffset': offset.toFixed(1),
    ...(animate ? {} : { animation: 'none' }),
  } as CSSProperties

  return (
    <div
      aria-label={`Overall score ${score} out of ${max}`}
      className="score-ring"
      data-od-id="score-ring"
      role="img"
      style={ringStyle}
    >
      <svg className="score-ring-svg" viewBox="0 0 168 168">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-strong)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <circle
          className="score-ring-track"
          cx="84"
          cy="84"
          r={radius}
          fill="none"
          strokeWidth={10}
        />
        <circle
          className="score-ring-fill"
          cx="84"
          cy="84"
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={fillStyle.strokeDashoffset}
          style={fillStyle}
          transform="rotate(-90 84 84)"
        />
      </svg>
      <div className="score-ring-value">
        <strong>{score}</strong>
        <span>/ {max}</span>
      </div>
    </div>
  )
}