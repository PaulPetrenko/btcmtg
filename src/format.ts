/**
 * Number and time formatting, using the browser's built-in Intl API
 * (TECHNICAL_SPEC §10.3).
 *
 * Temporary choices until the open questions are decided:
 * - locale (OQ-15): 'en-US'
 * - volume decimals (OQ-08): 2 for BTC, 0 for USDT
 */
export const LOCALE = 'en-US'

// Price and price change: 2 decimal places, matching the 0.01 USDT price step (FR-01).
const priceFormat = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

// 'exceptZero' adds "+" to gains and "-" to losses, and no sign to zero (FR-02).
const signedFormat = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
})

const btcVolumeFormat = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const usdtVolumeFormat = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 0,
})

// Times are always shown in UTC (MVP §5.4).
const timeUtcFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: 'UTC',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

export const formatPrice = (value: number): string => priceFormat.format(value)

export const formatSignedAmount = (value: number): string => signedFormat.format(value)

export const formatSignedPercent = (value: number): string => `${signedFormat.format(value)}%`

export const formatVolumeBtc = (value: number): string => btcVolumeFormat.format(value)

export const formatVolumeUsdt = (value: number): string => usdtVolumeFormat.format(value)

/** Formats a timestamp (milliseconds) as HH:MM:SS in UTC. */
export const formatTimeUtc = (timestamp: number): string => timeUtcFormat.format(timestamp)
