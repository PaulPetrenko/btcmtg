import type { Stats24h } from '../binance/types'
import { formatPrice, formatVolumeBtc, formatVolumeUsdt } from '../format'
import './Stats.css'

/**
 * 24h statistics (FR-03, FR-04): four columns on desktop, 2×2 on phones.
 * Shows "—" until the first statistics arrive; grey while stale (AC-09.4).
 */
export function Stats({ stats, stale }: { stats: Stats24h | null; stale: boolean }) {
  const items = [
    { label: '24h High', value: stats && formatPrice(stats.highPrice) },
    { label: '24h Low', value: stats && formatPrice(stats.lowPrice) },
    { label: '24h vol (BTC)', value: stats && formatVolumeBtc(stats.volume) },
    { label: '24h vol (USDT)', value: stats && formatVolumeUsdt(stats.quoteVolume) },
  ]

  return (
    <dl className={`stats${stale ? ' stats--stale' : ''}`} aria-label="24-hour statistics">
      {items.map((item) => (
        <div key={item.label} className="stats__item">
          <dt className="stats__label">{item.label}</dt>
          <dd className="stats__value">{item.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}
