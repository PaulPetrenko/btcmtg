# btcmtg — Project Brief

| | |
|---|---|
| **Status** | Draft v0.3 — awaiting approval |
| **Last updated** | 2026-11-10 |
| **Sprint** | Sprint 1 (documentation only) |

> **Educational purposes only. Not financial advice.** btcmtg displays public market data only. It does not support trading and is not affiliated with Binance or TradingView.

## How to read this document

Each statement in this brief carries one of these labels:

| Label | Meaning |
|---|---|
| **Approved** | Decided by the project owner. Changes only with explicit approval. |
| **Proposed** | Drafted for review, not yet approved. |
| **Assumption** | A working assumption that has not been confirmed. |
| **Open** | A question that still needs a decision. |
| **Deferred** | A decision intentionally postponed to a named point. |

## 1. Summary

btcmtg (Bitcoin Monitoring) is an educational web dashboard for observing the BTC/USDT market on Binance Spot. It runs entirely in the browser: it reads Binance's public REST API and WebSocket market data streams and draws charts with TradingView Lightweight Charts. It will be deployed publicly as a static site on Cloudflare Pages, with no backend and no database.

## 2. Purpose

btcmtg has two distinct educational dimensions.

### 2.1 For users — Approved

- btcmtg lets users observe the Bitcoin market and become familiar with market data through a concise, intuitive and convenient interface.
- The interface design will be informed by the project owner's professional experience as a Product Designer in FinTech.
- The product prioritizes clarity, usability, visual hierarchy and efficient presentation of market information.
- This purpose does **not** authorize tutorials, tooltips, interactive lessons or other educational UI features. Any such feature needs separate approval.

### 2.2 For the project owner — Approved

- btcmtg is also a practical learning experience in creating a software product with AI coding assistants, AI agents and vibe coding workflows.
- This dimension concerns the development process, not the product. It adds no product functionality.

## 3. Target audience — Approved

Users who want to observe the Bitcoin market and become familiar with market data (see §2.1).

## 4. Scope

### 4.1 Market and data — Approved

- Market: Binance Spot.
- Trading pair: BTC/USDT only.
- Data sources: Binance public REST API and public WebSocket market data streams.
- No API keys, user accounts or authenticated endpoints.
- **Deferred:** Specific hosts, endpoints and fallback strategy. These will be chosen only after the current official Binance documentation has been checked for CORS and regional access limitations, and will be recorded in `TECHNICAL_SPEC.md`.

### 4.2 Delivery scope — Approved

**Core MVP — required for the initial public release**

1. BTC/USDT current price
2. 24-hour price change, as both an absolute value and a percentage
3. 24-hour high and low
4. 24-hour trading volume in both BTC (base asset) and USDT (quote asset)
5. OHLCV candlestick chart with volume
6. Chart timeframes: 1m, 5m, 15m, 1h, 4h and 1d
7. Live updates using Binance public market data
8. Connection status and data freshness indicators
9. Responsive dashboard interface
10. Clear error states, including regional access restrictions
11. Compact footer with the disclaimer and the required data and chart attributions

**P1 — planned extension after the Core MVP**

- Recent trades feed

The Core MVP can be considered complete and publicly deployed without the P1 recent trades feed. P1 is a planned extension, not a release blocker.

Detailed behaviour and acceptance criteria for each item will be defined in `MVP_REQUIREMENTS.md`.

### 4.3 Notes on Core MVP items — Approved

- **Responsive interface:** the dashboard must work on both phone and desktop screens. Breakpoints and supported browsers will be specified in `MVP_REQUIREMENTS.md`.
- **Regional access restrictions:** if Binance data is unavailable because of regional restrictions, the app explains this clearly. No proxy or backend will be used to work around restrictions.
- **Footer:** contains
  - the text "Educational purposes only. Not financial advice."
  - attribution for Binance market data
  - attribution for TradingView Lightweight Charts, as required by its licence

  The exact attribution wording is deferred (see §8).

## 5. Out of scope

### 5.1 Excluded from the project — Approved

- Trading or order placement of any kind
- Wallets
- Portfolios
- User accounts
- AI predictions
- Trading signals

