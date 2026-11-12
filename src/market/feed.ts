import { BinanceRestError, fetchCandles, fetchStats24h, restPauseRemaining } from '../binance/rest'
import { BinanceStream, type CloseReason } from '../binance/stream'
import type { Candle, Stats24h } from '../binance/types'
import {
  DEFAULT_TIMEFRAME,
  FAILURES_BEFORE_ERROR,
  RETRY_DELAYS_MS,
  RETRY_JITTER_MS,
  STALE_AFTER_MS,
  TIMEFRAME_MS,
  type Timeframe,
} from '../config'
import { simulation } from '../dev/simulation'
import { classifyUpdate, mergeBuffered } from './candles'

/*
 * The market feed (TD-08, TECHNICAL_SPEC §7): one plain TypeScript module that
 * owns the REST requests and the WebSocket, and keeps a read-only snapshot of
 * the state for React. Candle data goes straight to the chart through
 * candle events, so React doesn't re-render for every candle update.
 *
 * Reliability (TD-09, TECHNICAL_SPEC §8): reconnection with increasing
 * delays, candle recovery after reconnection, 10-second freshness, offline
 * and tab-visibility handling, and error classification.
 */

/** Connection states ST-01 to ST-05 (FR-08, TECHNICAL_SPEC §8.1). */
export type Connection = 'connecting' | 'live' | 'reconnecting' | 'offline' | 'unavailable'

/** Error shown inside one data group's area (MVP §8.2). */
export type GroupError = 'E-05' | 'E-06'

export interface GroupState {
  status: 'loading' | 'ready' | 'error'
  /** When the browser last received data for this group (ms) */
  lastUpdate: number | null
  /** No update for more than 10 seconds (MVP §7.2) */
  stale: boolean
  error: GroupError | null
}

export interface MarketSnapshot {
  connection: Connection
  /**
   * Page-level REST problem: E-01 (readable HTTP 451) or E-04 (rate limit).
   * E-02 and E-03 follow from `connection` ('offline', 'unavailable').
   */
  restProblem: 'E-01' | 'E-04' | null
  /** The selected timeframe */
  timeframe: Timeframe
  /** DG-1 values */
  stats: Stats24h | null
  statsGroup: GroupState
  /** DG-2 status. The candles themselves go to the chart through candle events. */
  candlesGroup: GroupState & { timeframe: Timeframe; count: number }
}

export type CandleEvent =
  | { type: 'reset'; timeframe: Timeframe; candles: readonly Candle[] }
  | { type: 'update'; candle: Candle }

const emptyGroup: GroupState = { status: 'loading', lastUpdate: null, stale: false, error: null }

const initialSnapshot: MarketSnapshot = {
  connection: 'connecting',
  restProblem: null,
  timeframe: DEFAULT_TIMEFRAME,
  stats: null,
  statsGroup: emptyGroup,
  candlesGroup: { ...emptyGroup, timeframe: DEFAULT_TIMEFRAME, count: 0 },
}

/** Retry delay for the nth failure in a row (1, 2, 4, 8, 16, then 30 s) plus 0–1 s. */
function retryDelay(failures: number): number {
  const base = RETRY_DELAYS_MS[Math.min(Math.max(failures - 1, 0), RETRY_DELAYS_MS.length - 1)]
  return base + Math.random() * RETRY_JITTER_MS
}

class MarketFeed {
  private snapshot: MarketSnapshot = initialSnapshot
  private readonly listeners = new Set<() => void>()
  private readonly candleListeners = new Set<(event: CandleEvent) => void>()

  private started = false
  private offline = false
  private freshnessTimer: ReturnType<typeof setInterval> | null = null

  // WebSocket
  private stream: BinanceStream | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  /** Connection attempts in a row that ended without delivering data */
  private connectionFailures = 0
  /** True once any data has arrived over the WebSocket */
  private everLive = false
  /** Reload the candles when the next connection opens (after a reconnect) */
  private recoverOnOpen = false

  // 24h statistics
  private statsController: AbortController | null = null
  /** True once a ticker message has arrived; the REST result is then older. */
  private tickerReceived = false

  // Candles for the selected timeframe, oldest first
  private candles: Candle[] = []
  /** Live candle messages that arrive while the history is loading */
  private buffered: Candle[] = []
  private loadingCandles = false
  private loadNumber = 0
  private candlesController: AbortController | null = null
  private candleRetryTimer: ReturnType<typeof setTimeout> | null = null
  /** Candle loads in a row that failed */
  private candleFailures = 0

