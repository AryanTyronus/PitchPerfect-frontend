import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Reveal } from '../components/motion/Reveal'
import { RIBBON_WORDS } from '../components/ribbon/ribbonPresets'
import { SpeechRibbon } from '../components/ribbon/SpeechRibbon'
import { Button } from '../components/ui/Button'
import { StatusIndicator } from '../components/ui/StatusIndicator'
import { useInView } from '../hooks/useInView'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface LandingPageProps {
  onNavigate: (path: string) => void
}

const steps = [
  {
    id: 'pick-a-track',
    title: 'Pick a track',
    copy: 'Choose what you want to practice.',
  },
  {
    id: 'step-into-the-room',
    title: 'Step into the room',
    copy: 'Record your response under real-time constraints.',
  },
  {
    id: 'get-your-debrief',
    title: 'Get your AI debrief',
    copy: 'See structured feedback on how you communicated and what to improve.',
  },
]

const tracks = [
  {
    id: 'technical',
    title: 'Technical',
    copy: 'Think clearly under pressure.',
    tag: 'systems · tradeoffs · evidence',
  },
  {
    id: 'behavioral',
    title: 'Behavioral',
    copy: 'Structure stronger answers.',
    tag: 'story · action · result',
  },
  {
    id: 'college',
    title: 'College',
    copy: 'Prepare for the questions that matter.',
    tag: 'fit · direction · growth',
  },
  {
    id: 'public-speaking',
    title: 'Public Speaking',
    copy: 'Improve presence and delivery.',
    tag: 'presence · cadence · voice',
  },
]

const sampleMetrics = [
  { label: 'Clarity', value: 88 },
  { label: 'Pacing', value: 82 },
  { label: 'Delivery', value: 85 },
]

function scrollToSection() {
  const section = document.getElementById('how-it-works')
  if (!section) {
    return
  }
  const top = section.getBoundingClientRect().top + window.scrollY - 90
  window.scrollTo({ top, behavior: 'smooth' })
}

function SectionHead({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string
  title: string
  lead?: string
}) {
  return (
    <div className="section-head">
      <Reveal>
        <p className="eyebrow">{eyebrow}</p>
      </Reveal>
      <Reveal as="h2" delay={40}>
        {title}
      </Reveal>
      {lead ? (
        <Reveal as="p" className="section-lead" delay={80}>
          {lead}
        </Reveal>
      ) : null}
    </div>
  )
}

function useCountUp(target: number, active: boolean, duration = 1100): number {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!active) {
      return undefined
    }
    if (typeof requestAnimationFrame !== 'function') {
      setValue(target)
      return undefined
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))))
      if (t < 1) {
        raf = requestAnimationFrame(tick)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, duration, target])

  return value
}

function SampleOverall() {
  const reduced = useReducedMotion()
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.4 })
  const value = useCountUp(84, inView && !reduced)

  return (
    <div className="debrief-overall" data-od-id="debrief-overall" ref={ref}>
      <strong className="debrief-overall-value">{value}</strong>
      <span className="debrief-overall-label">Overall</span>
    </div>
  )
}

