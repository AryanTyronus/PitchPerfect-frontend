import { Button } from '../components/ui/Button'

interface NotFoundPageProps {
  onNavigate: (path: string) => void
}

export function NotFoundPage({ onNavigate }: NotFoundPageProps) {
  return (
    <section className="not-found">
      <h1>Page not found</h1>
      <p>The practice room you are looking for is not available.</p>
      <Button onClick={() => onNavigate('/')}>Go home</Button>
    </section>
  )
}
