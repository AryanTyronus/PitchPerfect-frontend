import type { Question } from '../../types/interview'
import { Badge } from '../ui/Badge'

interface QuestionPanelProps {
  question: Question
}

export function QuestionPanel({ question }: QuestionPanelProps) {
  return (
    <section className="question-panel">
      <Badge>
        Question {question.number} / {question.total}
      </Badge>
      <h1>{question.prompt}</h1>
    </section>
  )
}
