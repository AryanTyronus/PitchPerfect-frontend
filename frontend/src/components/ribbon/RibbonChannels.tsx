import type { CSSProperties } from 'react'
import { RIBBON_WORDS } from './ribbonPresets'
import { SpeechRibbon } from './SpeechRibbon'
import type { SubScores } from '../../types/evaluation'

interface RibbonChannelsProps {
  subScores: SubScores
  eyeContactPercentage?: number | null
  animate?: boolean
}

interface ChannelEntry {
  key: string
  label: string
  score: number
  max: number
}

const SUB_CHANNELS: Array<{ key: keyof SubScores; label: string }> = [
  { key: 'clarity', label: 'Clarity' },
  { key: 'relevance', label: 'Relevance' },
  { key: 'professionalism', label: 'Professionalism' },
  { key: 'structure', label: 'Structure' },
  { key: 'impact', label: 'Impact' },
]

/**
 * The signature results moment: the SPEECH stream arrives and splits into the
 * analysed channels. The ribbon above is decorative; each channel below
 * carries its own readable label, score, and progress semantics.
 */
export function RibbonChannels({
  subScores,
  eyeContactPercentage = null,
  animate = true,
}: RibbonChannelsProps) {
  const entries: ChannelEntry[] = SUB_CHANNELS.map(({ key, label }) => ({
    key,
    label,
    score: clampChannel(subScores[key], 20),
    max: 20,
  }))
  if (eyeContactPercentage !== null && Number.isFinite(eyeContactPercentage)) {
    entries.push({
      key: 'eye-contact',
      label: 'Eye Contact',
      score: clampChannel(eyeContactPercentage, 100),
      max: 100,
    })
  }

  return (
    <div className="speech-channels" data-od-id="speech-channels">
      <div className="channels-ribbon" aria-hidden="true">
        <SpeechRibbon
          words={RIBBON_WORDS.analysis}
          flow="forward"
          intensity={0.5}
          variant="analysis"
        />
      </div>

      <div className="channels-source">
        <span className="channels-source-word">SPEECH</span>
        <span className="channels-source-line" aria-hidden="true" />
      </div>

      <ol className="channels-list">
        {entries.map((entry, index) => {
          const percent = Math.round((entry.score / entry.max) * 100)
          const style = {
            width: `${percent}%`,
            '--channel-width': `${percent}%`,
            ...(animate ? {} : { animation: 'none' }),
            ...(animate ? { transitionDelay: `${140 + index * 70}ms` } : {}),
          } as CSSProperties

          const toneClass =
            entry.key === 'eye-contact'
              ? percent > 70
                ? ' channel-row--good'
                : percent >= 40
                  ? ' channel-row--moderate'
                  : ' channel-row--needs-work'
              : ''

          return (
            <li
              className={`channel-row${toneClass}`}
              data-od-id={`channel-${entry.key}`}
              key={entry.key}
            >
              <span className="channel-node" aria-hidden="true" />
              <span className="channel-label">{entry.label}</span>
              <div
                aria-label={`${entry.label} progress`}
                aria-valuemax={entry.max}
                aria-valuemin={0}
                aria-valuenow={entry.score}
                className="channel-track"
                role="progressbar"
              >
                <span style={style} />
              </div>
              <strong className="channel-score">
                {entry.score}
                <span className="channel-max">/{entry.max}</span>
              </strong>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function clampChannel(value: number, max: number): number {
  return Math.min(Math.max(Math.round(value), 0), max)
}
