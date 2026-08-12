import { useCallback, useEffect, useMemo, useState } from 'react'

export type AppRoute =
  | { name: 'landing'; path: '/' }
  | { name: 'setup'; path: '/setup' }
  | { name: 'interview'; path: '/interview/:sessionId'; sessionId: string }
  | { name: 'processing'; path: '/processing/:sessionId'; sessionId: string }
  | { name: 'results'; path: '/results/:sessionId'; sessionId: string }
  | { name: 'not-found'; path: '*' }

function parseRoute(pathname: string): AppRoute {
  const interviewMatch = pathname.match(/^\/interview\/([^/]+)$/)
  if (interviewMatch) {
    return {
      name: 'interview',
      path: '/interview/:sessionId',
      sessionId: interviewMatch[1],
    }
  }

  const processingMatch = pathname.match(/^\/processing\/([^/]+)$/)
  if (processingMatch) {
    return {
      name: 'processing',
      path: '/processing/:sessionId',
      sessionId: processingMatch[1],
    }
  }

  const resultsMatch = pathname.match(/^\/results\/([^/]+)$/)
  if (resultsMatch) {
    return {
      name: 'results',
      path: '/results/:sessionId',
      sessionId: resultsMatch[1],
    }
  }

  if (pathname === '/') {
    return { name: 'landing', path: '/' }
  }

  if (pathname === '/setup') {
    return { name: 'setup', path: '/setup' }
  }

  return { name: 'not-found', path: '*' }
}

export function useAppRouter() {
  const [route, setRoute] = useState<AppRoute>(() =>
    parseRoute(window.location.pathname),
  )

  useEffect(() => {
    const handlePopState = () => setRoute(parseRoute(window.location.pathname))
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path)
    setRoute(parseRoute(path))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return useMemo(() => ({ route, navigate }), [navigate, route])
}
