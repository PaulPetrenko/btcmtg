# btcmtg — Technical Specification

| | |
|---|---|
| **Status** | Approved v1.0 |
| **Last updated** | 2026-11-11 |
| **Sprint** | Sprint 1 (documentation only) |
| **Sources of truth** | `docs/PROJECT_BRIEF.md` v0.3, `docs/MVP_REQUIREMENTS.md` v1.0 |

## How to read this document

This document describes how btcmtg will be built. It implements `MVP_REQUIREMENTS.md` and does not change it. Requirements are referenced by ID (for example FR-05 or MVP §5.3), not repeated. If this document conflicts with the brief or the MVP requirements, those documents apply. Visual design is out of scope; it belongs to the project owner (MVP §1.3).

Labels are the same as in the MVP requirements: **Approved**, **Proposed**, **Open**, **Deferred** and **Informative**. Technical decisions have IDs (`TD-xx`). On 2026-11-11 the project owner approved TD-01 to TD-03 and TD-05 to TD-13, and declined TD-04 (§14.1).

Approving this document doesn't change any item's label. Items labelled Proposed, Open or Deferred keep that status until the project owner decides them.

## 1. Approved technical constraints

These come from the brief (§5, §6) and MVP requirements v1.0. This document does not reopen them.

- A static web app that runs entirely in the browser. No backend, proxy, serverless functions (including Cloudflare Pages Functions), database or server-side storage.
- TypeScript, React, Vite, npm and TradingView Lightweight Charts. Plain CSS without a heavy UI framework.
- No other libraries, testing tools or code-quality tools without the project owner's approval.
- Hosted on Cloudflare Pages, with the code on GitHub.
- Binance Spot BTC/USDT, using public REST and WebSocket data only. No API keys, accounts or authenticated endpoints.
- No analytics or tracking. Non-commercial (MVP §1.5).
- Data behaviour fixed by the MVP requirements:
  - six timeframes, with 1h as the default (FR-06)
  - the 500 most recent candles per timeframe, with candle volume in BTC (FR-05)
  - UTC everywhere, clearly indicated, with daily candles starting at 00:00 UTC (MVP §5.4)
  - a 10-second stale threshold (MVP §7.2)
  - one global status indicator plus local indicators for data groups (MVP §7.4)
  - candle data integrity (MVP §5.3)

## 2. Architecture

### 2.1 Overview — Informative

```text
Cloudflare Pages ── serves the built files (HTML, JS, CSS) ──> Browser

Inside the browser:
  src/binance ── REST: plain HTTPS GET ──> data-api.binance.vision
              ── WebSocket ─────────────> data-stream.binance.vision
  src/market  ── combines REST and WebSocket data into one state
  React UI    ── reads that state and renders it
  Chart       ── receives candle data directly from src/market
```

### 2.2 Project structure — Approved (TD-02)

```text
btcmtg/
├─ docs/                    existing documentation
├─ public/                  static files copied as-is (favicon)
├─ src/
│  ├─ main.tsx              entry point: starts the market feed, renders <App>
│  ├─ App.tsx               page layout (regions from W-01 / W-02)
│  ├─ config.ts             hosts, symbol, timeframes, thresholds
│  ├─ format.ts             number and UTC time formatting
│  ├─ binance/
│  │  ├─ rest.ts            REST requests, parsing, error classification
│  │  ├─ stream.ts          WebSocket connection, subscriptions, reconnection
│  │  └─ types.ts           Binance payload types and app data types
│  ├─ market/
│  │  ├─ feed.ts            combines REST and stream; state snapshot; freshness timer
│  │  ├─ candles.ts         pure functions: merge, update, gap detection
│  │  └─ useMarket.ts       React hook (useSyncExternalStore)
│  ├─ components/           Status, PriceBlock, Stats, TimeframeSelector,
│  │                        Chart, Notice, Footer (one .css file each)
│  └─ styles/               tokens.css, global.css
├─ index.html
├─ package.json, package-lock.json
├─ tsconfig.json, tsconfig.app.json, tsconfig.node.json
├─ vite.config.ts, .oxlintrc.json, .node-version
└─ .gitignore, README.md
```

Rules:

- Only `src/binance` knows Binance URLs and payload formats (brief R3).
- Components never call Binance directly. They read state from `src/market`.
- `candles.ts` contains only pure functions (no network, no React), so the MVP §5.3 rules are easy to read and check.

