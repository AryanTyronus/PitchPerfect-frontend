import type { CSSProperties, ReactNode } from 'react'
import { useInView } from '../../hooks/useInView'
import { useReducedMotion } from '../../hooks/useReducedMotion'

interface RevealProps {
  as?: 'div' | 'section' | 'article' | 'li' | 'header' | 'figure' | 'p' | 'h2'
  children: ReactNode
  className?: string
  dataOdId?: string
  delay?: number
  style?: CSSProperties
}

export function Reveal({
  as: Tag = 'div',
  children,
  className = '',
  dataOdId,
  delay = 0,
  style,
}: RevealProps) {
  const reduced = useReducedMotion()
  const [ref, inView] = useInView<HTMLDivElement>()

  const classes = inView
    ? `${className} reveal is-in`
    : `${className} reveal`

  const styles = {
    ...style,
    '--reveal-delay': reduced ? '0ms' : `${delay}ms`,
  } as CSSProperties

  return (
    <Tag
      className={classes}
      data-od-id={dataOdId}
      data-od-reveal=""
      ref={ref as never}
      style={styles}
    >
      {children}
    </Tag>
  )
}