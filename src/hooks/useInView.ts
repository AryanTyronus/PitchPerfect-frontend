import { useEffect, useRef, useState } from 'react'

interface InViewOptions {
  rootMargin?: string
  threshold?: number
}

export function useInView<T extends HTMLElement>(
  options: InViewOptions = {},
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null)
  const [observed, setObserved] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) {
      return undefined
    }
    if (typeof IntersectionObserver !== 'function') {
      setObserved(true)
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting) {
          setObserved(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: options.rootMargin ?? '0px 0px -8% 0px',
        threshold: options.threshold ?? 0.15,
      },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [options.rootMargin, options.threshold])

  return [ref, observed]
}