  // ---- Used by React (useSyncExternalStore) ----

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): MarketSnapshot => this.snapshot

  // ---- Used by the chart ----

  /**
   * Registers a chart listener and immediately sends it the current candles.
   * Returns a function that removes the listener.
   */
  onCandles(listener: (event: CandleEvent) => void): () => void {
    this.candleListeners.add(listener)
    listener({ type: 'reset', timeframe: this.snapshot.candlesGroup.timeframe, candles: this.candles })
    return () => {
      this.candleListeners.delete(listener)
    }
  }

  // ---- Commands ----

  /** Starts loading data and opens the WebSocket. Calling it twice does nothing. */
  start(): void {
    if (this.started) return
    this.started = true

    this.stream = new BinanceStream({
      onOpen: () => this.handleOpen(),
      onTicker: (stats) => this.handleTicker(stats),
      onKline: (tf, candle) => this.handleKline(tf, candle),
      onInvalid: (group) => this.handleInvalid(group),
      onClose: (reason) => this.handleStreamClose(reason),
    })

    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)
    document.addEventListener('visibilitychange', this.handleVisibility)
    this.freshnessTimer = setInterval(this.checkFreshness, 1000)

    if (import.meta.env.DEV) {
      simulation.candleOpenTimes = () => this.candles.map((candle) => candle.openTime)
      simulation.candles = () => this.candles.map((candle) => ({ ...candle }))
    }

    if (!navigator.onLine) {
      // Offline at load (E-02): wait for the 'online' event, which loads everything.
      this.offline = true
      this.recoverOnOpen = true
      this.update({ connection: 'offline' })
      return
    }

    // Open the stream first and buffer its candle messages while the history
    // loads, so no update is lost between the two (TECHNICAL_SPEC §6.1).
    this.stream.connect(this.snapshot.timeframe)
    this.loadStats()
    this.loadCandles(this.snapshot.timeframe)
  }

  /** Closes the connection, cancels requests and timers, removes listeners. */
  stop(): void {
    this.started = false
    this.stream?.close()
    this.stream = null
    this.statsController?.abort()
    this.candlesController?.abort()
    for (const timer of [this.reconnectTimer, this.candleRetryTimer]) {
      if (timer !== null) clearTimeout(timer)
    }
    if (this.freshnessTimer !== null) clearInterval(this.freshnessTimer)
    this.reconnectTimer = null
    this.candleRetryTimer = null
    this.freshnessTimer = null
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
    document.removeEventListener('visibilitychange', this.handleVisibility)
  }

  /** Selects another timeframe (FR-06). Works while connected or reconnecting. */
  setTimeframe(timeframe: Timeframe): void {
    if (timeframe === this.snapshot.timeframe) return

    // Clear the chart at once, so candles from two timeframes are never shown together.
    this.candles = []
    this.emitCandles({ type: 'reset', timeframe, candles: this.candles })
    this.update({
      timeframe,
      candlesGroup: { ...emptyGroup, timeframe, count: 0 },
    })

    this.stream?.setTimeframe(timeframe)
    this.candleFailures = 0
    if (!this.offline) this.loadCandles(timeframe)
  }

  // ---- WebSocket lifecycle (TECHNICAL_SPEC §5.3, §8.3) ----

  private connectStream(): void {
    if (this.reconnectTimer !== null) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    if (!this.started || this.offline || !this.stream || this.stream.isActive()) return
    this.stream.connect(this.snapshot.timeframe)
  }

  private handleOpen(): void {
    // After a reconnect, reload the candles: candles missed while disconnected
    // come back from Binance (MVP §5.3, TECHNICAL_SPEC §6.3).
    if (this.recoverOnOpen) {
      this.recoverOnOpen = false
      this.candleFailures = 0
      this.loadCandles(this.snapshot.timeframe)
    }
  }

  private handleStreamClose(reason: CloseReason): void {
    this.recoverOnOpen = true
    if (this.offline || !this.started) return

    if (reason === 'server-shutdown') {
      // Binance announced the close: reconnect immediately (TECHNICAL_SPEC §8.3).
      this.update({ connection: this.everLive ? 'reconnecting' : 'connecting' })
      this.connectStream()
      return
    }

    // Binance's 24-hour limit, earlier closes and network drops all end up
    // here. A connection that delivered data reset the count to 0, so the
    // first retry after a normal close waits about 1 s.
    this.connectionFailures++
    const connection: Connection =
      this.connectionFailures >= FAILURES_BEFORE_ERROR
        ? 'unavailable'
        : this.everLive
          ? 'reconnecting'
          : 'connecting'
    this.update({ connection })

    console.warn(`WebSocket ended (${reason}). Reconnecting, attempt ${this.connectionFailures}.`)
    this.reconnectTimer = setTimeout(() => this.connectStream(), retryDelay(this.connectionFailures))
  }

  /** Any valid WebSocket data: the connection works. */
  private markLive(): void {
    this.connectionFailures = 0
    this.everLive = true
    if (this.snapshot.connection !== 'live') this.update({ connection: 'live' })
  }

  // ---- Browser events ----

  private handleOffline = (): void => {
    this.offline = true
    this.recoverOnOpen = true
    if (this.reconnectTimer !== null) clearTimeout(this.reconnectTimer)
    if (this.candleRetryTimer !== null) clearTimeout(this.candleRetryTimer)
    this.reconnectTimer = null
    this.candleRetryTimer = null
    this.stream?.close()
    this.update({ connection: 'offline' })
  }

  private handleOnline = (): void => {
    this.offline = false
    this.connectionFailures = 0
    this.update({ connection: this.everLive ? 'reconnecting' : 'connecting' })
    // Reconnect at once (TECHNICAL_SPEC §8.3); the candles reload when it opens.
    this.connectStream()
    if (!this.tickerReceived) this.loadStats()
  }

  private handleVisibility = (): void => {
    // A tab that becomes visible again with a closed connection reconnects at once.
    if (document.visibilityState === 'visible' && this.stream && !this.stream.isActive()) {
      this.connectStream()
    }
  }

  // ---- Freshness (MVP §7, TECHNICAL_SPEC §8.2) ----

  private checkFreshness = (): void => {
    const now = Date.now()
    const isStale = (group: GroupState) =>
      group.lastUpdate !== null && now - group.lastUpdate > STALE_AFTER_MS

    const statsStale = isStale(this.snapshot.statsGroup)
    const candlesStale = isStale(this.snapshot.candlesGroup)
    if (statsStale !== this.snapshot.statsGroup.stale || candlesStale !== this.snapshot.candlesGroup.stale) {
      this.update({
        statsGroup: { ...this.snapshot.statsGroup, stale: statsStale },
        candlesGroup: { ...this.snapshot.candlesGroup, stale: candlesStale },
      })
    }
  }

  // ---- REST loading ----

  private loadStats(): void {
    this.statsController?.abort()
    const controller = new AbortController()
    this.statsController = controller

    fetchStats24h(controller.signal)
      .then((stats) => {
        // The REST result is only a fast first value; live ticker data wins.
        if (this.tickerReceived) return
        this.update({
          restProblem: null,
          stats,
          statsGroup: { status: 'ready', lastUpdate: Date.now(), stale: false, error: null },
        })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        console.error(error)
        this.noteRestProblem(error)
        // DG-1 has two sources; the ticker stream may still deliver it.
        if (!this.tickerReceived) {
          this.update({ statsGroup: { ...this.snapshot.statsGroup, status: 'error' } })
        }
      })
  }

  /**
   * Loads the 500 most recent candles and replaces the current ones
   * (first load, timeframe change, recovery). Live messages that arrive
   * meanwhile are merged in. Only the latest load may reach the chart.
   */
  private loadCandles(timeframe: Timeframe): void {
    if (this.candleRetryTimer !== null) clearTimeout(this.candleRetryTimer)
    this.candleRetryTimer = null
    this.candlesController?.abort()
    const controller = new AbortController()
    this.candlesController = controller
    const loadNumber = ++this.loadNumber

    this.loadingCandles = true
    this.buffered = []

    fetchCandles(timeframe, controller.signal)
      .then((history) => {
        if (loadNumber !== this.loadNumber) return // a newer load has started
        this.candles = mergeBuffered(history, this.buffered)
        this.buffered = []
        this.loadingCandles = false
        this.candleFailures = 0
        this.emitCandles({ type: 'reset', timeframe, candles: this.candles })
        this.update({
          restProblem: null,
          candlesGroup: {
            status: 'ready',
            lastUpdate: Date.now(),
            stale: false,
            error: null,
            timeframe,
            count: this.candles.length,
          },
        })
      })
      .catch((error: unknown) => {
        if (loadNumber !== this.loadNumber) return
        this.loadingCandles = false
        this.buffered = []
        console.error(error)
        this.noteRestProblem(error)
        if (this.offline) return // the 'online' event reloads

        this.candleFailures++
        const invalid = error instanceof BinanceRestError && error.kind === 'invalid-data'
        const groupError: GroupError | null = invalid
          ? 'E-05'
          : this.candleFailures >= FAILURES_BEFORE_ERROR
            ? 'E-06'
            : null
        if (groupError) {
          this.update({ candlesGroup: { ...this.snapshot.candlesGroup, status: 'error', error: groupError } })
        }

        // Retry with the same delays as the connection, and never during a rate-limit pause.
        const delay = Math.max(retryDelay(this.candleFailures), restPauseRemaining())
        this.candleRetryTimer = setTimeout(() => {
          this.candleRetryTimer = null
          if (timeframe === this.snapshot.timeframe) this.loadCandles(timeframe)
        }, delay)
      })
  }

  /** Page-level REST problems: E-01 (readable 451) and E-04 (rate limit). */
  private noteRestProblem(error: unknown): void {
    if (!(error instanceof BinanceRestError)) return
    if (error.kind === 'restricted') this.update({ restProblem: 'E-01' })
    if (error.kind === 'rate-limit') this.update({ restProblem: 'E-04' })
  }

  // ---- WebSocket messages ----

  private handleTicker(stats: Stats24h): void {
    this.tickerReceived = true
    this.markLive()
    this.update({
      stats,
      statsGroup: { status: 'ready', lastUpdate: Date.now(), stale: false, error: null },
    })
  }

  private handleKline(timeframe: Timeframe, candle: Candle): void {
    this.markLive()
    // Messages for any other timeframe (for example a late message from the
    // old stream after a switch) are ignored (TECHNICAL_SPEC §5.2).
    if (timeframe !== this.snapshot.timeframe) return

    if (this.loadingCandles) {
      this.buffered.push(candle)
      return
    }

    const last = this.candles[this.candles.length - 1]
    if (!last) return // no history yet (for example, its request failed): nothing to update

    switch (classifyUpdate(last, candle, TIMEFRAME_MS[timeframe])) {
      case 'replace':
        this.candles[this.candles.length - 1] = candle
        break
      case 'append':
        this.candles.push(candle)
        break
      case 'ignore':
        return
      case 'reload':
        // Messages were missed or Binance has a gap: reload the timeframe (TECHNICAL_SPEC §6.2).
        this.loadCandles(timeframe)
        return
    }

    this.emitCandles({ type: 'update', candle })
    const group = this.snapshot.candlesGroup
    this.update({
      candlesGroup: {
        ...group,
        lastUpdate: Date.now(),
        stale: false,
        // A valid update clears an invalid-data error (E-05 recovers with the next valid update).
        error: group.error === 'E-05' ? null : group.error,
        status: group.error === 'E-05' ? 'ready' : group.status,
        count: this.candles.length,
      },
    })
  }

  /** An invalid message is dropped and shown as E-05 in its group's area. */
  private handleInvalid(group: 'stats' | 'candles' | null): void {
    if (group === 'stats' && this.snapshot.stats) {
      this.update({ statsGroup: { ...this.snapshot.statsGroup, error: 'E-05' } })
    }
    if (group === 'candles' && this.snapshot.candlesGroup.status === 'ready') {
      this.update({ candlesGroup: { ...this.snapshot.candlesGroup, error: 'E-05' } })
    }
  }

  // ---- Helpers ----

  /** Replaces the snapshot with an updated copy and notifies React. */
  private update(changes: Partial<MarketSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...changes }
    this.listeners.forEach((listener) => listener())
  }

  private emitCandles(event: CandleEvent): void {
    this.candleListeners.forEach((listener) => listener(event))
  }
}

/** The one market feed for the whole page. It is started in main.tsx. */
export const marketFeed = new MarketFeed()

// During development, Vite can reload this module after an edit. Close the old
// feed's connection first, so connections never pile up.
if (import.meta.hot) {
  import.meta.hot.dispose(() => marketFeed.stop())
}
