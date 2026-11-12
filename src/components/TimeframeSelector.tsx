import { TIMEFRAMES, type Timeframe } from '../config'
import './TimeframeSelector.css'

interface TimeframeSelectorProps {
  value: Timeframe
  onChange: (timeframe: Timeframe) => void
}

/**
 * The six timeframe buttons (FR-06, IR-01). Exactly one is active.
 * Native buttons work with mouse, touch and keyboard; aria-pressed tells
 * assistive technology which one is active.
 */
export function TimeframeSelector({ value, onChange }: TimeframeSelectorProps) {
  return (
    <div className="timeframe-selector" role="group" aria-label="Timeframe">
      {TIMEFRAMES.map((timeframe) => (
        <button
          key={timeframe}
          type="button"
          className="timeframe-selector__button"
          aria-pressed={timeframe === value}
          onClick={() => onChange(timeframe)}
        >
          {timeframe}
        </button>
      ))}
    </div>
  )
}
