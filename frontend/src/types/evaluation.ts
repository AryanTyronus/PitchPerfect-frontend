export interface EvaluationMetric {
  label:
    | 'Clarity'
    | 'Confidence'
    | 'Structure'
    | 'Conciseness'
    | 'Delivery'
    | 'Eye Contact'
  score: number
}

export interface EvaluationResult {
  sessionId: string
  overallScore: number
  metrics: EvaluationMetric[]
  eyeContactPercentage?: number | null
  strengths: string[]
  improvements: string[]
  nextPractice: string
}
