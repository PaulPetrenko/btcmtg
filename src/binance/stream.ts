import {
  CONNECT_TIMEOUT_MS,
  MIN_SWITCH_INTERVAL_MS,
  STREAM_BASE_URL,
  STREAM_SYMBOL,
  SYMBOL,
  TIMEFRAME_MS,
  TIMEFRAMES,
  WATCHDOG_MS,
  type Timeframe,
} from '../config'
import { simulation } from '../dev/simulation'
import type { Candle, Stats24h } from './types'
import { checkCandle, InvalidDataError, isRecord, toNumber } from './validate'

/**
 * Why a connection ended without the app asking for it:
 * - 'closed'          the socket closed (Binance's 24-hour limit, an earlier close, a network drop)
 * - 'connect-timeout' the socket didn't open within 10 s
 * - 'watchdog'        an open socket received nothing for 10 s
 * - 'server-shutdown' Binance announced that the server is shutting down
 */
export type CloseReason = 'closed' | 'connect-timeout' | 'watchdog' | 'server-shutdown'

export interface StreamHandlers {
  /** The connection is open. */
  onOpen: () => void
  /** A checked 24h statistics message (DG-1). */
  onTicker: (stats: Stats24h) => void
  /** A checked candle message (DG-2), with the timeframe it belongs to. */
  onKline: (timeframe: Timeframe, candle: Candle) => void
  /** A message failed the checks. `group` says which data it was for, if known. */
  onInvalid: (group: 'stats' | 'candles' | null) => void
  /** The connection ended without close() being called. */
  onClose: (reason: CloseReason) => void
}

/**
 * One WebSocket connection to Binance carrying two streams: 24h statistics
 * (`btcusdt@ticker`) and candles for one timeframe (`btcusdt@kline_<tf>`)
 * (TD-06, TD-09, TECHNICAL_SPEC §5).
 *
 * This class only manages a single connection. Deciding when to reconnect is
 * the market feed's job. Pings from Binance are answered by the browser.
 */
export class BinanceStream {
  private readonly handlers: StreamHandlers
  private socket: WebSocket | null = null
  private connectTimer: ReturnType<typeof setTimeout> | null = null
  private watchdogTimer: ReturnType<typeof setInterval> | null = null
  private lastMessageAt = 0

  /** Candle stream the connection is subscribed to */
  private subscribed: Timeframe | null = null
  /** Candle stream the app wants: the latest selection */
  private desired: Timeframe | null = null
  private switchTimer: ReturnType<typeof setTimeout> | null = null
  private lastSwitchAt = 0
  private nextRequestId = 1

  constructor(handlers: StreamHandlers) {
    this.handlers = handlers
  }

  /** True while a socket exists (connecting or open). */
  isActive(): boolean {
    return this.socket !== null
  }

  /**
   * Opens a connection subscribed to the given timeframe. Does nothing if a
   * connection already exists, so there is never more than one.
   */
  connect(timeframe: Timeframe): void {
    if (this.socket) return

    this.desired = timeframe
    this.subscribed = timeframe
    const streams = `${STREAM_SYMBOL}@ticker/${STREAM_SYMBOL}@kline_${timeframe}`
    let url = `${STREAM_BASE_URL}/stream?streams=${streams}`
    if (import.meta.env.DEV && simulation.blockStream) {
      url = 'wss://blocked.invalid/' // a host that can't exist, so the connection fails
    }

    const socket = new WebSocket(url)
    socket.addEventListener('open', this.handleOpen)
    socket.addEventListener('message', this.handleMessage)
    socket.addEventListener('close', this.handleSocketClose)
    this.socket = socket

    this.connectTimer = setTimeout(() => this.end('connect-timeout'), CONNECT_TIMEOUT_MS)

    if (import.meta.env.DEV) {
      simulation.closeStream = () => this.socket?.close(1000, 'Simulated close')
      simulation.injectMessage = (raw) => this.handleMessage(new MessageEvent('message', { data: raw }))
    }
  }

  /**
   * Switches the candle stream to another timeframe. Switches happen at most
   * once per second; if the selection changes several times in between,
   * only the latest one is applied (TECHNICAL_SPEC §5.2). Without an open
   * connection, the next connect() uses the latest selection.
   */
  setTimeframe(timeframe: Timeframe): void {
    this.desired = timeframe
    this.scheduleSwitch()
  }

  /** Closes the connection on purpose. No onClose call follows. */
  close(): void {
    this.teardown()
  }

  // ---- Connection lifecycle ----

