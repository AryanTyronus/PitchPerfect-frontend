import type { Difficulty, PracticeCategory } from '../types/session'

export const MAX_TIMED_SECONDS = 120
export const WARNING_SECONDS = 10

export const questionBanks: Record<
  PracticeCategory,
  Record<Difficulty, string[]>
> = {
  'job-interview': {
    beginner: [
      'Tell me about yourself and the kind of role you are looking for.',
      'Why are you interested in this position?',
      'Describe one strength you would bring to this team.',
      'Tell me about a recent project you enjoyed working on.',
      'What motivates you at work?',
    ],
    intermediate: [
      'Tell me about a time you solved a difficult problem at work.',
      'Describe a situation where you had to influence a teammate.',
      'How do you prioritize when several deadlines compete?',
      'Tell me about feedback you received and how you used it.',
      'What would you do in your first 30 days in this role?',
    ],
    advanced: [
      'Describe a decision you made with incomplete information.',
      'Tell me about a time you changed a team process and measured the outcome.',
      'How would you align senior stakeholders who disagree on priorities?',
      'Describe a failure that changed how you lead or collaborate.',
      'What tradeoffs would you consider before scaling a successful pilot?',
    ],
  },
  'technical-interview': {
    beginner: [
      'Explain a technical concept you recently learned in simple terms.',
      'Walk me through how you debug a small bug.',
      'What is the difference between frontend and backend development?',
      'Describe a project where you used an API.',
      'How do you check that your code works?',
    ],
    intermediate: [
      'Walk me through a technical decision you made and the tradeoffs you considered.',
      'How would you design a reliable upload flow for recorded media?',
      'Describe how you would investigate a slow page load.',
      'Explain how you handle errors from an external service.',
      'How do you decide what belongs in client state versus server state?',
    ],
    advanced: [
      'Design a session synchronization system for a timed interview product.',
      'How would you prevent duplicate processing jobs in a distributed system?',
      'Describe a strategy for resilient polling with eventual consistency.',
      'Explain how you would evolve an API contract without breaking clients.',
      'How would you model state transitions for an interview workflow?',
    ],
  },
  'behavioral-interview': {
    beginner: [
      'Tell me about a challenge you overcame.',
      'Describe a time you helped someone on a team.',
      'Tell me about a goal you set and completed.',
      'How do you respond when plans change?',
      'Tell me about a time you learned from a mistake.',
    ],
    intermediate: [
      'Tell me about a conflict you handled professionally.',
      'Describe a time you had to adapt quickly.',
      'Tell me about a project where your communication mattered.',
      'Describe a time you took ownership without being asked.',
      'Tell me about a moment when you had to build trust.',
    ],
    advanced: [
      'Tell me about a time you led through ambiguity.',
      'Describe a high-stakes disagreement and how you resolved it.',
      'Tell me about a time your first approach failed and what you changed.',
      'Describe how you handled competing expectations from different groups.',
      'Tell me about a decision that required courage and careful communication.',
    ],
  },
  'public-speaking': {
    beginner: [
      'Give a one-minute introduction to a topic you enjoy.',
      'Explain why a hobby or interest matters to you.',
      'Open a short talk for a community event.',
      'Introduce yourself to a new audience.',
      'Explain a simple idea that more people should understand.',
    ],
    intermediate: [
      'Present a short opening for a talk about a topic you care about.',
      'Persuade an audience to adopt one useful habit.',
      'Explain a complex issue to a general audience.',
      'Give a brief product pitch for an idea you believe in.',
      'Tell a story that supports a clear message.',
    ],
    advanced: [
      'Deliver the opening two minutes of a keynote about responsible innovation.',
      'Persuade skeptical leaders to support a difficult change.',
      'Frame a crisis update for a broad audience.',
      'Make a concise argument for funding a new initiative.',
      'Explain a nuanced social issue without oversimplifying it.',
    ],
  },
  'college-interview': {
    beginner: [
      'Why are you interested in this college or university?',
      'Tell me about a class or subject that excites you.',
      'Describe an extracurricular activity that shaped you.',
      'What do you hope to learn in college?',
      'Tell me about a teacher or mentor who influenced you.',
    ],
    intermediate: [
      'Why is this program or university a strong fit for your goals?',
      'Describe a time you contributed to your school community.',
      'Tell me about an academic challenge and how you handled it.',
      'How would you add to the campus community?',
      'Describe a project that reflects your curiosity.',
    ],
    advanced: [
      'Connect your academic interests to a specific opportunity at this university.',
      'Tell me about a belief or perspective that has evolved over time.',
      'Describe how you would pursue independent research or creative work.',
      'How would you contribute to a rigorous discussion with peers?',
      'Tell me about a problem you want to study deeply and why.',
    ],
  },
}