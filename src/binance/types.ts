/**
 * BTC/USDT 24-hour statistics (data group DG-1, MVP §2.2).
 * Values are checked and converted to numbers before they reach the UI.
 * The 24 hours are Binance's rolling window, not a calendar day.
 */
export interface Stats24h {
  /** Last traded price, in USDT */
  lastPrice: number
  /** Price change over the 24h window, in USDT */
  priceChange: number
  /** The same change as a percentage, as Binance calculates it */
  priceChangePercent: number
  /** Highest price in the 24h window, in USDT */
  highPrice: number
  /** Lowest price in the 24h window, in USDT */
  lowPrice: number
  /** Traded volume in BTC (base asset) */
  volume: number
  /** Traded volume in USDT (quote asset) */
  quoteVolume: number
}

/**
 * One Binance candle (data group DG-2), checked and converted to numbers.
 * Prices are in USDT; volume is in BTC (OQ-23).
 */
export interface Candle {
  /** Start of the candle period, in milliseconds since 1970 (UTC) */
  openTime: number
  open: number
  high: number
  low: number
  close: number
  /** Traded volume in BTC (base asset) */
  volume: number
}
