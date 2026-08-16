import { env } from '../config/env'
import { mockSessionsApi } from '../mocks/mockSessionsApi'
import type { SessionsApi } from '../types/api'

const fastApiSessionsApi: SessionsApi = {
  async createSession() {
    throw new Error('FastAPI integration is not implemented yet.')
  },
  async beginResponse() {
    throw new Error('FastAPI integration is not implemented yet.')
  },
  async getCurrentQuestion() {
    throw new Error('FastAPI integration is not implemented yet.')
  },
  async getSessionStatus() {
    throw new Error('FastAPI integration is not implemented yet.')
  },
  async uploadResponse() {
    throw new Error('FastAPI integration is not implemented yet.')
  },
  async getResult() {
    throw new Error('FastAPI integration is not implemented yet.')
  },
}

export const sessionsApi: SessionsApi = env.useMockApi
  ? mockSessionsApi
  : fastApiSessionsApi
