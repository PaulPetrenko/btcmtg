import { useEffect, useRef } from 'react'
import { CandlestickSeries, createChart, HistogramSeries } from 'lightweight-charts'
import { TIMEFRAME_MS } from '../config'
import { LOCALE } from '../format'
import { toCandlePoint, toChartData, toVolumePoint } from '../market/candles'
import { marketFeed } from '../market/feed'
import './Chart.css'

/**
 * Candlestick chart with volume (FR-05), drawn with Lightweight Charts.
 *
 * The chart is created once. It listens to the market feed's candle events,
 * which map directly to the library (TECHNICAL_SPEC §7, §9):
 * - 'reset'  → setData: replace everything (first load, timeframe change, reload)
 * - 'update' → update: change the current candle, or add the next one
 * Candle data doesn't go through React state, so React doesn't re-render
 * every 2 seconds for the chart.
 */
export function Chart() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const chart = createChart(container, {
      // Follow the container's size (TECHNICAL_SPEC §9).
      autoSize: true,
      timeScale: { timeVisible: true, secondsVisible: false },
      // Same locale as the rest of the page (format.ts, OQ-15). Without it the
      // library uses the browser's language for month names on the time axis.
      localization: { locale: LOCALE },
    })

    // Candles in the main pane, volume (BTC) in a second pane below,
    // sharing the same time axis (FR-05). The library's default colours are used:
    // the visual design comes later from the project owner.
    const candleSeries = chart.addSeries(CandlestickSeries)
    const volumeSeries = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' } }, 1)
    chart.panes()[0].setStretchFactor(3)
    chart.panes()[1].setStretchFactor(1)

    const stopListening = marketFeed.onCandles((event) => {
      if (event.type === 'reset') {
        const data = toChartData([...event.candles], TIMEFRAME_MS[event.timeframe])
        candleSeries.setData(data.candles)
        volumeSeries.setData(data.volumes)
        // Daily candles have no time of day to show.
        chart.timeScale().applyOptions({ timeVisible: event.timeframe !== '1d' })
      } else {
        // The feed only sends the current candle or the next one, which is
        // exactly what update() accepts.
        candleSeries.update(toCandlePoint(event.candle))
        volumeSeries.update(toVolumePoint(event.candle))
      }
    })

    // Unmount: stop listening, then remove the chart. Removing the chart also
    // stops its resize observer and event listeners.
    return () => {
      stopListening()
      chart.remove()
    }
  }, [])

  return <div ref={containerRef} className="chart" />
}
