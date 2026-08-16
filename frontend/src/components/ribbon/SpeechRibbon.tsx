import { useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useTheme } from '../../hooks/useTheme'
import type { RibbonFlow, RibbonVariant, RibbonWord } from './ribbonPresets'

const FALLBACK_COLORS: Record<string, string> = {
  '--fg': 'oklch(18% 0.012 250)',
  '--muted': 'oklch(54% 0.012 250)',
  '--muted-strong': 'oklch(43% 0.015 250)',
  '--accent': 'oklch(58% 0.18 255)',
  '--accent-strong': 'oklch(50% 0.17 258)',
  '--signal': 'oklch(62% 0.12 170)',
  '--signal-strong': 'oklch(50% 0.11 170)',
}

function cssVar(name: string): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return FALLBACK_COLORS[name] ?? ''
  }
  try {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim()
    return value || (FALLBACK_COLORS[name] ?? '')
  } catch {
    return FALLBACK_COLORS[name] ?? ''
  }
}

const DISPLAY_FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

type LabelTone = 'neutral' | 'live' | 'warning' | 'danger'

interface SpeechRibbonProps {
  /** Words (or { text, weight }) that flow through the ribbon. */
  words: Array<string | RibbonWord>
  /** 0 = calm, 1 = fully active. */
  intensity?: number
  flow?: RibbonFlow
  /** Interviewer THINKING — flow slows and re-groups around the centre. */
  organizing?: boolean
  /** RECORDING — subtle pulses travel through the stream. */
  pulsing?: boolean
  /** TIME_EXPIRED — the stream settles on a clean endpoint. */
  frozen?: boolean
  /** WARNING — tighter spacing, higher energy. */
  compact?: boolean
  variant?: RibbonVariant
  /** Cursor influence (hero only). */
  parallax?: boolean
  /** Small readable state annotation. Decorative; the live copy also exists nearby. */
  stateLabel?: string | null
  labelTone?: LabelTone
  className?: string
}

type RibbonWordEntry = { text: string; weight: number }

interface Particle {
  text: string
  size: number
  lane: number
  x: number
  speed: number
  weight: number
  phase: number
  colorIndex: number
}

interface EngineState {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  particles: Particle[]
  frontColors: string[]
  backColors: string[]
  signalColor: string
  accentColor: string
  needLayout: boolean
  raf: number
}

function pseudo(i: number): number {
  const value = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return value - Math.floor(value)
}

