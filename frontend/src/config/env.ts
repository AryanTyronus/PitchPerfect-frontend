function normalizeBaseUrl(url: string | undefined): string {
  return (url ?? '').replace(/\/+$/, '')
}

function defaultWsOrigin(): string {
  if (typeof window === 'undefined') {
    return ''
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}`
}

export const env = {
  apiBaseUrl: normalizeBaseUrl(import.meta.env.VITE_API_URL),
  wsBaseUrl: normalizeBaseUrl(import.meta.env.VITE_WS_URL ?? defaultWsOrigin()),
  useMockApi: import.meta.env.VITE_USE_MOCK_API !== 'false',
  apiToken: import.meta.env.VITE_API_TOKEN ?? '',
}