/*
 * Development-only failure simulation (TD-13, TECHNICAL_SPEC §12.2).
 *
 * Some failures can't be triggered safely against Binance: regional blocks,
 * rate limits, dropped connections. In `npm run dev` they can be simulated:
 *
 *   ?simulate=regional     REST answers HTTP 451; the WebSocket can't connect
 *   ?simulate=rate-limit   REST answers HTTP 429
 *   ?simulate=unavailable  REST and the WebSocket can't connect
 *
 * and controlled at run time from the browser console through window.__btcmtgDev.
 *
 * Every use of this module is wrapped in `if (import.meta.env.DEV)`, so the
 * production build contains none of it.
 */

import type { Candle } from '../binance/types'

export type SimulatedRestFailure = 'restricted' | 'rate-limit' | 'network' | 'invalid-data'

interface Simulation {
  /** Every REST request fails like this, without reaching Binance */
  restFailure: SimulatedRestFailure | null
  /** New WebSocket connections fail */
  blockStream: boolean
  /** The open WebSocket silently drops incoming messages */
  freezeStream: boolean
  /** Set by the stream: closes the socket as if Binance had closed it */
  closeStream: (() => void) | null
  /** Set by the stream: handles a raw text message as if Binance had sent it */
  injectMessage: ((raw: string) => void) | null
  /** Set by the feed: open times of the candles currently held */
  candleOpenTimes: (() => number[]) | null
  /** Set by the feed: copies of the candles currently held */
  candles: (() => Candle[]) | null
}

export const simulation: Simulation = {
  restFailure: null,
  blockStream: false,
  freezeStream: false,
  closeStream: null,
  injectMessage: null,
  candleOpenTimes: null,
  candles: null,
}

if (import.meta.env.DEV) {
  const mode = new URLSearchParams(window.location.search).get('simulate')
  if (mode === 'regional') {
    simulation.restFailure = 'restricted'
    simulation.blockStream = true
  } else if (mode === 'unavailable') {
    simulation.restFailure = 'network'
    simulation.blockStream = true
  } else if (mode === 'rate-limit') {
    simulation.restFailure = 'rate-limit'
  }

  Object.assign(window, {
    __btcmtgDev: {
      failRest: (failure: SimulatedRestFailure | null) => (simulation.restFailure = failure),
      blockStream: (on: boolean) => (simulation.blockStream = on),
      freezeStream: (on: boolean) => (simulation.freezeStream = on),
      dropConnection: () => simulation.closeStream?.(),
      injectMessage: (raw: string) => simulation.injectMessage?.(raw),
      candleOpenTimes: () => simulation.candleOpenTimes?.() ?? [],
      candles: () => simulation.candles?.() ?? [],
    },
  })
}
