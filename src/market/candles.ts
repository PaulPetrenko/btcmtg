import type { CandlestickData, HistogramData, UTCTimestamp, WhitespaceData } from 'lightweight-charts'
import type { Candle } from '../binance/types'

/*
 * Pure functions for candle data: merging live updates and converting
 * candles for the chart. No network, no React (TECHNICAL_SPEC §2.2), so the
 * rules from MVP §5.3 and TECHNICAL_SPEC §6 are easy to read and check.
 */

/** What to do with a live candle message (TECHNICAL_SPEC §6.2). */
export type UpdateAction =
  | 'replace' // same open time as the last candle: the current candle changed
  | 'append' // the next period: a new candle starts
  | 'ignore' // older than the last candle
  | 'reload' // more than one period later: messages were missed or there is a gap

export function classifyUpdate(last: Candle, incoming: Candle, periodMs: number): UpdateAction {
  if (incoming.openTime === last.openTime) return 'replace'
  if (incoming.openTime < last.openTime) return 'ignore'
  if (incoming.openTime === last.openTime + periodMs) return 'append'
  return 'reload'
}

/**
 * Applies live messages that arrived while the history was loading
 * (TECHNICAL_SPEC §6.1, step 3). A message with the same open time as the
 * last candle replaces it, a newer one is appended, an older one is dropped.
 * Returns a new array; the input is not changed.
 */
export function mergeBuffered(history: Candle[], buffered: Candle[]): Candle[] {
  const result = [...history]
  for (const candle of buffered) {
    const last = result[result.length - 1]
    if (!last || candle.openTime > last.openTime) {
      result.push(candle)
    } else if (candle.openTime === last.openTime) {
      result[result.length - 1] = candle
    }
  }
  return result
}

type Point<T> = T | WhitespaceData<UTCTimestamp>

export interface ChartData {
  candles: Point<CandlestickData<UTCTimestamp>>[]
  volumes: Point<HistogramData<UTCTimestamp>>[]
}

/**
 * Binance times are milliseconds since 1970 in UTC. The chart expects seconds
 * and shows them without any time-zone conversion, so the chart displays UTC.
 */
export function toChartTime(openTimeMs: number): UTCTimestamp {
  return (openTimeMs / 1000) as UTCTimestamp
}

export function toCandlePoint(candle: Candle): CandlestickData<UTCTimestamp> {
  return {
    time: toChartTime(candle.openTime),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  }
}

export function toVolumePoint(candle: Candle): HistogramData<UTCTimestamp> {
  return { time: toChartTime(candle.openTime), value: candle.volume }
}

/**
 * Builds the candlestick and volume data for a full load.
 *
 * Source gaps (MVP §5.3): when Binance has no candle for a period, an empty
 * "whitespace" point (a time with no values) is added for that period.
 * The gap stays visible on the time axis, and no values are invented.
 */
export function toChartData(candles: Candle[], periodMs: number): ChartData {
  const result: ChartData = { candles: [], volumes: [] }

  candles.forEach((candle, index) => {
    if (index > 0) {
      const previous = candles[index - 1]
      for (let time = previous.openTime + periodMs; time < candle.openTime; time += periodMs) {
        result.candles.push({ time: toChartTime(time) })
        result.volumes.push({ time: toChartTime(time) })
      }
    }
    result.candles.push(toCandlePoint(candle))
    result.volumes.push(toVolumePoint(candle))
  })

  return result
}
