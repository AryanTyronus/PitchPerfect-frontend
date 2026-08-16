import type { Question } from '../../types/interview'

interface QuestionPanelProps {
  question: Question
}

export function QuestionPanel({ question }: QuestionPanelProps) {
  return (
    <section className="question-panel" data-od-id="question-panel">
      <div className="question-chip">
        <span>Question {question.number.toString().padStart(2, '0')}</span>
        <span className="q-count">of {question.total.toString().padStart(2, '0')}</span>
      </div>
      <h1>{question.prompt}</h1>
    </section>
  )
}