### 5.2 Excluded from the MVP — Approved

- A backend of any kind, including a proxy for Binance data and serverless functions such as Cloudflare Pages Functions
- A database or any server-side storage
- Order book. It may be reconsidered as a future feature, but it is not currently approved or planned.
- Technical indicators, including moving averages and RSI
- Educational UI features such as tutorials, tooltips or interactive lessons, unless separately approved
- Analytics or tracking
- Trading pairs other than BTC/USDT and markets other than Binance Spot

## 6. Constraints

### 6.1 Technology — Approved

| Area | Decision |
|---|---|
| Language | TypeScript |
| UI library | React |
| Build tool | Vite |
| Package manager | npm |
| Charts | TradingView Lightweight Charts |
| Styling | Plain CSS without a heavy UI framework. The exact CSS approach and theme are **deferred** and need approval. |
| Hosting | Cloudflare Pages (static site, publicly accessible) |
| Testing and code-quality tools | **Deferred.** Each tool needs approval before adoption. |
| Other libraries | None without approval. |

Exact versions will be recorded in `TECHNICAL_SPEC.md`.

### 6.2 Process — Approved

- Design first and documentation first: behaviour and design are documented and approved before code is written.
- Work is done in small, incremental tasks.
- Each task is approved by the project owner before implementation starts.
- Commits and pushes happen only with explicit approval.
- No new features, technologies or dependencies are introduced without explicit approval.
- Sprint 1 is documentation only: no application scaffold and no application source code.
- No separate sprint tracking system is used at this stage.

### 6.3 Repository — Approved

- The repository's current licence setting stays unchanged.

## 7. MVP success criteria — Proposed

The Core MVP is complete when:

1. Every Core MVP item in §4.2 works on the publicly deployed Cloudflare Pages site with live Binance public market data.
2. Price, 24-hour statistics and the chart update live without reloading the page.
3. The user can always tell whether the data on screen is live or stale.
4. When Binance data is unavailable, including because of regional restrictions, the user sees a clear error state instead of an empty or broken screen.
5. The interface is usable on both phone and desktop screens.
6. The footer shows the disclaimer and the required attributions.
7. The project owner has reviewed and approved the interface for clarity, usability and visual hierarchy.
8. Nothing listed in §5 has been introduced.
9. The documentation matches what was built.

The P1 recent trades feed is not part of these criteria. Measurable acceptance criteria will be defined in `MVP_REQUIREMENTS.md`.

## 8. Deferred decisions

| Decision | Deferred until |
|---|---|
| Binance hosts, endpoints and fallback strategy | Official documentation checked for CORS and regional limitations; recorded in `TECHNICAL_SPEC.md` |
| Testing and code-quality tools | Approval of each tool |
| CSS approach, theme and any additional libraries | Approval by the project owner |
| UI language, number and date formatting, time zone | `MVP_REQUIREMENTS.md` |
| Breakpoints and supported browsers | `MVP_REQUIREMENTS.md` |
| Full list of error states and the threshold for stale data | `MVP_REQUIREMENTS.md` |
| Exact wording and form of the Binance and TradingView attributions | Licence and terms review (R4); recorded in `MVP_REQUIREMENTS.md` |

## 9. Assumptions

| ID | Assumption | Impact if wrong |
|---|---|---|
| A1 | The MVP runs at no cost, on the Cloudflare Pages free plan with free public Binance data. | A paid plan or different hosting may be needed. |
| A2 | Project documentation is written in English. The UI language is a separate, deferred decision. | Documentation would need translating. |

## 10. Open questions

| ID | Question | To be resolved |
|---|---|---|
| Q1 | In what form will the UI design be produced and approved before implementation, for example wireframes in `MVP_REQUIREMENTS.md` or design files from the project owner? | Before `MVP_REQUIREMENTS.md` |

## 11. Risks

