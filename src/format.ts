/**
 * Number, date and time formatting for the page and the chart
 * (TECHNICAL_SPEC §10.3). One implementation, so both always agree.
 *
 * Approved Instrument conventions (Frame 47, owner approval 2026-11-12;
 * settles OQ-15 for display and OQ-08 for volumes):
 * - thousands separated by a space: 74 260,25
 * - comma as the decimal separator
 * - a true minus sign (U+2212) for negative values: −1 490,50
 * - USDT volume in millions with 2 decimals: 1 283,38 M
 * - dates YYYY-MM-DD and times HH:MM:SS, always in UTC (MVP §5.4)
 *
 * How it stays identical in every browser: rounding is done by Intl with the
 * fixed 'en-US' rules, which round the exact value and are the same in
 * Chrome, Edge and Firefox. Its separators are then replaced with ours, so
 * no browser's locale data (which uses different space characters) is used.
 * Dates and times are built from the UTC fields of Date, with no Intl.
 */

/** The locale used for rounding, and passed to the chart for any built-in text. */
export const LOCALE = 'en-US'

/**
 * Thousands separator: a no-break space, so a number never wraps across two
 * lines. It has the width of a normal space.
 */
const GROUP = ' '
const DECIMAL = ','
const MINUS = '−'

const fixed2 = { minimumFractionDigits: 2, maximumFractionDigits: 2 }

// 'negative': a minus only for values below zero after rounding, so −0,001 shows as 0,00.
const unsignedFormat = new Intl.NumberFormat(LOCALE, { ...fixed2, signDisplay: 'negative' })
// 'exceptZero': "+" for gains, "−" for losses, no sign for zero (FR-02).
const signedFormat = new Intl.NumberFormat(LOCALE, { ...fixed2, signDisplay: 'exceptZero' })

function applyConventions(format: Intl.NumberFormat, value: number): string {
  return format
    .formatToParts(value)
    .map((part) => {
      switch (part.type) {
        case 'group':
          return GROUP
        case 'decimal':
          return DECIMAL
        case 'minusSign':
          return MINUS
        default:
          return part.value
      }
    })
    .join('')
}

// ---- Numbers ----

/** Price, 24h high and low: 2 decimals, the 0.01 USDT price step (FR-01). "74 260,25" */
export const formatPrice = (value: number): string => applyConventions(unsignedFormat, value)

/** 24h change amount, always signed unless zero (FR-02). "−1 490,50", "+12,00", "0,00" */
export const formatSignedAmount = (value: number): string => applyConventions(signedFormat, value)

/** 24h change percent, signed unless zero (FR-02). "−1,97%" */
export const formatSignedPercent = (value: number): string => `${applyConventions(signedFormat, value)}%`

/** 24h volume in BTC, and chart volume values: 2 decimals. "17 405,41" */
export const formatVolumeBtc = (value: number): string => applyConventions(unsignedFormat, value)

/** 24h volume in USDT, in millions with 2 decimals (OQ-08). "1 283,38 M" */
export const formatVolumeUsdt = (value: number): string =>
  `${applyConventions(unsignedFormat, value / 1_000_000)} M`

// ---- Dates and times, always UTC ----

const pad2 = (n: number): string => String(n).padStart(2, '0')

/** "2026-11-12" */
export function formatDateUtc(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}

/** "17:38" */
export function formatTimeUtcShort(timestamp: number): string {
  const d = new Date(timestamp)
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`
}

/** "17:38:04". The page adds the " UTC" label next to it. */
export function formatTimeUtc(timestamp: number): string {
  const d = new Date(timestamp)
  return `${formatTimeUtcShort(timestamp)}:${pad2(d.getUTCSeconds())}`
}