## 3. Setup and tooling

### 3.1 Versions — Approved (TD-01, TD-02, TD-03, TD-10)

The version numbers were checked on the npm registry on 2026-11-11 (**Informative**). `package-lock.json` pins the exact patch versions at setup.

| Item | Version | Approved by | Notes |
|---|---|---|---|
| Node.js | 26 LTS | TD-01 | Current Active LTS, already installed on the development machine. Vite 8 needs Node 20.19+ or 22.12+ (**Informative**). Pinned with a `.node-version` file, which Cloudflare Pages also reads. |
| npm | 11.x (bundled with Node) | TD-01 | `package-lock.json` is committed. |
| React, React DOM | 19.3 | TD-02 | From the Vite template. |
| Vite, @vitejs/plugin-react | 8.3, 6.x | TD-02 | From the Vite template. |
| TypeScript | 7.0 | TD-02 | From the Vite template. |
| lightweight-charts | 5.3.x | Library: brief §6.1. Version: TD-10 | The only runtime dependency added to the template. |
| oxlint | 1.x | TD-03 | The template's linter. |
| @types/react, @types/react-dom, @types/node | From the template | TD-02 | Type definitions only. |

### 3.2 Scaffold — Approved (TD-02)

- Create the app from the official Vite template (`npm create vite@latest`, template `react-ts`) inside the existing repository. Keep `docs/`, `README.md` and `.gitignore`.
- Remove the template's demo content: sample images, the demo `App` and the demo CSS.
- TypeScript: keep the template settings and add `"strict": true` explicitly. The template enables `erasableSyntaxOnly`, so use string union types instead of `enum`.
- npm scripts from the template:
  - `dev`: development server
  - `build`: type check and production build
  - `lint`: oxlint
  - `preview`: serve the production build locally

### 3.3 Tooling — Approved (TD-03); TD-04 declined

- **TD-03:** keep **oxlint**, the template's default linter. It's one fast dev dependency, and its React "rules of hooks" check catches a common class of React bugs. No ESLint, no Prettier.
- **TD-04 declined (2026-11-11):** no Vitest and no other testing dependency. The candle rules (§6, MVP §5.3) are checked manually through AC-05.3 and AC-05.4.
- No other dependencies:
  - Formatting uses the browser's built-in `Intl`.
  - Data validation is hand-written.
  - No state, CSS or HTTP library.

## 4. Binance REST API

### 4.1 Host — Approved (TD-05)

`https://data-api.binance.vision`, with no fallback host.

- Binance provides this host for public market data only, and it worked from a real browser (V-05, §13).
- A fallback to `api.binance.com` isn't needed for the MVP. Both hosts serve the same data, and the most likely failure, a regional block, is expected to affect both. A fallback would add code paths that are hard to test.
- The host is a single constant in `src/config.ts`, so switching later is a one-line change.

### 4.2 Endpoints — Approved (used by TD-07 and TD-09)

| Purpose | Request | Weight | When |
|---|---|---|---|
| 24h statistics (DG-1) | `GET /api/v3/ticker/24hr?symbol=BTCUSDT` | 2 | Once at page load, so the first values appear quickly. After that, values come from the WebSocket. |
| Candle history (DG-2) | `GET /api/v3/klines?symbol=BTCUSDT&interval=<tf>&limit=500` | 2 | Whenever a timeframe is loaded: at page load, after a timeframe change and after reconnection. |

- `interval` is one of `1m`, `5m`, `15m`, `1h`, `4h`, `1d`. No `timeZone` parameter is sent, because Binance's default UTC boundaries match the approved daily-candle decision (OQ-24).
- Fields used (**Informative**):
  - 24h statistics: `lastPrice`, `priceChange`, `priceChangePercent`, `highPrice`, `lowPrice`, `volume` (BTC) and `quoteVolume` (USDT).
  - Candles: array position 0 (open time, in ms), positions 1–4 (open, high, low, close) and position 5 (volume, in BTC).

### 4.3 Request rules — Approved (TD-05, TD-07, TD-09)

- Use plain `fetch` GET requests with no custom headers. A custom header makes the browser send a preflight check first, and `data-api.binance.vision` rejects those (command-line test, 2026-11-10).
- Each candle request can be cancelled with an `AbortController` (§6.4).
- Binance sends numbers as strings. They're converted with `Number()` and checked with `Number.isFinite`. A response that fails these checks is treated as E-05.

