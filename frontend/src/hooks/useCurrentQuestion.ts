import { useEffect, useState } from 'react'
import { sessionsApi } from '../services/sessionsApi'
import type { SessionsApi } from '../types/api'
import type { Question } from '../types/interview'

interface UseCurrentQuestionOptions {
  api?: SessionsApi
}

export function useCurrentQuestion(
  sessionId: string,
  options: UseCurrentQuestionOptions = {},
) {
  const api = options.api ?? sessionsApi
  const [question, setQuestion] = useState<Question | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadQuestion() {
      setIsLoading(true)
      setError(null)

      try {
        const nextQuestion = await api.getCurrentQuestion(sessionId)
        if (active) {
          setQuestion(nextQuestion)
        }
      } catch {
        if (active) {
          setError('Question unavailable. Please restart this practice session.')
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadQuestion()

    return () => {
      active = false
    }
  }, [api, sessionId])

  return { error, isLoading, question }
}
