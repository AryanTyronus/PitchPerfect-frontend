import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type AppRoute =
  | { name: 'landing'; path: '/' }
  | { name: 'setup'; path: '/setup' }
  | { name: 'interview'; path: '/interview/:sessionId'; sessionId: string }
  | { name: 'processing'; path: '/processing/:sessionId'; sessionId: string }
  | { name: 'results'; path: '/results/:sessionId'; sessionId: string }
  | { name: 'not-found'; path: '*' }

export type NavigationDirection = 'forward' | 'back'

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
  const [direction, setDirection] = useState<NavigationDirection>('forward')
  const depthRef = useRef(0)

  useEffect(() => {
    const handlePopState = () => {
      depthRef.current = Math.max(depthRef.current - 1, 0)
      setDirection('back')
      setRoute(parseRoute(window.location.pathname))
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path)
    depthRef.current += 1
    setDirection('forward')
    setRoute(parseRoute(path))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const key = route.name === 'interview' || route.name === 'processing' || route.name === 'results'
    ? `${route.name}/${route.sessionId}`
    : route.path

  return useMemo(
    () => ({ direction, key, navigate, route }),
    [direction, key, navigate, route],
  )
}