### 4.4 Rate limits — Approved (TD-09)

- **Budget (Informative):** page load costs a request weight of 4. Each timeframe change or reconnection costs 2. Twenty timeframe changes in one minute cost about 44, well under NFR-08's target of 600 (10% of 6000; Proposed in the MVP).
- **Usage tracking:** the used-weight response header can't be read from browser JavaScript (V-05), so the app can't track its own usage. At this request volume it doesn't need to. For AC-N8.1, the header is read in the DevTools Network tab, which shows every header.
- **Rate-limit responses:** if Binance answers with HTTP 429 or 418 and the status is readable, the app shows E-04 and pauses REST requests for 60 seconds. The app does not assume it can read the `Retry-After` header.

## 5. Binance WebSocket

### 5.1 Host and streams — Approved (TD-06)

- **URL:** `wss://data-stream.binance.vision/stream?streams=btcusdt@ticker/btcusdt@kline_<tf>`. This is the combined-stream format: each message is `{ "stream": ..., "data": ... }`.
- **24h statistics (DG-1):** the `btcusdt@ticker` stream. It includes Binance's own change values, so nothing is recalculated (MVP §2.3). The smaller `@miniTicker` stream doesn't include them.
- **Candles (DG-2):** the `btcusdt@kline_<tf>` stream, for the selected timeframe only.
- **One connection** carries both streams. This was verified in Chrome (V-05).

### 5.2 Timeframe changes — Approved (TD-06)

- **Switching:** the connection stays open. The app sends `SUBSCRIBE` for the new candle stream, then `UNSUBSCRIBE` for the old one. Runtime subscription was verified in Chrome.
- **One switch per second at most:** Binance accepts at most 5 messages per second from the browser on each connection. A switch sends 2 messages, so applying at most one switch per second keeps a safe margin.
- **Latest selection only:** the app remembers only the most recently selected timeframe. If the user changes the selection several times within a second, only that latest timeframe is subscribed when the next switch is allowed.
- **Late messages:** each candle message carries its interval (`k.i`). Messages for any timeframe other than the selected one are ignored, so a late message from the old stream never reaches the chart.
- **Rejected alternative:** subscribing to all six candle streams at once would avoid subscription changes, but it receives about 2.5 times more data. That matters on a phone with the tab left open.

### 5.3 Connection lifecycle — Approved (TD-09)

- **Ping/pong:** Binance pings every 20 seconds, and browsers answer automatically. Nothing to implement.
- **Closures:** Binance closes connections after at most 24 hours, and sometimes earlier. Every unexpected close goes through normal reconnection (§8.3), so no 24-hour timer is needed.
- **Shutdown notice:** if a `serverShutdown` event arrives, the app reconnects immediately. Its exact message shape is checked during implementation.
- **Watchdog:** the ticker stream sends a message every second. If an open connection receives nothing for 10 seconds, the app closes it and reconnects.
- **Connect timeout:** a connection that hasn't opened within 10 seconds counts as a failed attempt.

## 6. Candles: loading, live updates and gaps — Approved (TD-07)

### 6.1 Loading a timeframe

The same steps run at page load, after a timeframe change and after reconnection:

1. Subscribe to the timeframe's candle stream (at most one switch per second, §5.2) and buffer its messages.
2. Request the 500 most recent candles over REST.
3. When they arrive, apply the buffered messages. A message with the same open time as an existing candle replaces it, a newer one is appended, and an older one is dropped.
4. Send the full candle list to the chart (`setData`), then switch to live updates.

Buffering the stream's messages while the history loads means no update is lost between the two.

### 6.2 Live updates

For each candle message of the selected timeframe:

- **Same open time as the last candle:** replace it. This is the current period's candle updating.
- **The next period:** append it.
- **Older:** ignore it.
- **More than one period after the last candle:** reload the timeframe (§6.1). This handles missed messages and source gaps the same way.

Candle durations are fixed (1m to 1d), so the next period starts at the last open time plus the timeframe's length.

### 6.3 Gaps (MVP §5.3)

- **After reconnection:** the timeframe is reloaded (§6.1) and the chart's candle data is replaced.
  - Missed candles within the latest 500 periods come back from Binance.
  - Older candles collected during a long session drop out of view, so no hole is left.
  - No candle is ever invented.