export function SpeechRibbon({
  words,
  intensity = 0.5,
  flow = 'forward',
  organizing = false,
  pulsing = false,
  frozen = false,
  compact = false,
  variant = 'hero',
  parallax = false,
  stateLabel = null,
  labelTone = 'neutral',
  className,
}: SpeechRibbonProps) {
  const reduced = useReducedMotion()
  const { theme } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [canvasFailed, setCanvasFailed] = useState(false)

  const entries = useMemo<RibbonWordEntry[]>(
    () =>
      words.map((word, index) => {
        if (typeof word === 'string') {
          return { text: word, weight: 0.35 + (pseudo(index) * 10) / 14 }
        }
        return { text: word.text, weight: word.weight }
      }),
    [words],
  )
  const wordsKey = useMemo(
    () => entries.map((word) => word.text).join('|') + `|${variant}|${compact}`,
    [entries, variant, compact],
  )

  const latestRef = useRef({ entries, intensity, flow, organizing, pulsing, frozen })
  latestRef.current = { entries, intensity, flow, organizing, pulsing, frozen }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return undefined
    }

    let ctx: CanvasRenderingContext2D | null = null
    try {
      ctx = canvas.getContext('2d')
    } catch {
      ctx = null
    }
    if (!ctx) {
      setCanvasFailed(true)
      return undefined
    }
    setCanvasFailed(false)

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const engine: EngineState = {
      ctx,
      width: 0,
      height: 0,
      particles: [],
      frontColors: [
        cssVar('--accent-strong') || cssVar('--accent'),
        cssVar('--signal-strong') || cssVar('--signal'),
        cssVar('--fg'),
      ],
      backColors: [
        cssVar('--muted-strong') || cssVar('--muted'),
        cssVar('--muted'),
      ],
      signalColor: cssVar('--signal') || '#3fbfa5',
      accentColor: cssVar('--accent') || '#7c8cff',
      needLayout: true,
      raf: 0,
    }

    let running = false
    let visible = true
    let tabVisible = true
    const bias = { x: 0, y: 0, tx: 0, ty: 0 }
    let raf: number = 0

    const setSize = () => {
      const rect = canvas.getBoundingClientRect()
      engine.width = Math.max(rect.width, 1)
      engine.height = Math.max(rect.height, 1)
      canvas.width = Math.round(engine.width * dpr)
      canvas.height = Math.round(engine.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      engine.needLayout = true
    }

    const resizeObserver =
      typeof ResizeObserver === 'function' ? new ResizeObserver(setSize) : null
    resizeObserver?.observe(canvas)
    if (!resizeObserver) {
      window.addEventListener('resize', setSize)
    }
    setSize()

    const buildLayout = () => {
      const { width, height } = engine
      if (entries.length === 0) {
        engine.particles = []
        engine.needLayout = false
        return
      }

      const scale = compact ? 0.82 : 1
      const margin = (width + height) * 0.04
      engine.particles = entries.map((word, index) => {
        const size = height * (0.05 + 0.12 * word.weight) * scale
        const spread = width + margin * 2
        const jitter = 0.3 * (pseudo(index + 1) - 0.5)
        const x = -margin + spread * ((index + 0.5 + jitter) / entries.length)
        return {
          text: word.text,
          size,
          lane: 0.14 + pseudo(index) * 0.72,
          x,
          speed: (16 + 34 * word.weight) * scale,
          weight: word.weight,
          phase: pseudo(index + 2) * Math.PI * 2,
          colorIndex: index % engine.frontColors.length,
        }
      })
      engine.needLayout = false
    }

    const wrap = (particle: Particle, textWidth: number) => {
      if (particle.x > engine.width + particle.size) {
        particle.x = -textWidth - particle.size
        particle.lane = 0.14 + pseudo(Math.floor(particle.x * 7) + 13) * 0.72
      } else if (particle.x < -textWidth - particle.size) {
        particle.x = engine.width + particle.size
        particle.lane = 0.14 + pseudo(Math.floor(particle.x * 7) + 29) * 0.72
      }
    }

    const draw = (time: number) => {
      const { width, height } = engine
      const latest = latestRef.current
      ctx.clearRect(0, 0, width, height)

      bias.x += (bias.tx - bias.x) * 0.05
      bias.y += (bias.ty - bias.y) * 0.05
      const parallaxX = parallax ? bias.x * width * 0.02 : 0
      const parallaxY = parallax ? bias.y * height * 0.012 : 0

      const intensitySq = latest.intensity * latest.intensity
      const dir = latest.flow === 'reverse' ? -1 : 1
      const baseSpeed = latest.flow === 'still' || latest.organizing ? 0.15 : 1
      const endpointX = width * 0.5

      for (const particle of engine.particles) {
        const onward = latest.frozen ? 0 : baseSpeed * intensitySq
        const travel = latest.pulsing ? 1.35 : 1
        particle.x += dir * particle.speed * onward * travel

        if (latest.organizing && !latest.frozen) {
          particle.x += (endpointX - particle.x) * 0.0018
        }

        ctx.font = `${particle.weight > 0.6 ? 600 : 500} ${Math.round(particle.size)}px ${DISPLAY_FONT}`
        const textWidth = ctx.measureText(particle.text).width

        const wobble = latest.frozen
          ? Math.sin(time * 0.5 + particle.phase) * height * 0.02
          : Math.sin(time * 0.8 + particle.phase) * height * 0.045
        const y =
          (latest.frozen ? height * 0.5 : height * particle.lane) +
          wobble +
          parallaxY

        const reorganize =
          latest.organizing && !latest.frozen
            ? 0.55 + 0.45 * Math.sin(time * 1.1 + particle.x * 0.01 + particle.phase)
            : 1
        const settle = frozenAlpha(latest.frozen, particle.x, endpointX)
        const breathe = 0.72 + 0.28 * Math.sin(time * 0.5 + particle.phase)
        const alpha = Math.max(settle * (0.1 + 0.34 * particle.weight) * reorganize * breathe, 0.02)

        const isFront = particle.weight > 0.6
        ctx.fillStyle = isFront
          ? engine.frontColors[particle.colorIndex % engine.frontColors.length]
          : engine.backColors[particle.colorIndex % engine.backColors.length]
        ctx.globalAlpha = alpha
        ctx.textBaseline = 'middle'
        ctx.fillText(particle.text, particle.x + parallaxX, y)

        wrap(particle, textWidth)
      }
      ctx.globalAlpha = 1

      if (latest.pulsing && !latest.frozen) {
        for (let i = 0; i < 3; i += 1) {
          const t = (time * 0.14 + i / 3) % 1
          const x = width * (0.06 + t * 0.88)
          const y = height * (0.3 + i * 0.2) + Math.sin(time * 1.2 + i * 2.1) * height * 0.02
          const radius = 2 + Math.sin(t * Math.PI) * 3
          ctx.beginPath()
          ctx.arc(x, y, radius, 0, Math.PI * 2)
          ctx.fillStyle = engine.signalColor
          ctx.globalAlpha = 0.75 * Math.sin(t * Math.PI)
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }

      if (latest.frozen) {
        const cx = endpointX
        const cy = height * 0.5
        ctx.strokeStyle = engine.accentColor
        ctx.globalAlpha = 0.55
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.moveTo(cx - 28, cy)
        ctx.lineTo(cx - 2, cy)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(cx + 4, cy, 3.4, 0, Math.PI * 2)
        ctx.fillStyle = engine.accentColor
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }

    const loop = (time: number) => {
      if (!running) {
        return
      }
      if (engine.needLayout) {
        buildLayout()
      }
      draw(time / 1000)
      raf = requestAnimationFrame(loop)
    }

    const start = () => {
      if (running) {
        return
      }
      running = true
      raf = requestAnimationFrame(loop)
    }

    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }

    const canAnimate = () => tabVisible && visible

    const syncLoop = () => {
      if (reduced) {
        stop()
        return
      }
      if (canAnimate()) {
        start()
      } else {
        stop()
      }
    }

    const handleVisibilityChange = () => {
      tabVisible = document.visibilityState === 'visible'
      syncLoop()
    }

    const intersectionObserver =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver((entries) => {
            visible = entries[0]?.isIntersecting ?? true
            syncLoop()
          })
        : null
    intersectionObserver?.observe(canvas)

    const handlePointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      bias.tx = ((event.clientX - rect.left) / rect.width - 0.5) * 2
      bias.ty = ((event.clientY - rect.top) / rect.height - 0.5) * 2
    }
    const handlePointerLeave = () => {
      bias.tx = 0
      bias.ty = 0
    }
    if (parallax) {
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerleave', handlePointerLeave)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    if (reduced) {
      if (engine.needLayout) {
        buildLayout()
      }
      draw(2.2)
    } else {
      start()
    }

    return () => {
      stop()
      resizeObserver?.disconnect()
      if (!resizeObserver) {
        window.removeEventListener('resize', setSize)
      }
      intersectionObserver?.disconnect()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerleave', handlePointerLeave)
    }
  }, [reduced, wordsKey, parallax, entries, compact, theme])

  const fallback = (
    <div
      aria-hidden="true"
      className={`ribbon ${className ?? ''}`.trim()}
      data-od-id="speech-ribbon-fallback"
    >
      <ul className="ribbon-fallback">
        {entries.map((word, index) => (
          <li key={`${word.text}-${index}`}>
            <span style={{ opacity: 0.15 + word.weight * 0.4 }}>{word.text}</span>
          </li>
        ))}
      </ul>
      {stateLabel ? (
        <span className="ribbon-kicker">
          <span className="ribbon-kicker-dot" />
          {stateLabel}
        </span>
      ) : null}
    </div>
  )

  if (canvasFailed) {
    return fallback
  }

  return (
    <div aria-hidden="true" className={`ribbon ${className ?? ''}`.trim()}>
      <canvas className="ribbon-canvas" ref={canvasRef} />
      {stateLabel ? (
        <span className={`ribbon-kicker ribbon-kicker-${labelTone}`}>
          <span className="ribbon-kicker-dot" />
          {stateLabel}
        </span>
      ) : null}
    </div>
  )
}

function frozenAlpha(frozen: boolean, x: number, endpointX: number): number {
  if (!frozen) {
    return 1
  }
  const distance = Math.min(Math.abs(x - endpointX) / 220, 1)
  return Math.max(1 - distance * 1.4, 0.04)
}