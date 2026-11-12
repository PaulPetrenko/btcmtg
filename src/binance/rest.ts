import {
  CANDLE_LIMIT,
  RATE_LIMIT_PAUSE_MS,
  REST_BASE_URL,
  SYMBOL,
  TIMEFRAME_MS,
  type Timeframe,
} from '../config'
import { simulation } from '../dev/simulation'
import type { Candle, Stats24h } from './types'
import { checkCandle, InvalidDataError, isRecord, toNumber } from './validate'

/**
 * Why a REST request failed. Each kind maps to an error state in the MVP
 * requirements (MVP §8.2, TECHNICAL_SPEC §8.4):
 * - 'restricted'      → E-01 (readable HTTP 451)
 * - 'rate-limit'      → E-04 (readable HTTP 429 or 418)
 * - 'invalid-data'    → E-05 (missing fields, invalid numbers, empty or out-of-order data)
 * - 'network', 'http' → E-03 (network errors, 403, 5xx, unreadable responses)
 */
export type RestErrorKind = 'network' | 'http' | 'restricted' | 'rate-limit' | 'invalid-data'

export class BinanceRestError extends Error {
  readonly kind: RestErrorKind
  /** HTTP status, when the browser was allowed to read it */
  readonly status: number | null

  constructor(kind: RestErrorKind, message: string, status: number | null = null) {
    super(message)
    this.name = 'BinanceRestError'
    this.kind = kind
    this.status = status
  }
}

/**
 * After HTTP 429 or 418, no REST request is sent until this time
 * (TECHNICAL_SPEC §4.4). Binance's Retry-After header can't be read from
 * the browser, so a fixed 60-second pause is used.
 */
let pausedUntil = 0

/** Milliseconds left in the rate-limit pause (0 when requests are allowed). */
export function restPauseRemaining(): number {
  return Math.max(0, pausedUntil - Date.now())
}

/**
 * Loads BTC/USDT 24-hour statistics.
 * GET /api/v3/ticker/24hr?symbol=BTCUSDT, request weight 2 (TECHNICAL_SPEC §4.2).
 */
export async function fetchStats24h(signal?: AbortSignal): Promise<Stats24h> {
  const data = await getJson(`/api/v3/ticker/24hr?symbol=${SYMBOL}`, signal)
  return parseOrThrow(() => parseStats24h(data))
}

/**
 * Loads the 500 most recent candles for one timeframe, oldest first.
 * GET /api/v3/klines, request weight 2 (TECHNICAL_SPEC §4.2).
 * No timeZone parameter: Binance's default UTC boundaries are the approved
 * ones, so daily candles start at 00:00 UTC (OQ-24).
 */
export async function fetchCandles(timeframe: Timeframe, signal?: AbortSignal): Promise<Candle[]> {
  const data = await getJson(
    `/api/v3/klines?symbol=${SYMBOL}&interval=${timeframe}&limit=${CANDLE_LIMIT}`,
    signal,
  )
  return parseOrThrow(() => parseCandles(data, TIMEFRAME_MS[timeframe]))
}

/**
 * Sends a plain GET request and returns the parsed JSON.
 * No custom headers: they would make the browser send a CORS preflight request,
 * which data-api.binance.vision rejects (TECHNICAL_SPEC §4.3).
 */
