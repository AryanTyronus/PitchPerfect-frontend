import { env } from '../config/env'

export class ApiClientError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, init)

  if (!response.ok) {
    throw new ApiClientError(
      `Request failed with status ${response.status}`,
      response.status,
    )
  }

  return response.json() as Promise<T>
}