function SampleMetricRow({
  label,
  value,
  index,
  count = false,
}: {
  label: string
  value: number
  index: number
  count?: boolean
}) {
  const style = { '--channel-width': `${value}%` } as CSSProperties
  const id = `debrief-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <Reveal
      as="div"
      className={`channel-row${count ? ' is-count' : ''}`}
      data-od-id={id}
      delay={index * 80}
    >
      <span className="channel-node" aria-hidden="true" />
      <span className="channel-label">{label}</span>
      {count ? (
        <span className="debrief-metric-note">lower is better</span>
      ) : (
        <div
          aria-label={`${label} ${value}`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={value}
          className="channel-track"
          role="progressbar"
        >
          <span style={style} />
        </div>
      )}
      <strong className="channel-score">{value}</strong>
    </Reveal>
  )
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  const heroRef = useRef<HTMLElement | null>(null)
  const [ribbonIntensity, setRibbonIntensity] = useState(0.5)

  useEffect(() => {
    let raf = 0
    let last = 0
    const handleScroll = () => {
      if (raf) {
        return
      }
      raf = requestAnimationFrame(() => {
        raf = 0
        const hero = heroRef.current
        if (!hero) {
          return
        }
        const rect = hero.getBoundingClientRect()
        const progress = Math.min(Math.max(-rect.top / Math.max(rect.height, 1), 0), 1)
        hero.style.setProperty('--ribbon-scroll', progress.toFixed(3))
        const nextIntensity = 0.5 + progress * 0.22
        if (Math.abs(nextIntensity - last) > 0.02) {
          last = nextIntensity
          setRibbonIntensity(nextIntensity)
        }
      })
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (raf) {
        cancelAnimationFrame(raf)
      }
    }
  }, [])

  return (
    <div className="landing-page">
      <section className="hero-section" data-od-id="hero" ref={heroRef}>
        <div className="hero-ribbon" aria-hidden="true">
          <SpeechRibbon
            words={RIBBON_WORDS.hero}
            flow="forward"
            intensity={ribbonIntensity}
            parallax
            variant="hero"
          />
        </div>

        <div className="hero-inner">
          <div className="hero-copy">
            <Reveal>
              <p className="eyebrow">AI communication coach</p>
            </Reveal>
            <Reveal delay={60}>
              <h1>
                Speak better.
                <br />
                Think clearer.
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="hero-support">
                Practice interviews and public speaking in a focused room. Your
                words flow through a live speech stream, then come back to you as
                an AI coaching debrief that makes the next answer sharper.
              </p>
            </Reveal>
            <Reveal delay={180}>
              <div className="hero-actions">
                <Button data-od-id="cta-start" onClick={() => onNavigate('/setup')}>
                  Start practicing
                </Button>
                <Button variant="secondary" onClick={scrollToSection}>
                  How it works
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="landing-section" data-od-id="how-it-works" id="how-it-works">
        <SectionHead
          eyebrow="The loop"
          title="How it works"
          lead="Three moves between hearing the question and getting a sharper answer."
        />
        <div className="steps">
          {steps.map((step, index) => (
            <Reveal
              as="article"
              className="step"
              data-od-id={`step-${step.id}`}
              delay={index * 90}
              key={step.id}
            >
              <span className="step-index">0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="landing-section" data-od-id="practice-tracks">
        <SectionHead
          eyebrow="Practice tracks"
          title="What can you practice?"
          lead="Interview prep and public speaking in the same focused room."
        />
        <div className="tracks">
          {tracks.map((track, index) => (
            <article
              aria-label={`${track.title}: ${track.copy}`}
              className="track"
              data-od-id={`track-${track.id}`}
              key={track.id}
              tabIndex={0}
            >
              <Reveal delay={index * 70}>
                <span className="track-index">0{index + 1}</span>
                <div className="track-copy">
                  <h3>{track.title}</h3>
                  <p>{track.copy}</p>
                </div>
                <span className="track-tag" aria-hidden="true">
                  {track.tag}
                </span>
              </Reveal>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" data-od-id="sample-room">
        <SectionHead
          eyebrow="Inside the room"
          title="Step into the room"
          lead="One question, a live timer, and your answer on a quiet stage. This is a preview — nothing is recorded here."
        />
        <Reveal delay={80}>
          <div className="room-preview" data-od-id="sample-room-preview">
            <div className="room-preview-top">
              <span className="room-preview-label">Interview room</span>
              <span className="room-preview-chip">Question 1 of 3</span>
            </div>
            <div className="room-preview-body">
              <div className="room-preview-question">
                <p className="eyebrow">Interview question</p>
                <h3>Tell me about a project you're proud of.</h3>
                <div className="room-preview-meta">
                  <StatusIndicator label="Recording" tone="live" />
                  <span className="room-preview-timer">01:42</span>
                </div>
              </div>
              <div className="room-preview-stage">
                <span className="rec-chip is-recording">REC</span>
                <SpeechRibbon
                  words={RIBBON_WORDS.speech}
                  flow="forward"
                  intensity={0.72}
                  pulsing
                  stateLabel="Answer flowing"
                  labelTone="live"
                  variant="stream"
                />
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="landing-section" data-od-id="sample-debrief">
        <SectionHead
          eyebrow="Sample debrief"
          title="Your speech, broken down."
          lead="PitchPerfect turns your response into structured communication feedback."
        />
        <div className="debrief-preview" data-od-id="sample-debrief-preview">
          <div className="debrief-preview-band" aria-hidden="true">
            <SpeechRibbon
              words={RIBBON_WORDS.analysis}
              flow="forward"
              intensity={0.5}
              variant="analysis"
            />
          </div>
          <div className="debrief-preview-grid">
            <SampleOverall />
            <div className="debrief-metrics">
              {sampleMetrics.map((metric, index) => (
                <SampleMetricRow
                  index={index}
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                />
              ))}
              <SampleMetricRow index={3} label="Filler words" value={6} count />
            </div>
          </div>
          <div className="debrief-feedback">
            <Reveal as="div" className="debrief-feedback-block" delay={120}>
              <p className="eyebrow">What worked</p>
              <blockquote>Clear opening and strong example.</blockquote>
            </Reveal>
            <Reveal as="div" className="debrief-feedback-block" delay={180}>
              <p className="eyebrow">Next focus</p>
              <blockquote>Get to the main point sooner.</blockquote>
            </Reveal>
          </div>
          <p className="debrief-note">Sample preview — not from a real session.</p>
        </div>
      </section>

      <section className="landing-section landing-cta" data-od-id="landing-cta">
        <Reveal className="landing-cta-inner">
          <p className="eyebrow">Your next rep</p>
          <h2>Start practicing</h2>
          <p className="landing-cta-lead">
            One focused room, one live timer, and a debrief that makes the next
            answer sharper.
          </p>
          <Button data-od-id="cta-start-bottom" onClick={() => onNavigate('/setup')}>
            Open the practice room
          </Button>
        </Reveal>
        <div className="cta-band" aria-hidden="true">
          <SpeechRibbon
            words={RIBBON_WORDS.loop}
            flow="forward"
            intensity={0.45}
            stateLabel="The loop continues"
            variant="loop"
          />
        </div>
      </section>
    </div>
  )
}
