import { Chart } from './components/Chart'
import { Footer } from './components/Footer'
import { TimeframeSelector } from './components/TimeframeSelector'
import {
  formatPrice,
  formatSignedAmount,
  formatSignedPercent,
  formatTimeUtc,
  formatVolumeBtc,
  formatVolumeUsdt,
} from './format'
import { marketFeed, type Connection, type GroupError, type MarketSnapshot } from './market/feed'
import { useMarket } from './market/useMarket'

/**
 * Temporary neutral page for functional development and data checks.
 * It is not the final visual design.
 *
 * All data comes from the market feed (TD-08): this component only reads the
 * snapshot and sends the timeframe selection back to the feed.
 */
function App() {
  const market = useMarket()
  const { stats, statsGroup, candlesGroup } = market
  const lastUpdate = Math.max(statsGroup.lastUpdate ?? 0, candlesGroup.lastUpdate ?? 0)
  const notice = pageNotice(market)

  return (
    <div className="app">
      <main>
        <h1 className="app__title">BTC/USDT, Binance Spot</h1>

        {/* One global status indicator (FR-08, OQ-09). Draft wording. */}
        <p className="app__status">
          Status: <span role="status">{CONNECTION_LABELS[market.connection]}</span>
          {lastUpdate > 0 && ` · Last update ${formatTimeUtc(lastUpdate)} UTC`}
        </p>

        {notice && (
          <p className="app__notice" role="alert">
            {notice}
          </p>
        )}

        <section aria-label="24-hour statistics">
          {!stats && statsGroup.status === 'loading' && <p>Loading market data…</p>}
          {!stats && statsGroup.status === 'error' && !notice && (
            <p className="app__message">{GROUP_MESSAGES['E-06']}</p>
          )}

          {stats && (
            <>
              <dl className="app__stats">
                <Stat label="Price" value={`${formatPrice(stats.lastPrice)} USDT`} />
                <Stat
                  label="24h change"
                  value={`${formatSignedAmount(stats.priceChange)} USDT (${formatSignedPercent(stats.priceChangePercent)})`}
                />
                <Stat label="24h high" value={`${formatPrice(stats.highPrice)} USDT`} />
                <Stat label="24h low" value={`${formatPrice(stats.lowPrice)} USDT`} />
                <Stat label="24h volume" value={`${formatVolumeBtc(stats.volume)} BTC`} />
                <Stat label="24h volume" value={`${formatVolumeUsdt(stats.quoteVolume)} USDT`} />
              </dl>
              <p className="app__message app__stats-status">
                {statsGroup.stale && STALE_MESSAGE}
                {statsGroup.error && ` ${GROUP_MESSAGES[statsGroup.error]}`}
              </p>
            </>
          )}
        </section>

        <section className="app__chart" aria-label="Chart">
          <TimeframeSelector value={market.timeframe} onChange={(tf) => marketFeed.setTimeframe(tf)} />

          <p className="app__message app__chart-status">
            {candlesGroup.status === 'loading' && candlesGroup.count === 0 && `Loading ${candlesGroup.timeframe} candles…`}
            {candlesGroup.count > 0 &&
              `${candlesGroup.timeframe}: ${candlesGroup.count} candles. Times are in UTC. Volume is in BTC.`}
            {candlesGroup.stale && ` ${STALE_MESSAGE}`}
            {candlesGroup.error && ` ${GROUP_MESSAGES[candlesGroup.error]}`}
          </p>

          <Chart />
        </section>
      </main>

      <Footer />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="app__stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

/* Draft wording from MVP §6 and §8.2. Final copy is the project owner's decision. */

const CONNECTION_LABELS: Record<Connection, string> = {
  connecting: 'Connecting', // ST-01
  live: 'Live', // ST-02
  reconnecting: 'Reconnecting', // ST-03
  offline: 'Offline', // ST-04
  unavailable: 'Unavailable', // ST-05
}

const STALE_MESSAGE = '[stale] No update for more than 10 seconds.'

const GROUP_MESSAGES: Record<GroupError, string> = {
  'E-05': "Some data couldn't be displayed.",
  'E-06': "This section's data couldn't be loaded. Retrying automatically.",
}

/** The page-level notice, if any (MVP §8.2). Offline comes first. */
function pageNotice(market: MarketSnapshot): string | null {
  if (market.connection === 'offline') {
    return "You're offline. Data resumes when your connection returns." // E-02
  }
  if (market.restProblem === 'E-01') {
    return 'Market data is unavailable in your region because Binance restricts access in some locations.'
  }
  if (market.restProblem === 'E-04') {
    return 'Binance is temporarily limiting requests. Data resumes shortly.'
  }
  if (market.connection === 'unavailable') {
    // E-03
    return "Binance market data can't be reached right now. This may be temporary, or access may be restricted in your region. Retrying automatically."
  }
  return null
}

export default App
