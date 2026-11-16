# btcmtg

Educational Bitcoin market monitoring dashboard with real-time market data.

btcmtg (Bitcoin Monitoring) shows the BTC/USDT market on Binance Spot in a single, focused view. It is an educational, non-commercial project: it displays public market data only, provides no trading functionality and is not financial advice. It is not affiliated with Binance or TradingView.

## What it shows

- The current BTC/USDT price and its 24-hour change, as an amount and a percentage
- The 24-hour high and low
- The 24-hour volume in BTC and in USDT
- A candlestick chart with volume, for six timeframes: 1m, 5m, 15m, 1h, 4h and 1d
- Live updates, a connection status, and marks for data that is no longer current
- Clear messages when data can't be loaded, for example when the browser is offline or Binance can't be reached

The layout works on phones and desktops, and follows the system's light or dark setting. All times are shown in UTC.

## Data source

The browser reads Binance's public market data directly. There is no backend, and no API keys or accounts are used.

- REST API: `https://data-api.binance.vision`
- WebSocket streams: `wss://data-stream.binance.vision`

Binance restricts access in some regions. Where Binance can't be reached, the dashboard shows a notice instead of data.

## Development

Requires Node.js 26 (see `.node-version`) and npm.

```sh
npm ci            # install the exact dependency versions from package-lock.json
npm run dev       # start the development server
npm run lint      # check the code with oxlint
npm run build     # type-check and build the production site into dist/
npm run preview   # serve the production build locally
```

Built with React, TypeScript, Vite and TradingView Lightweight Charts. The production build is a static site, intended for Cloudflare Pages (see `docs/TECHNICAL_SPEC.md` §11).

## Documentation

- [`docs/PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md): purpose, scope and non-goals
- [`docs/MVP_REQUIREMENTS.md`](docs/MVP_REQUIREMENTS.md): requirements, acceptance criteria and open questions
- [`docs/TECHNICAL_SPEC.md`](docs/TECHNICAL_SPEC.md): architecture, Binance integration and deployment

## Third-party software

The copyright notices and licence texts of the third-party software included in the site are in [`public/licenses.txt`](public/licenses.txt), published at `/licenses.txt`. The Inter font's licence is in [`public/fonts/LICENSE.txt`](public/fonts/LICENSE.txt).
