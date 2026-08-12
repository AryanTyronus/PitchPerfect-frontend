import { AppShell } from '../components/layout/AppShell'
import { InterviewRoomPage } from '../pages/InterviewRoomPage'
import { LandingPage } from '../pages/LandingPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { PracticeSetupPage } from '../pages/PracticeSetupPage'
import { ProcessingPage } from '../pages/ProcessingPage'
import { ResultsPage } from '../pages/ResultsPage'
import { useAppRouter } from './router'

export default function App() {
  const { navigate, route } = useAppRouter()

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

  return <AppShell onNavigate={navigate}>{page}</AppShell>
}