- **Source gaps:** when Binance has no candle for a period, the chart shows an empty slot, using Lightweight Charts "whitespace" points (a time with no values). Without them, the chart would draw the candles on either side next to each other and hide the gap. This settles the representation question deferred from MVP §19.3.
- **Zero-volume candles** are real Binance candles and are drawn as received.

### 6.4 Timeframe changes and stale responses

- Each load gets an increasing load number. A response that doesn't carry the latest number is discarded, and the previous request is cancelled with its `AbortController`.
- WebSocket messages for other timeframes are ignored (§5.2).
- A new selection takes effect in the interface immediately, and only data for the latest selection reaches the chart (FR-06, AC-06.3).

## 7. Browser state — Approved (TD-08), except storage (Proposed)

- One plain TypeScript module, `src/market/feed.ts`, owns the REST requests, the WebSocket connection and the freshness timer. It keeps a read-only snapshot of the current state.
- React components read the snapshot through React's built-in `useSyncExternalStore` hook (`src/market/useMarket.ts`). No state library is needed.
- **Chart data:** it doesn't go through React state. `feed.ts` sends the chart component two kinds of notice, "replace all candles" and "update one candle". These map directly to Lightweight Charts' `setData` and `update`, so React doesn't re-render every 2 seconds for chart data.
- **Startup:** the feed starts once in `main.tsx`, outside React. This avoids duplicate connections caused by React running effects twice in development mode.
- **Timeframe storage — Proposed while OQ-28 is open:** the current recommendation is to keep the selected timeframe in memory only, without saving it in the browser. This doesn't decide OQ-28 (cookies, browser storage, personal data), which stays open until implementation.

Snapshot shape (**Informative** sketch):

```ts
type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
type Connection = 'connecting' | 'live' | 'reconnecting' | 'offline' | 'unavailable'; // ST-01 to ST-05

interface GroupState {
  status: 'loading' | 'ready' | 'error';
  lastUpdate: number | null; // when the browser last received data (ms)
  stale: boolean;            // MVP §7.2: 10 s without an update
  error: 'E-05' | 'E-06' | null;
}

interface MarketSnapshot {
  connection: Connection;
  pageError: 'E-01' | 'E-02' | 'E-03' | 'E-04' | null;
  timeframe: Timeframe;
  stats: Stats24h | null;   // DG-1 values, already parsed
  statsGroup: GroupState;
  candlesGroup: GroupState; // DG-2 status; the candles go straight to the chart
}
```

## 8. Connection status, freshness and errors — Approved (TD-09)

### 8.1 Connection states (FR-08, ST-01 to ST-05)

| State | Entered when |
|---|---|
| ST-01 Connecting | The page loads, until the first data arrives. |
| ST-02 Live | The WebSocket is open and messages are arriving. |
| ST-03 Reconnecting | The WebSocket closed unexpectedly while the browser is online. |
| ST-04 Offline | The browser reports no network (`navigator.onLine`, `offline` event). |
| ST-05 Unavailable | Three connection attempts in a row failed, or all initial requests failed. Retries continue every 30 seconds, and the next success returns to Live. |

### 8.2 Freshness

- **Marking stale:** each group records when its data last arrived. A one-second timer marks DG-1 and DG-2 stale after 10 seconds without an update, as approved in MVP §7.2, and clears the mark when data arrives.
- **Same thresholds in every state:** Reconnecting and Offline don't mark data stale any earlier.
- **Last update:** the global "last update" time is the more recent of the two groups' times. Its display format is OQ-29.

### 8.3 Reconnection

- **Retry delays:** 1, 2, 4, 8 and 16 seconds, then 30 seconds, each plus a random 0–1 second. The sequence resets after a successful connection.
- **Attempt count:** a long outage causes at most about 10 attempts per 5 minutes, far below Binance's limit of 300 (MVP §2.4).
- **Immediate reconnection, without waiting,** in three cases:
  - the browser fires its `online` event
  - the page becomes visible again (`visibilitychange`) while the connection is closed
  - a `serverShutdown` event arrives
- **After reconnecting:** the ticker stream refreshes DG-1 within a second, and the candles are reloaded (§6.3).
- **Failed candle requests:** retried with the same delays. After 3 failures, the chart shows E-06 while retries continue.

