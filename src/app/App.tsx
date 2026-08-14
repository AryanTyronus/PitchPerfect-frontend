import { AppShell } from '../components/layout/AppShell'
import { ThemeProvider } from '../components/theme/ThemeProvider'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { InterviewRoomPage } from '../pages/InterviewRoomPage'
import { LandingPage } from '../pages/LandingPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { PracticeSetupPage } from '../pages/PracticeSetupPage'
import { ProcessingPage } from '../pages/ProcessingPage'
import { ResultsPage } from '../pages/ResultsPage'
import { useAppRouter } from './router'

export default function App() {
  const { direction, key, navigate, route } = useAppRouter()
  const reduced = useReducedMotion()

  let page

  switch (route.name) {
    case 'landing':
      page = <LandingPage onNavigate={navigate} />
      break
    case 'setup':
      page = <PracticeSetupPage onNavigate={navigate} />
      break
    case 'interview':
      page = <InterviewRoomPage onNavigate={navigate} sessionId={route.sessionId} />
      break
    case 'processing':
      page = <ProcessingPage onNavigate={navigate} sessionId={route.sessionId} />
      break
    case 'results':
      page = <ResultsPage onNavigate={navigate} sessionId={route.sessionId} />
      break
    default:
      page = <NotFoundPage onNavigate={navigate} />
  }

  const frameClass = reduced
    ? 'page-frame'
    : direction === 'back'
      ? 'page-frame is-back'
      : 'page-frame'

  return (
    <ThemeProvider>
      <AppShell onNavigate={navigate}>
        <div className={frameClass} data-od-id="page-frame" key={key}>
          {page}
        </div>
      </AppShell>
    </ThemeProvider>
  )
}