| ID | Risk | Mitigation |
|---|---|---|
| R1 | **Regional restrictions.** Binance blocks access from some countries and regions. Because the browser connects to Binance directly, viewers there will not receive data. | Clear error state (Core MVP). Exact behaviour to be verified against official Binance documentation. |
| R2 | **Browser access (CORS).** Direct browser requests only work if Binance's public endpoints allow cross-origin requests. Not yet verified. | Verify before `TECHNICAL_SPEC.md` is finalized. If browser access is not possible, revisit the approach with the project owner. |
| R3 | **API changes.** Binance can change endpoints, rate limits or connection rules. | Check the official documentation and changelog during implementation. Keep Binance-specific code in one place. |
| R4 | **Licence and terms.** The Lightweight Charts licence is understood to require attribution to TradingView, and Binance publishes terms for using its API data. | Footer attributions are approved for the Core MVP. Confirm the exact requirements for the adopted versions before public deployment. |
| R5 | **Rate limits.** Binance limits requests per IP address, and each viewer's browser counts separately. | Keep data loading well within limits; specify in `TECHNICAL_SPEC.md`. |
| R6 | **Delays and gaps.** Live data can be delayed or interrupted by network or Binance issues. | Connection status and data freshness indicators (Core MVP). |
| R7 | **Scope drift.** AI coding assistants may introduce features, dependencies or changes that were not requested. | Approval gates in §6.2; working rules for Claude Code in `CLAUDE.md`. |

## 12. Glossary

Documentation reference only; this is not UI content.

| Term | Meaning |
|---|---|
| BTC/USDT | The price of one bitcoin (BTC) quoted in Tether (USDT), a stablecoin designed to track the US dollar. |
| Base asset / quote asset | In BTC/USDT, BTC is the base asset (what is traded) and USDT is the quote asset (what the price is expressed in). |
| Binance Spot | Binance's spot market, where assets are bought and sold for immediate settlement, as opposed to futures. |
| OHLCV | Open, high, low and close prices plus traded volume for one time period. |
| Candlestick | A chart mark showing one period's open, high, low and close prices. |
| Timeframe | The length of time each candlestick covers, for example 1m (one minute) or 1d (one day). |
| 24-hour statistics | On Binance, the price change, high, low and volume over the rolling last 24 hours, not a calendar day. |
| Absolute / percentage change | The price change expressed in the quote asset (USDT) and as a percentage of the price at the start of the period. |
| Volume | The amount traded in a period, measured in the base asset (BTC) or the quote asset (USDT). |
| Recent trades | A list of the latest completed trades on the market. |
| REST API | A request-and-response interface for fetching data on demand. |
| WebSocket | A persistent connection over which the server pushes updates as they happen. |
| Data freshness | How recently the data on screen was last updated. |
| CORS | Cross-Origin Resource Sharing: browser rules that decide whether a web page may read data from another site's server. |
| Regional restriction | Binance blocking access from certain countries or regions. |
| Vibe coding | A development style in which the developer describes what they want in natural language and an AI assistant writes most of the code, with the developer guiding and reviewing the result. |

## 13. Related documents

| Document | Purpose | Status |
|---|---|---|
| `docs/PROJECT_BRIEF.md` | Why, scope and non-goals (this document) | Draft v0.3 |
| `docs/MVP_REQUIREMENTS.md` | What the MVP does: requirements, acceptance criteria, UI layout | Planned |
| `docs/TECHNICAL_SPEC.md` | How it is built: architecture, Binance integration, deployment | Planned |
| `CLAUDE.md` | Working rules for Claude Code in this repository | Planned |
| `README.md` | Public overview and getting started | Planned |

This brief is the reference for scope. If another document conflicts with it, the brief applies until the conflict is resolved with the project owner.

## 14. Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-11-10 | First draft for review. |
| 0.2 | 2026-11-10 | Defined the two educational dimensions. Finalized the Core MVP and P1 scope. Removed the order book from the MVP. Resolved the questions on volume units, price change format, disclaimer and attribution. Confirmed the target audience and public release. Added an open question on the UI design format, a scope-drift risk, and the deferred attribution wording. |
| 0.3 | 2026-11-10 | Wording corrections: §1 now describes deployment as future; §2.1 now says the design will be informed by the project owner's FinTech product design experience. |
