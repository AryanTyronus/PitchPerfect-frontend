export interface SubScores {
  clarity: number
  relevance: number
  professionalism: number
  structure: number
  impact: number
}

export interface EvaluationResult {
  sessionId: string
  score: number
  disqualified: boolean
  feedback: string
  sub_scores: SubScores
  eyeContactPercentage?: number | null
}
