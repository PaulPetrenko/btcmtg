import type { Candle } from './types'

/*
 * Shared checks for data from Binance, used by both the REST client and the
 * WebSocket stream. Nothing reaches the UI until it has passed these checks.
 */

/** Thrown when Binance data is missing fields or has invalid values (E-05). */
export class InvalidDataError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidDataError'
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Converts one value to a number. Binance sends most numbers as strings
 * (for example "104123.45000000"), so each value is converted and rejected
 * unless it is a finite number.
 */
export function toNumber(raw: unknown, label: string): number {
  let value = Number.NaN
  if (typeof raw === 'number') {
    value = raw
  } else if (typeof raw === 'string' && raw.trim() !== '') {
    value = Number(raw)
  }

  if (!Number.isFinite(value)) {
    throw new InvalidDataError(`${label} is missing or not a valid number.`)
  }
  return value
}

/**
 * Checks that a candle is internally consistent and starts on a period
 * boundary in UTC (for 1d: 00:00 UTC).
 */
export function checkCandle(candle: Candle, periodMs: number, label: string): void {
  const pricesConsistent =
    candle.low <= Math.min(candle.open, candle.close) &&
    candle.high >= Math.max(candle.open, candle.close)

  if (!Number.isInteger(candle.openTime) || !pricesConsistent || candle.volume < 0) {
    throw new InvalidDataError(`${label} has inconsistent values.`)
  }
  if (candle.openTime % periodMs !== 0) {
    throw new InvalidDataError(`${label} does not start on a period boundary.`)
  }
}
