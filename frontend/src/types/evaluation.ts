export interface EvaluationMetric {
  label: 'Clarity' | 'Confidence' | 'Structure' | 'Conciseness' | 'Delivery'
  score: number
}

export interface EvaluationResult {
  sessionId: string
  overallScore: number
  metrics: EvaluationMetric[]
  strengths: string[]
  improvements: string[]
  nextPractice: string
}