### 8.4 Error mapping

| What happens | What is shown |
|---|---|
| The browser is offline | ST-04 and E-02 |
| REST returns HTTP 451 and the status is readable | E-01 (whole page) |
| REST returns HTTP 429 or 418 and the status is readable | E-04 (whole page); REST paused for 60 s |
| A response is invalid or unexpected | E-05 in that group's area |
| One group fails while the other works, for example candles fail while the ticker stays live | E-06 in that group's area (W-03d) |
| Everything fails while online: network errors, 403, 5xx, or the WebSocket can't connect | ST-05 and E-03 |

DG-1 has two sources: the REST request at load and the ticker stream. It only counts as failed if both fail.

### 8.5 Regional restrictions (MVP §8.3)

- **When E-01 appears:** only for a readable HTTP 451 from REST.
- **Why that's rare:** error responses may lack the headers browsers need to read them, and a failed WebSocket connection never exposes a status code.
- **What users usually see:** a restriction will usually appear as E-03, which already names regional restriction as a possible cause. Real behaviour from a restricted location remains unknown (V-04).
- **No workaround:** the app never switches to another host to get around a block.

## 9. Chart integration — Approved (TD-10)

- **Series:** `lightweight-charts` 5.3, with one candlestick series and one histogram series for volume (in BTC), sharing the time axis (FR-05). The library supports volume either under the candles or in a separate pane. Which one is used is a visual design choice.
- **Data mapping:**
  - Time is the Binance open time divided by 1000, which gives seconds in UTC.
  - Open, high, low and close come straight from the candle.
  - The volume value is the base-asset volume, and the histogram uses `priceFormat: { type: 'volume' }`.
- **UTC:** the library doesn't convert time zones. It shows the timestamps it receives, and those are UTC (**Informative**, from the library's documentation). Time labels can be formatted through the chart's localization options. How UTC is indicated on screen is a visual design decision (MVP §5.4).
- **Updates:** `setData` for a full load and `update` for live candles (§6.2). `update` only accepts the last candle or a newer one, which matches §6.2.
- **Size:** `autoSize: true`, so the chart follows the size of its container (§10).
- **Interactions:** the library's defaults (crosshair, scrolling, zooming) stay until OQ-06 is decided. Each can be switched off with an option.
- **Attribution:** the footer shows the text from the library's `NOTICE` file and a link to tradingview.com (FR-12, AC-12.2). Whether to keep the on-chart logo (`layout.attributionLogo`) is OQ-25.

## 10. Responsive layout, styling and formatting

### 10.1 Constraints from the MVP requirements

These keep the status they have in the MVP requirements.

- **Layouts:** phone and desktop (FR-10, Approved). Breakpoints and the minimum width come from the visual design (OQ-17).
- **Behaviour:** no horizontal page scrolling, a chart usable by touch, and both portrait and landscape (MVP §10, Proposed).
- **Chart height:** the chart needs a container with a defined height. The visual design sets it for each layout.
- **Accessibility (NFR-04, IR-06, Proposed):**
  - Key figures are text outside the chart.
  - Interactive elements are native buttons and links, reachable by keyboard.
  - Any motion respects `prefers-reduced-motion`.

### 10.2 CSS organization — Approved (TD-11)

- **`src/styles/tokens.css`:** CSS custom properties (colours, spacing, type sizes), filled in from the project owner's visual design.
- **`src/styles/global.css`:** base styles and page layout.
- **Component styles:** one plain `.css` file per component, imported by that component. Class names start with the component name (`.price-block`, `.price-block__value`) to avoid clashes.
- **Media queries:** mobile-first.
- **Why this approach:** it is plain CSS, it maps directly from a visual design and needs no extra tooling. CSS Modules would also work, but they aren't needed for about eight components.
- **Fonts:** system fonts, unless the visual design specifies one. In that case the font is self-hosted (NFR-06, Proposed: no third-party requests).

### 10.3 Formatting

- `src/format.ts` uses the browser's built-in `Intl.NumberFormat` and `Intl.DateTimeFormat`, so no formatting library is added (§3.3).
- Times use `timeZone: 'UTC'` (MVP §5.4, Approved).
- Price and 24h change use 2 decimal places (FR-01 and FR-02, Proposed in the MVP).
- Volume format follows OQ-08, and the locale follows OQ-15. Each is one setting in `format.ts`.

