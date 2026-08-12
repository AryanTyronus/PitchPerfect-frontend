import type { EvaluationMetric } from '../../types/evaluation'

interface MetricBarProps {
  metric: EvaluationMetric
}

export function MetricBar({ metric }: MetricBarProps) {
  return (
    <div className="metric-row">
      <div>
        <span>{metric.label}</span>
        <strong>{metric.score}</strong>
      </div>
      <div className="metric-track" aria-hidden="true">
        <span style={{ width: `${metric.score}%` }} />
      </div>
    </div>
  )
}
