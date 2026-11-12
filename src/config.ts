/**
 * Market settings in one place (TECHNICAL_SPEC §2.2, §4.1).
 */

/** Binance's REST host for public market data only. No fallback host (TD-05). */
export const REST_BASE_URL = 'https://data-api.binance.vision'

/** Binance's WebSocket host for public market data only (TD-06). */
export const STREAM_BASE_URL = 'wss://data-stream.binance.vision'

/** The only market btcmtg shows: BTC/USDT on Binance Spot. */
export const SYMBOL = 'BTCUSDT'

/** Stream names use the lower-case symbol, for example "btcusdt@ticker". */
export const STREAM_SYMBOL = 'btcusdt'

/**
 * At most one timeframe switch per second on the WebSocket. A switch sends
 * two messages (SUBSCRIBE and UNSUBSCRIBE), well under Binance's limit of
 * 5 incoming messages per second (TD-06, TECHNICAL_SPEC §5.2).
 */
export const MIN_SWITCH_INTERVAL_MS = 1000

// ---- Reliability (TD-09, TECHNICAL_SPEC §5.3, §8) ----

/** Delays between retries: 1, 2, 4, 8, 16, then 30 seconds. */
export const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 16_000, 30_000]

/** A random 0–1 s added to each retry delay, so many open tabs don't retry in step. */
export const RETRY_JITTER_MS = 1000

/** Data is marked stale after 10 s without an update (MVP §7.2, OQ-10). */
export const STALE_AFTER_MS = 10_000

/** An open connection that receives nothing for 10 s is closed and reopened. */
export const WATCHDOG_MS = 10_000

/** A connection that hasn't opened within 10 s counts as a failed attempt. */
export const CONNECT_TIMEOUT_MS = 10_000

/** Consecutive failures before the page shows "Unavailable" or a section error. */
export const FAILURES_BEFORE_ERROR = 3

/** After HTTP 429 or 418, no REST requests are sent for 60 s (TECHNICAL_SPEC §4.4). */
export const RATE_LIMIT_PAUSE_MS = 60_000

/** The six approved timeframes, in display order (FR-06). */
export const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'] as const

export type Timeframe = (typeof TIMEFRAMES)[number]

/** Timeframe shown when the page opens (FR-06, OQ-05). */
export const DEFAULT_TIMEFRAME: Timeframe = '1h'

/** Candles loaded for each timeframe (FR-05, OQ-07). */
export const CANDLE_LIMIT = 500

const MINUTE = 60_000

/** Length of one candle period in milliseconds. All six are fixed lengths. */
export const TIMEFRAME_MS: Record<Timeframe, number> = {
  '1m': MINUTE,
  '5m': 5 * MINUTE,
  '15m': 15 * MINUTE,
  '1h': 60 * MINUTE,
  '4h': 240 * MINUTE,
  '1d': 1440 * MINUTE,
}
