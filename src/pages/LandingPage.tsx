import { Button } from '../components/ui/Button'

interface LandingPageProps {
  onNavigate: (path: string) => void
}

const benefits = [
  {
    title: 'Realistic Practice',
    copy: 'Rehearse interviews, presentations, and high-stakes answers in a focused practice room.',
  },
  {
    title: 'AI Communication Feedback',
    copy: 'Review clarity, confidence, structure, conciseness, and delivery after each response.',
  },
  {
    title: 'Track Your Progress',
    copy: 'Build repeatable habits for sharper answers and calmer delivery over time.',
  },
]

export function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="landing-page">
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">AI communication coach</p>
          <h1>PitchPerfect</h1>
          <p className="hero-line">Speak with confidence. Interview with clarity.</p>
          <p className="hero-support">
            Practice interviews and public speaking in a guided room, then receive
            AI-powered feedback designed to make your next answer clearer,
            sharper, and easier to trust.
          </p>
          <div className="hero-actions">
            <Button onClick={() => onNavigate('/setup')}>Start Practicing</Button>
            <Button
              onClick={() =>
                document
                  .getElementById('how-it-works')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
              variant="secondary"
            >
              How It Works
            </Button>
          </div>
        </div>
        <div className="hero-product" aria-label="PitchPerfect interview preview">
          <div className="product-topbar">
            <span />
            <span />
            <span />
          </div>
          <div className="product-question">
            <small>Question 2 / 5</small>
            <strong>Tell me about a challenge you overcame.</strong>
          </div>
          <div className="product-camera">
            <div className="avatar-frame">Ready</div>
          </div>
          <div className="product-footer">
            <span className="live-dot" />
            <span>Communication score preview</span>
            <strong>84</strong>
          </div>
        </div>
      </section>

      <section className="benefit-band" id="how-it-works">
        {benefits.map((benefit) => (
          <article className="benefit-item" key={benefit.title}>
            <h2>{benefit.title}</h2>
            <p>{benefit.copy}</p>
          </article>
        ))}
      </section>
    </div>
  )
}
