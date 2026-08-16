export type RibbonFlow = 'forward' | 'reverse' | 'still'
export type RibbonVariant = 'hero' | 'stream' | 'analysis' | 'loop'

export interface RibbonWord {
  text: string
  weight: number
}

/**
 * Shared vocabulary for the Speech Ribbon. The same words recur across the
 * product loop (SPEECH → FLOW → ANALYSIS → FEEDBACK → IMPROVEMENT) so the
 * experience reads as one continuous stream rather than five pages.
 *
 * Weights drive prominence: heavy words float to the foreground (larger,
 * more opaque), light words recede into the background.
 */
export const RIBBON_WORDS = {
  hero: [
    { text: 'clarity', weight: 1 },
    { text: 'confidence', weight: 0.95 },
    { text: 'presence', weight: 0.85 },
    { text: 'delivery', weight: 0.9 },
    { text: 'structure', weight: 0.75 },
    { text: 'persuade', weight: 0.7 },
    { text: 'concise', weight: 0.6 },
    { text: 'connect', weight: 0.55 },
    { text: 'answer', weight: 0.5 },
    { text: 'communicate', weight: 0.5 },
    { text: 'poise', weight: 0.4 },
    { text: 'flow', weight: 0.4 },
    { text: 'tone', weight: 0.35 },
    { text: 'voice', weight: 0.3 },
  ] satisfies RibbonWord[],

  /** A moment of spoken language — what the ribbon becomes while answering. */
  speech: [
    { text: 'my point is', weight: 0.7 },
    { text: 'in other words', weight: 0.55 },
    { text: 'what that means is', weight: 0.5 },
    { text: 'to be clear', weight: 0.6 },
    { text: 'let me explain', weight: 0.5 },
    { text: 'first of all', weight: 0.45 },
    { text: 'in practice', weight: 0.4 },
    { text: 'allow me to show you', weight: 0.4 },
    { text: 'the short answer', weight: 0.55 },
    { text: 'here is the key part', weight: 0.45 },
    { text: 'so the takeaway', weight: 0.35 },
    { text: 'in other terms', weight: 0.35 },
    { text: 'right now', weight: 0.3 },
    { text: 'for example', weight: 0.3 },
  ] satisfies RibbonWord[],

  /** Results — the stream resolving into the analysed signals. */
  analysis: [
    { text: 'clarity', weight: 1 },
    { text: 'confidence', weight: 0.9 },
    { text: 'delivery', weight: 0.85 },
    { text: 'structure', weight: 0.8 },
    { text: 'conciseness', weight: 0.7 },
    { text: 'speech', weight: 0.5 },
    { text: 'analysis', weight: 0.5 },
    { text: 'cadence', weight: 0.4 },
    { text: 'emphasis', weight: 0.35 },
    { text: 'pacing', weight: 0.35 },
    { text: 'proof', weight: 0.3 },
    { text: 'focus', weight: 0.3 },
  ] satisfies RibbonWord[],

  /** The loop keeps going forward — practice, speak, analyse, repeat. */
  loop: [
    { text: 'practice', weight: 0.8 },
    { text: 'speak', weight: 0.85 },
    { text: 'analyse', weight: 0.7 },
    { text: 'feedback', weight: 0.7 },
    { text: 'your next rep', weight: 0.65 },
    { text: 'keep going', weight: 0.5 },
    { text: 'one more', weight: 0.45 },
    { text: 'repeat', weight: 0.4 },
    { text: 'sharpen', weight: 0.35 },
    { text: 'grow', weight: 0.3 },
  ] satisfies RibbonWord[],
} as const