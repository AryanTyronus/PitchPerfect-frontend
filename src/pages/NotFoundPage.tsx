import { Button } from '../components/ui/Button'

interface NotFoundPageProps {
  onNavigate: (path: string) => void
}

export function NotFoundPage({ onNavigate }: NotFoundPageProps) {
  return (
    <section className="not-found" data-od-id="not-found">
      <div className="not-found-mark" aria-hidden="true">
        <svg
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
          viewBox="0 0 24 24"
        >
          <path d="M3 12h2.2l1.6-5 2.6 10 2.2-7 1.6 4H21" />
        </svg>
      </div>
      <p className="eyebrow">404</p>
      <h1>Page not found</h1>
      <p>The practice room you are looking for is not available.</p>
      <Button onClick={() => onNavigate('/')}>Go home</Button>
    </section>
  )
}