  /** Removes all listeners and timers and closes the socket. Safe to call twice. */
  private teardown(): void {
    for (const timer of [this.connectTimer, this.switchTimer]) {
      if (timer !== null) clearTimeout(timer)
    }
    if (this.watchdogTimer !== null) clearInterval(this.watchdogTimer)
    this.connectTimer = null
    this.switchTimer = null
    this.watchdogTimer = null

    const socket = this.socket
    this.socket = null
    if (!socket) return

    socket.removeEventListener('open', this.handleOpen)
    socket.removeEventListener('message', this.handleMessage)
    socket.removeEventListener('close', this.handleSocketClose)
    if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) {
      socket.close(1000, 'Closed by btcmtg')
    }
  }

  /** Ends the connection for a reason the feed needs to know about. */
  private end(reason: CloseReason): void {
    if (!this.socket) return
    this.teardown()
    this.handlers.onClose(reason)
  }

  // Arrow functions keep `this` bound, so the same function can be removed in teardown().
  private handleOpen = (): void => {
    if (this.connectTimer !== null) clearTimeout(this.connectTimer)
    this.connectTimer = null

    // Watchdog: the ticker sends a message every second, so 10 s of silence
    // means the connection is dead even if the browser hasn't noticed.
    this.lastMessageAt = Date.now()
    this.watchdogTimer = setInterval(() => {
      if (Date.now() - this.lastMessageAt > WATCHDOG_MS) this.end('watchdog')
    }, 1000)

    this.handlers.onOpen()
    if (this.desired !== this.subscribed) this.scheduleSwitch()
  }

  private handleSocketClose = (): void => {
    this.end('closed')
  }

  // ---- Timeframe switching ----

  private scheduleSwitch(): void {
    if (this.switchTimer !== null) return // already planned; it will use the latest selection
    const wait = Math.max(0, this.lastSwitchAt + MIN_SWITCH_INTERVAL_MS - Date.now())
    this.switchTimer = setTimeout(() => {
      this.switchTimer = null
      this.applySwitch()
    }, wait)
  }

  private applySwitch(): void {
    const socket = this.socket
    // Not open: handleOpen or the next connect() uses the latest selection.
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    if (this.desired === null || this.desired === this.subscribed) return

    // Subscribe to the new stream first, then unsubscribe from the old one.
    this.send('SUBSCRIBE', `${STREAM_SYMBOL}@kline_${this.desired}`)
    if (this.subscribed !== null) {
      this.send('UNSUBSCRIBE', `${STREAM_SYMBOL}@kline_${this.subscribed}`)
    }
    this.subscribed = this.desired
    this.lastSwitchAt = Date.now()
  }

  private send(method: 'SUBSCRIBE' | 'UNSUBSCRIBE', stream: string): void {
    this.socket?.send(JSON.stringify({ method, params: [stream], id: this.nextRequestId++ }))
  }

  // ---- Messages ----

  private handleMessage = (event: MessageEvent): void => {
    if (import.meta.env.DEV && simulation.freezeStream) return
    this.lastMessageAt = Date.now()

    let message: unknown
    try {
      message = JSON.parse(String(event.data))
    } catch {
      console.warn('Ignored a WebSocket message that is not valid JSON.')
      this.handlers.onInvalid(null)
      return
    }

    const group = messageGroup(message)
    try {
      this.dispatch(message)
    } catch (error) {
      // Invalid messages are dropped, never shown (E-05).
      if (!(error instanceof InvalidDataError)) throw error
      console.warn('Ignored an invalid WebSocket message:', error.message)
      this.handlers.onInvalid(group)
    }
  }

  private dispatch(message: unknown): void {
    if (!isRecord(message)) throw new InvalidDataError('Message is not an object.')

    // Binance announces a server shutdown before closing (TECHNICAL_SPEC §5.3).
    // The exact shape isn't documented in detail, so both places are checked.
    if (message.e === 'serverShutdown' || (isRecord(message.data) && message.data.e === 'serverShutdown')) {
      this.end('server-shutdown')
      return
    }

    // Reply to a SUBSCRIBE or UNSUBSCRIBE request, for example {"result":null,"id":1}
    if ('id' in message && !('stream' in message)) {
      if (message.error) console.warn('Binance rejected a subscription request:', message.error)
      return
    }

    const { stream, data } = message
    if (typeof stream !== 'string' || !isRecord(data)) {
      throw new InvalidDataError('Message has no stream name or data.')
    }

    if (stream === `${STREAM_SYMBOL}@ticker`) {
      this.handlers.onTicker(parseTicker(data))
    } else if (stream.startsWith(`${STREAM_SYMBOL}@kline_`)) {
      const { timeframe, candle } = parseKline(data)
      this.handlers.onKline(timeframe, candle)
    }
  }
}

/** Which data group a message belongs to, judging by its stream name. */
function messageGroup(message: unknown): 'stats' | 'candles' | null {
  if (!isRecord(message) || typeof message.stream !== 'string') return null
  if (message.stream.endsWith('@ticker')) return 'stats'
  if (message.stream.includes('@kline_')) return 'candles'
  return null
}

/** Ticker stream payload: c, p, P, h, l, v, q (TECHNICAL_SPEC §5.1). */
function parseTicker(data: Record<string, unknown>): Stats24h {
  if (data.e !== '24hrTicker' || data.s !== SYMBOL) {
    throw new InvalidDataError('Unexpected ticker message.')
  }
  return {
    lastPrice: toNumber(data.c, 'ticker last price'),
    priceChange: toNumber(data.p, 'ticker price change'),
    priceChangePercent: toNumber(data.P, 'ticker price change percent'),
    highPrice: toNumber(data.h, 'ticker high'),
    lowPrice: toNumber(data.l, 'ticker low'),
    volume: toNumber(data.v, 'ticker volume'),
    quoteVolume: toNumber(data.q, 'ticker quote volume'),
  }
}

/** Kline stream payload: the candle is in `k`; `k.i` is its timeframe. */
function parseKline(data: Record<string, unknown>): { timeframe: Timeframe; candle: Candle } {
  const k = data.k
  if (data.e !== 'kline' || data.s !== SYMBOL || !isRecord(k)) {
    throw new InvalidDataError('Unexpected kline message.')
  }

  const timeframe = TIMEFRAMES.find((tf) => tf === k.i)
  if (!timeframe) throw new InvalidDataError('Kline message has an unknown timeframe.')

  const candle: Candle = {
    openTime: toNumber(k.t, 'kline open time'),
    open: toNumber(k.o, 'kline open'),
    high: toNumber(k.h, 'kline high'),
    low: toNumber(k.l, 'kline low'),
    close: toNumber(k.c, 'kline close'),
    volume: toNumber(k.v, 'kline volume'),
  }
  checkCandle(candle, TIMEFRAME_MS[timeframe], 'Kline message')
  return { timeframe, candle }
}
