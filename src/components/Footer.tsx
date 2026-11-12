import './Footer.css'

/**
 * Footer with the disclaimer and attributions (FR-12, MVP §9).
 * Shown in every state, outside the market data areas.
 *
 * - Disclaimer: approved wording (AC-12.1).
 * - TradingView: the attribution notice from the NOTICE file of
 *   lightweight-charts v5.3.0, with a link to tradingview.com (licence
 *   requirement, AC-12.2). The NOTICE file writes "(с)" with a Cyrillic "с";
 *   the Latin "(c)" from MVP §9 is used here.
 * - Binance: proposed wording "Market data: Binance". Final wording is OQ-26.
 * - A non-affiliation statement is not shown: OQ-12 is open.
 *
 * Links open in a new tab (IR-05).
 */
export function Footer() {
  return (
    <footer className="footer">
      <p className="footer__line">Educational purposes only. Not financial advice.</p>
      <p className="footer__line">Market data: Binance</p>
      <p className="footer__line">
        TradingView Lightweight Charts™ Copyright (c) 2025 TradingView, Inc.{' '}
        <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer">
          tradingview.com
        </a>
      </p>
    </footer>
  )
}
