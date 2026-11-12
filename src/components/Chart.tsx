import { useEffect, useRef } from 'react'
import {
  CandlestickSeries,
  createChart,
  HistogramSeries,
  TickMarkType,
  type HistogramData,
  type Time,
  type WhitespaceData,
} from 'lightweight-charts'
import { LastPriceTag, PriceBands } from '../chartPrimitives'
import { onChartLookChange, readChartTheme, type ChartTheme } from '../chartTheme'
import { TIMEFRAME_MS } from '../config'
import { formatDateUtc, formatPrice, formatTimeUtcShort, formatVolumeBtc, LOCALE } from '../format'
import type { Candle } from '../binance/types'
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
 *
 * `stale`: candle data is stale (AC-09.2). Candles and volume are dimmed;
 * axes, grid and tag keep full strength (D10). Nothing changes size.
 */
export function Chart({ stale }: { stale: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const staleRef = useRef(stale)
  /** Re-reads colours and sizes and applies them; set while the chart exists. */
  const refreshLookRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Daily candles have no time of day, so their labels show the date only.
    let daily = false
    let look: ChartTheme = readChartTheme(container, staleRef.current)

    const chart = createChart(container, {
      ...look.chart,
      // Follow the container's size (TECHNICAL_SPEC §9).
      autoSize: true,
      timeScale: {
        ...look.chart.timeScale,
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 12, // about 10 px candle bodies, as in Frame 47; zooming still works
        // Time axis labels, in the page's format (format.ts): "17:00" for a
        // time of day, "2026-11-12" where a new day, month or year starts.
        tickMarkFormatter: (time: Time, type: TickMarkType) => {
          const ms = toMs(time)
          if (ms === null) return null
          return type === TickMarkType.Time || type === TickMarkType.TimeWithSeconds
            ? formatTimeUtcShort(ms)
            : formatDateUtc(ms)
        },
        tickMarkMaxCharacterLength: 10, // "2026-11-12", so labels are spaced for their real width
      },
      localization: {
        // Only used for text the formatters below don't cover.
        locale: LOCALE,
        // Crosshair label on the time axis: "2026-11-12 17:00", or "2026-11-12" for 1d.
        timeFormatter: (time: Time) => {
          const ms = toMs(time)
          if (ms === null) return ''
          return daily ? formatDateUtc(ms) : `${formatDateUtc(ms)} ${formatTimeUtcShort(ms)}`
        },
      },
    })

    // Candles in the main pane, volume (BTC) in a second pane below, sharing
    // the same time axis (FR-05). Each series formats its labels with the
    // page's formatters. The library's dotted price line and last-value labels
    // are off: the design has none.
    const candleSeries = chart.addSeries(CandlestickSeries, {
      ...look.candles,
      priceFormat: { type: 'custom', formatter: formatPrice, minMove: 0.01 },
      lastValueVisible: false,
      priceLineVisible: false,
    })
    const volumeSeries = chart.addSeries(
      HistogramSeries,
      {
        priceFormat: { type: 'custom', formatter: formatVolumeBtc, minMove: 0.01 },
        lastValueVisible: false,
        priceLineVisible: false,
      },
      1,
    )

    // Frame 47 proportions: 280 px candles, 9 px gap, 72 px volume (about 4 : 1).
    // The gap is the bottom margin of the candle pane.
    chart.panes()[0].setStretchFactor(4)
    chart.panes()[1].setStretchFactor(1)
    candleSeries.priceScale().applyOptions({ scaleMargins: { top: 0.06, bottom: 0.09 } })
    // The volume pane has no axis labels in the design. Its scale stays
    // "visible" with transparent text: a hidden scale collapses the pane.
    volumeSeries.priceScale().applyOptions({ textColor: 'transparent', scaleMargins: { top: 0.04, bottom: 0 } })

    // Last-price tag in the price axis (drawn by the chart itself, so it
    // follows every update, scroll, zoom and resize).
    const tag = new LastPriceTag(look)
    candleSeries.attachPrimitive(tag)
    // Three background bands in the candle pane (D9 option A).
    const bands = new PriceBands(look.band)
    chart.panes()[0].attachPrimitive(bands)

    // A volume bar has the colour of its candle: rising when close >= open.
    const volumeColor = (candle: { open: number; close: number }) =>
      candle.close >= candle.open ? look.volumeUp : look.volumeDown

    // Recolours the existing volume bars (theme or stale change) without
    // reloading anything. Bars are matched to candles by time.
    const recolourVolumes = () => {
      const candles = new Map<Time, { open: number; close: number }>()
      for (const point of candleSeries.data()) {
        if ('open' in point) candles.set(point.time, point)
      }
      volumeSeries.setData(
        volumeSeries.data().map((point): HistogramData<Time> | WhitespaceData<Time> => {
          const candle = candles.get(point.time)
          return 'value' in point && candle
            ? { time: point.time, value: point.value, color: volumeColor(candle) }
            : { time: point.time }
        }),
      )
    }

    const stopListening = marketFeed.onCandles((event) => {
      if (event.type === 'reset') {
        const data = toChartData([...event.candles], TIMEFRAME_MS[event.timeframe])
        candleSeries.setData(data.candles)
        volumeSeries.setData(
          data.volumes.map((point, index) => {
            const candle = data.candles[index]
            return 'value' in point && 'open' in candle ? { ...point, color: volumeColor(candle) } : point
          }),
        )
        tag.setPrice(event.candles.at(-1)?.close ?? null)
        // Daily candles have no time of day to show.
        daily = event.timeframe === '1d'
        chart.timeScale().applyOptions({ timeVisible: !daily })
      } else {
        // The feed only sends the current candle or the next one, which is
        // exactly what update() accepts. Either way it is the last candle.
        candleSeries.update(toCandlePoint(event.candle))
        volumeSeries.update(coloredVolumePoint(event.candle, volumeColor))
        tag.setPrice(event.candle.close)
      }
    })

    // Theme switch, layout breakpoint or stale change: re-read and re-apply.
    // The data stays as it is, so nothing is reloaded from Binance.
    const refreshLook = () => {
      look = readChartTheme(container, staleRef.current)
      chart.applyOptions(look.chart)
      candleSeries.applyOptions(look.candles)
      recolourVolumes()
      tag.setLook(look)
      bands.setColor(look.band)
    }
    refreshLookRef.current = refreshLook
    const stopLookListening = onChartLookChange(refreshLook)

    // Development-only test aid (D12): read access to the chart for the
    // Stage 4 checks. `import.meta.env.DEV` is false in production builds,
    // so this block and its name are removed from them entirely.
    if (import.meta.env.DEV) {
      Object.assign(window, { __btcmtgChart: { chart, candleSeries, volumeSeries, tag } })
    }

    // Unmount: stop listening, then remove the chart. Removing the chart also
    // stops its resize observer and event listeners.
    return () => {
      if (import.meta.env.DEV) Reflect.deleteProperty(window, '__btcmtgChart')
      refreshLookRef.current = null
      stopLookListening()
      stopListening()
      chart.remove()
    }
  }, [])

  // Stale on/off: recolour only. The chart itself is not recreated.
  useEffect(() => {
    if (staleRef.current === stale) return
    staleRef.current = stale
    refreshLookRef.current?.()
  }, [stale])

  return <div ref={containerRef} className="chart" />
}

function coloredVolumePoint(
  candle: Candle,
  volumeColor: (candle: { open: number; close: number }) => string,
): HistogramData<Time> {
  return { ...toVolumePoint(candle), color: volumeColor(candle) }
}

/**
 * Chart times are UTC seconds (market/candles.ts, toChartTime). Returns
 * milliseconds, or null for the library's other time forms, which btcmtg
 * doesn't use.
 */
function toMs(time: Time): number | null {
  return typeof time === 'number' ? time * 1000 : null
}
