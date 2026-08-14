import { useEffect, useState } from 'react'

function readPreference(): boolean {
  if (typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(readPreference)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return undefined
    }

    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(query.matches)

    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    }

    return undefined
  }, [])

  return reduced
}