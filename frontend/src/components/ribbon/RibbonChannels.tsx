import type { CSSProperties } from 'react'
import { RIBBON_WORDS } from './ribbonPresets'
import { SpeechRibbon } from './SpeechRibbon'
import type { EvaluationMetric } from '../../types/evaluation'

interface RibbonChannelsProps {
  metrics: EvaluationMetric[]
  animate?: boolean
}

/**
 * The signature results moment: the SPEECH stream arrives and splits into the
 * five analysed channels. The ribbon above is decorative; each channel below
 * carries its own readable label, score, and progress semantics.
 */
export function RibbonChannels({ metrics, animate = true }: RibbonChannelsProps) {
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
        {metrics.map((metric, index) => {
          const clamped = Math.min(Math.max(metric.score, 0), 100)
          const style = {
            width: `${clamped}%`,
            '--channel-width': `${clamped}%`,
            ...(animate ? {} : { animation: 'none' }),
            ...(animate ? { transitionDelay: `${140 + index * 70}ms` } : {}),
          } as CSSProperties

          return (
            <li
              className="channel-row"
              data-od-id={`channel-${metric.label.toLowerCase()}`}
              key={metric.label}
            >
              <span className="channel-node" aria-hidden="true" />
              <span className="channel-label">{metric.label}</span>
              <div
                aria-label={`${metric.label} progress`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={clamped}
                className="channel-track"
                role="progressbar"
              >
                <span style={style} />
              </div>
              <strong className="channel-score">{clamped}</strong>
            </li>
          )
        })}
      </ol>
    </div>
  )
}