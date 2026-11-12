import { formatTimeUtc } from '../format'
import type { Connection, MarketSnapshot } from '../market/feed'
import { Led, type LedColor } from './Led'
import { Stale } from './Stale'
import './StatusBar.css'

/*
 * The one global status indicator (FR-08, OQ-09), grouped with the chart's
 * context (timeframe, UTC, volume unit) and the chart's stale mark (AC-09.2).
 * Draft wording from MVP §6. Final copy is the project owner's decision.
 */

const CONNECTION_LABELS: Record<Connection, string> = {
  connecting: 'Connecting', // ST-01
  live: 'Live', // ST-02
  reconnecting: 'Reconnecting', // ST-03
  offline: 'Offline', // ST-04
  unavailable: 'Unavailable', // ST-05
}

const CONNECTION_LEDS: Record<Connection, LedColor> = {
  connecting: 'amber',
  live: 'green',
  reconnecting: 'amber',
  offline: 'off',
  unavailable: 'red',
}

export function StatusBar({ market }: { market: MarketSnapshot }) {
  const { connection, statsGroup, candlesGroup } = market
  const lastUpdate = Math.max(statsGroup.lastUpdate ?? 0, candlesGroup.lastUpdate ?? 0)

  let detail: string | null = null
  if (connection === 'live' && lastUpdate > 0) detail = `Updated ${formatTimeUtc(lastUpdate)} UTC`
  else if (connection === 'connecting' && lastUpdate === 0) detail = 'Loading market data'
  else if (lastUpdate > 0) detail = `Last update ${formatTimeUtc(lastUpdate)} UTC`

  return (
    <div className="status-bar">
      <span className="status-bar__connection">
        <Led color={CONNECTION_LEDS[connection]} />
        <span className="status-bar__label" role="status">
          {CONNECTION_LABELS[connection]}
        </span>
        {detail && <span>{detail}</span>}
      </span>
      <span className="status-bar__context">
        <span className="status-bar__part">{candlesGroup.timeframe} · UTC</span>
        <span className="status-bar__part">Vol · BTC</span>
        {candlesGroup.stale && (
          <span className="status-bar__part">
            <Stale since={candlesGroup.lastUpdate} />
          </span>
        )}
      </span>
    </div>
  )
}