async function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
  // Rate-limit pause: fail at once, without contacting Binance.
  if (restPauseRemaining() > 0) {
    throw new BinanceRestError('rate-limit', 'REST requests are paused after a rate-limit response.')
  }

  if (import.meta.env.DEV && simulation.restFailure) {
    throw simulatedFailure(simulation.restFailure)
  }

  let response: Response
  try {
    response = await fetch(`${REST_BASE_URL}${path}`, { signal })
  } catch (error) {
    // Cancelled on purpose (for example, a newer timeframe was selected): pass it on unchanged.
    if (signal?.aborted) throw error
    // Offline, DNS failure, or an error response the browser isn't allowed to read.
    throw new BinanceRestError('network', 'Binance could not be reached.')
  }

  if (!response.ok) {
    const { status } = response
    if (status === 451) {
      throw new BinanceRestError('restricted', 'Binance restricts access from this location.', status)
    }
    if (status === 429 || status === 418) {
      pausedUntil = Date.now() + RATE_LIMIT_PAUSE_MS
      throw new BinanceRestError('rate-limit', 'Binance is limiting requests.', status)
    }
    throw new BinanceRestError('http', `Binance responded with HTTP ${status}.`, status)
  }

  try {
    return await response.json()
  } catch (error) {
    if (signal?.aborted) throw error
    // Only a parse failure means the data is invalid. Anything else means the
    // response body was cut off (connection lost, page unloading): a network failure.
    if (error instanceof SyntaxError) {
      throw new BinanceRestError('invalid-data', 'Binance sent a response that is not valid JSON.')
    }
    throw new BinanceRestError('network', 'Binance could not be reached.')
  }
}

/** Development only: the error a real failure of this kind would produce. */
function simulatedFailure(kind: NonNullable<typeof simulation.restFailure>): BinanceRestError {
  if (kind === 'restricted') return new BinanceRestError('restricted', 'Simulated HTTP 451.', 451)
  if (kind === 'rate-limit') {
    pausedUntil = Date.now() + RATE_LIMIT_PAUSE_MS
    return new BinanceRestError('rate-limit', 'Simulated HTTP 429.', 429)
  }
  if (kind === 'invalid-data') return new BinanceRestError('invalid-data', 'Simulated invalid data.')
  return new BinanceRestError('network', 'Simulated network failure.')
}

/** Turns a failed data check into a REST error of kind 'invalid-data'. */
function parseOrThrow<T>(parse: () => T): T {
  try {
    return parse()
  } catch (error) {
    if (error instanceof InvalidDataError) {
      throw new BinanceRestError('invalid-data', error.message)
    }
    throw error
  }
}

/** Checks the response shape and converts every value to a number. */
function parseStats24h(data: unknown): Stats24h {
  if (!isRecord(data) || data.symbol !== SYMBOL) {
    throw new InvalidDataError('Unexpected response for 24h statistics.')
  }

  return {
    lastPrice: toNumber(data.lastPrice, 'lastPrice'),
    priceChange: toNumber(data.priceChange, 'priceChange'),
    priceChangePercent: toNumber(data.priceChangePercent, 'priceChangePercent'),
    highPrice: toNumber(data.highPrice, 'highPrice'),
    lowPrice: toNumber(data.lowPrice, 'lowPrice'),
    volume: toNumber(data.volume, 'volume'),
    quoteVolume: toNumber(data.quoteVolume, 'quoteVolume'),
  }
}

/**
 * Checks a klines response. Each row is an array:
 * [openTime, open, high, low, close, volume, closeTime, ...]
 * The whole response is rejected, rather than partly shown, if any candle is
 * invalid or the candles aren't in strict time order (MVP §5.3).
 */
function parseCandles(data: unknown, periodMs: number): Candle[] {
  if (!Array.isArray(data)) {
    throw new InvalidDataError('Unexpected response for candles.')
  }
  if (data.length === 0) {
    throw new InvalidDataError('Binance returned no candles.')
  }

  const candles = data.map((row: unknown, index: number) => {
    if (!Array.isArray(row) || row.length < 6) {
      throw new InvalidDataError(`Candle ${index} has an unexpected shape.`)
    }
    const candle: Candle = {
      openTime: toNumber(row[0], `candle ${index} open time`),
      open: toNumber(row[1], `candle ${index} open`),
      high: toNumber(row[2], `candle ${index} high`),
      low: toNumber(row[3], `candle ${index} low`),
      close: toNumber(row[4], `candle ${index} close`),
      volume: toNumber(row[5], `candle ${index} volume`),
    }
    checkCandle(candle, periodMs, `Candle ${index}`)
    return candle
  })

  candles.forEach((candle, index) => {
    if (index > 0 && candle.openTime <= candles[index - 1].openTime) {
      throw new InvalidDataError(`Candle ${index} is out of order or duplicated.`)
    }
  })

  return candles
}
