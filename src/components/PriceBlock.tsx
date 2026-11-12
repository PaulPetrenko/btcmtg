import type { Stats24h } from '../binance/types'
import { formatPrice, formatSignedAmount, formatSignedPercent } from '../format'
import type { GroupState } from '../market/feed'
import { Stale } from './Stale'
import './PriceBlock.css'

interface PriceBlockProps {
  stats: Stats24h | null
  group: GroupState
}

/**
 * Market identity, current price and 24h change (FR-01, FR-02).
 * Shows "—" until the first statistics arrive. While the statistics are
 * stale, the values turn grey and a stale mark appears (AC-09.2, AC-09.4).
 */
export function PriceBlock({ stats, group }: PriceBlockProps) {
  const stale = group.stale
  const change = stats?.priceChange ?? 0
  const direction = !stats || stale || change === 0 ? 'flat' : change > 0 ? 'up' : 'down'
  const staleMark = (where: 'top' | 'inline') =>
    stale && (
      <span className={`price-block__stale price-block__stale--${where}`}>
        <Stale since={group.lastUpdate} />
      </span>
    )

  return (
    <section className={`price-block${stale ? ' price-block--stale' : ''}`} aria-label="Price">
      <div className="price-block__identity">
        <div>
          <h1 className="price-block__pair">BTC / USDT</h1>
          <p className="price-block__market">Binance Spot</p>
        </div>
        {staleMark('top')}
      </div>

      <p className="price-block__price">{stats ? formatPrice(stats.lastPrice) : '—'}</p>

      <p className="price-block__change">
        <span className="price-block__change-amount">
          {stats ? `${formatSignedAmount(stats.priceChange)} USDT` : '—'}
        </span>
        <span className={`price-block__change-percent price-block__change-percent--${direction}`}>
          [{stats ? formatSignedPercent(stats.priceChangePercent) : '—'}]
        </span>
        {staleMark('inline')}
      </p>
    </section>
  )
}
