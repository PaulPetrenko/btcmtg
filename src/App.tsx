import { Chart } from './components/Chart'
import { Footer } from './components/Footer'
import { Notice } from './components/Notice'
import { PriceBlock } from './components/PriceBlock'
import { Stats } from './components/Stats'
import { StatusBar } from './components/StatusBar'
import { TimeframeSelector } from './components/TimeframeSelector'
import { marketFeed } from './market/feed'
import { useMarket } from './market/useMarket'

/**
 * The dashboard, following the approved Instrument design (Frame 47).
 *
 * All data comes from the market feed (TD-08): this component only reads the
 * snapshot, passes it to the components, and sends the timeframe selection
 * back to the feed.
 */
function App() {
  const market = useMarket()
  const { candlesGroup } = market
  const loadingCandles = candlesGroup.status === 'loading' && candlesGroup.count === 0

  return (
    <div className="app">
      <main className="dashboard">
        <header className="dashboard__header">
          <PriceBlock stats={market.stats} group={market.statsGroup} />
          <div className="dashboard__controls">
            <Stats stats={market.stats} stale={market.statsGroup.stale} />
            <TimeframeSelector value={market.timeframe} onChange={(tf) => marketFeed.setTimeframe(tf)} />
            <StatusBar market={market} />
          </div>
        </header>

        {/* Reserved space: notices appear here without moving anything. */}
        <div className="dashboard__notices">
          <Notice market={market} />
        </div>

        <section className="dashboard__chart" aria-label="Chart">
          <Chart stale={candlesGroup.stale} />
          {loadingCandles && <p className="dashboard__chart-message">Loading {candlesGroup.timeframe} candles…</p>}
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default App