## 11. Deployment: Cloudflare Pages from GitHub — Approved (TD-12)

| Setting | Value |
|---|---|
| Connection | Cloudflare Pages Git integration with the GitHub repository |
| Production branch | `main` |
| Preview deployments | Automatic for other branches and pull requests |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js version | From `.node-version` (`26`) |
| Environment variables and secrets | None |
| Functions | None (brief §5.2) |

- **No redirect rules:** the app is a single page without client-side routing.
- **Cloudflare account:** the project owner creates the Cloudflare project and connects the repository. Nothing in the repository depends on a Cloudflare account.
- **Deferred:**
  - a custom domain (project owner's decision)
  - security headers through a `_headers` file, for example a Content Security Policy that allows only Binance's hosts. To be considered after the first working deployment.

## 12. Verification and testing — Approved (TD-13)

### 12.1 Automated checks

- `npm run build`: type check and production build. Must pass before every commit.
- `npm run lint`: oxlint (TD-03).
- No unit-test framework: TD-04 was declined.

### 12.2 Manual checks

- **Acceptance criteria:** checked as described in MVP §16, on a Cloudflare Pages preview deployment.
- **DevTools:**
  - offline mode and network throttling for the connection states
  - request blocking for E-03 and E-06
  - the Network tab for AC-N6.1 (requests go only to Binance and the site's own origin) and AC-N8.1 (the used-weight header)
- **E-01 and E-04:** these can't be triggered safely against Binance. A development-only URL switch forces those code paths: `?simulate=regional`, `?simulate=rate-limit` or `?simulate=unavailable`. It exists only in `npm run dev` builds and is removed from production builds.
  - This is the verification method for AC-11.7.
  - It is also how the E-01 and E-03 code paths are tested. OQ-22 itself stays Open in the MVP requirements, because real behaviour from a restricted location can't be verified (V-04).

### 12.3 Supported browsers — Approved (OQ-18, 2026-11-11)

- **Supported:** the latest two major versions of Chrome, Edge, Firefox and Safari (desktop and mobile), plus Chrome for Android. Vite's default build target covers these.
- **Tested before release:** Chrome on desktop, Firefox on desktop and Safari on an iPhone.

### 12.4 Performance targets — Approved (OQ-20, 2026-11-11)

- **First data:** the price appears within 3 seconds of opening the page, measured on a cold load with Chrome DevTools "Fast 4G" throttling.
- **JavaScript size:** the total JavaScript bundle is below 200 KB gzipped. `vite build` prints the sizes.
- **Unchanged checks:** NFR-01's 200 ms long-task limit and NFR-02's 24-hour session check stay as defined in the MVP requirements.

## 13. Verification status

| ID | Item | Status |
|---|---|---|
| V-05 | Cross-origin access from a real browser | **Verified in Google Chrome on 2026-11-11** (details below). Other browsers are checked under AC-N5.1. |
| V-03 | Whether the Binance Vision terms apply to the market-data-only hosts | Unresolved, not blocking. btcmtg is non-commercial (MVP §1.5), and the attribution wording follows OQ-26 before release. |
| V-01, V-02 | Binance Terms of Use; list of prohibited countries | Manual review before release (MVP §19.4). |
| V-04 | Behaviour from restricted locations | Unknown; handled as described in §8.5. |

V-05 results. The test ran in Chrome from an `about:blank` page, so every request was cross-origin.

- **REST, `data-api.binance.vision`:**
  - BTC/USDT 24h statistics returned HTTP 200.
  - 1h candles with `limit=500` returned HTTP 200 with 500 candles.
  - A plain GET request succeeded.
- **REST, `api.binance.com`:** the same two requests returned HTTP 200.
- **Rate-limit header:** the `x-mbx-used-weight-1m` header was not readable from JavaScript (`null`).
- **WebSocket, `wss://data-stream.binance.vision/stream`:**
  - It connected, and `btcusdt@ticker` and `btcusdt@kline_1h` messages arrived.
  - A runtime `SUBSCRIBE` to `btcusdt@kline_5m` was acknowledged, and that stream's messages arrived.
  - The close and error messages afterwards came from the test deliberately closing the connection after 10 messages.
- **Deployed site:** its own origin is checked again on the first preview deployment, as part of the normal acceptance checks.

## 14. Decisions, open questions and deferred items

### 14.1 Technical decisions

| ID | Decision | Status | Section |
|---|---|---|---|
| TD-01 | Node.js 26 LTS and npm; `package-lock.json` committed | Approved 2026-11-11 | §3.1 |
| TD-02 | Official Vite React + TypeScript template with demo content removed and `strict` on; project structure as in §2.2 | Approved 2026-11-11 | §2.2, §3.2 |
| TD-03 | Keep oxlint (the template's default); no ESLint or Prettier | Approved 2026-11-11 | §3.3 |
| TD-04 | Vitest for unit tests of the candle logic | **Declined** 2026-11-11 | §3.3 |
| TD-05 | REST host `data-api.binance.vision`, no fallback host | Approved 2026-11-11 | §4.1 |
| TD-06 | WebSocket host `data-stream.binance.vision`; `@ticker` plus one `@kline_<tf>` stream; switch timeframes with SUBSCRIBE/UNSUBSCRIBE, at most once per second, latest selection only | Approved 2026-11-11 | §5.1, §5.2 |
| TD-07 | Candle loading order, live update rules, reload after reconnection, whitespace points for source gaps, stale-response guard | Approved 2026-11-11 | §6 |
| TD-08 | One feed module plus `useSyncExternalStore`; chart fed directly; no state library | Approved 2026-11-11 (the storage point stays Proposed, §7) | §7 |
| TD-09 | Connection states, 10 s watchdog, reconnection delays, error mapping | Approved 2026-11-11 | §5.3, §8 |
| TD-10 | Lightweight Charts 5.3 integration | Approved 2026-11-11 | §3.1, §9 |
| TD-11 | Plain CSS: tokens file, global file, one file per component | Approved 2026-11-11 | §10.2 |
| TD-12 | Cloudflare Pages Git integration settings | Approved 2026-11-11 | §11 |
| TD-13 | Verification approach, including the development-only error simulation | Approved 2026-11-11 | §12 |

### 14.2 MVP open questions addressed here

| ID | Status | Outcome | Section |
|---|---|---|---|
| OQ-18 | **Approved** 2026-11-11 | Latest two major versions of Chrome, Edge, Firefox and Safari (desktop and mobile), plus Chrome for Android. Tested before release in desktop Chrome, desktop Firefox and Safari on iPhone. | §12.3 |
| OQ-20 | **Approved** 2026-11-11 | First data within 3 s under Fast 4G; total JavaScript bundle below 200 KB gzipped. | §12.4 |
| OQ-22 | **Open** | TD-13's simulation is the approved way to test the E-01 and E-03 code paths. Real behaviour from a restricted location stays unverified (V-04). | §12.2 |

MVP §19.2 also records OQ-18 and OQ-20 as resolved, with a reference to this document.

This document also settles three items the MVP requirements left to it:
- the AC-11.7 verification method (TD-13, §12.2)
- how source gaps are represented (TD-07, §6.3)
- Binance hosts, endpoints, streams and reconnection timing (TD-05, TD-06, TD-09)

### 14.3 Still open

These questions are owned by the visual design or the MVP requirements. This document only notes where each one plugs in:

OQ-03, OQ-06, OQ-08, OQ-11, OQ-12, OQ-13, OQ-14, OQ-15, OQ-17, OQ-19, OQ-21, OQ-22, OQ-25, OQ-26, OQ-28 (browser storage, §7), OQ-29.

### 14.4 Deferred to implementation

- Exact patch versions, pinned in `package-lock.json` at setup.
- The exact shape of the `serverShutdown` message.
- Node 26 on the Cloudflare build image: confirmed on the first deployment.
- Custom domain and security headers (§11).
- **P1 recent trades — Proposed default:** the `btcusdt@aggTrade` stream plus `GET /api/v3/aggTrades` (weight 4), confirmed when P1 starts. Aggregated trades merge the fills of one order at one price, so there are fewer messages with the same price, amount and time fields.

## 15. Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-11-11 | First draft for review. |
| 1.0 | 2026-11-11 | TD-01 to TD-03 and TD-05 to TD-13 approved; TD-04 (Vitest) declined. OQ-18 and OQ-20 approved. Lightweight Charts 5.3 labelled as approved through TD-10. Timeframe switches limited to one per second, latest selection only. Timeframe storage kept Proposed while OQ-28 is open. |
