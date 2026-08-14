import { useEffect, useRef, useState } from 'react'
import { Reveal } from '../components/motion/Reveal'
import { RIBBON_WORDS } from '../components/ribbon/ribbonPresets'
import { SpeechRibbon } from '../components/ribbon/SpeechRibbon'
import { Button } from '../components/ui/Button'

interface LandingPageProps {
  onNavigate: (path: string) => void
}

const benefits = [
  {
    title: 'A real room, not a quiz',
    copy: 'Face a single question at a time with a live timer and a camera stage that mirrors the pressure of the real moment.',
  },
  {
    title: 'Feedback that reads like a coach',
    copy: 'After each answer you get a debrief on clarity, confidence, structure, conciseness, and delivery — tied to what you actually said.',
  },
  {
    title: 'Repeat until it lands',
    copy: 'The next practice is always suggested from your last session, so each run sharpens a specific part of how you speak.',
  },
]

function scrollToBenefits() {
  const section = document.getElementById('how-it-works')
  if (!section) {
    return
  }
  const top = section.getBoundingClientRect().top + window.scrollY - 90
  window.scrollTo({ top, behavior: 'smooth' })
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
                <Button variant="secondary" onClick={scrollToBenefits}>
                  How it works
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section
        className="benefits-section"
        data-od-id="how-it-works"
        id="how-it-works"
      >
        <div className="benefits-head">
          <Reveal as="h2">Practice the way the real thing feels.</Reveal>
          <Reveal as="p" delay={80}>
            A guided room, an honest debrief, and a path to the next session —
            the same stream runs through all of it.
          </Reveal>
        </div>
        {benefits.map((benefit, index) => (
          <Reveal
            as="article"
            className="benefit-item"
            data-od-id={`benefit-${index + 1}`}
            delay={index * 80}
            key={benefit.title}
          >
            <span className="benefit-index">0{index + 1}</span>
            <div className="benefit-copy">
              <h3>{benefit.title}</h3>
              <p>{benefit.copy}</p>
            </div>
          </Reveal>
        ))}
      </section>
    </div>
  )
}