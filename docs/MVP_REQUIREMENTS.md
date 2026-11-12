# btcmtg — MVP Requirements

| | |
|---|---|
| **Status** | Approved v1.0 |
| **Last updated** | 2026-11-11 |
| **Sprint** | Sprint 1 (documentation only) |
| **Scope source** | `docs/PROJECT_BRIEF.md` v0.3 |

> **Educational purposes only. Not financial advice.**

## How to read this document

`docs/PROJECT_BRIEF.md` is the authoritative source for product scope. This document describes how the approved scope behaves. It adds no scope. If the two documents conflict, the brief applies until the conflict is resolved with the project owner.

Approving this document (v1.0) does not change the label of any item. Items labelled Proposed, Open or Deferred keep that status until the project owner decides them.

| Label | Meaning |
|---|---|
| **Approved** | Approved in the project brief or by the project owner. Changes only with explicit approval. |
| **Proposed** | Drafted for review, not yet approved. |
| **Open** | Needs a decision (see §19). |
| **Deferred** | Postponed to a named document or point. |
| **Informative** | Background fact from research. Not a requirement. |

| ID prefix | Used for |
|---|---|
| `FR-xx` | Core MVP functional requirements |
| `FR-P1-xx` | P1 functional requirements |
| `NFR-xx` | Non-functional requirements |
| `DG-x` | Data groups |
| `ST-xx` | Connection states |
| `E-xx` | Error states |
| `IR-xx` | Interaction requirements |
| `W-xx` | Wireframes |
| `AC-xx.y` | Acceptance criteria (`AC-05.2` = second criterion for FR-05; `AC-N1.1` for NFR-01; `AC-P1.1` for FR-P1-01) |
| `OQ-xx` | Open questions |
| `V-xx` | Items needing manual verification |

## 1. Product definition and MVP boundaries

### 1.1 Product definition — Approved

btcmtg is a browser-only dashboard for observing the BTC/USDT market on Binance Spot using Binance public market data. It lets users observe the Bitcoin market and become familiar with market data through a concise, intuitive and convenient interface that prioritizes clarity, usability, visual hierarchy and efficient presentation of market information. It has no backend and no database.

### 1.2 Release tiers — Approved

| Tier | Requirements | Role |
|---|---|---|
| Core MVP | FR-01 to FR-12 | Required for the initial public release |
| P1 | FR-P1-01 Recent trades feed | Planned extension after the Core MVP; not a release blocker |

The order book is not part of the MVP and is not currently approved or planned (brief §5.2).

### 1.3 Design process — Approved

1. This document contains the functional structure and low-fidelity wireframes.
2. Wireframes describe layout, information hierarchy, components and interactions. They are not final visual designs.
3. The project owner is responsible for the final visual design, applying professional FinTech Product Design experience.
4. The final visual design must be reviewed and explicitly approved by the project owner before UI implementation begins.
5. Claude Code must not independently finalize the visual design or start implementing UI based only on its own wireframes.

Sprint 1 is documentation only. Any implementation of a non-UI data layer after Sprint 1 requires an approved `TECHNICAL_SPEC.md` and the project owner's explicit approval before work starts.

### 1.4 What this document does not decide

- **Visual design** (colour, typography, spacing, iconography, motion, visual style): the project owner.
- **Technical design** (hosts, endpoints, streams, libraries, architecture): **Deferred** to `TECHNICAL_SPEC.md`.
- **Final interface copy:** draft copy here is **Proposed**; the project owner approves the final wording.

### 1.5 Non-commercial status — Approved (OQ-27, 2026-11-10)

- Under the current approach of using Binance public market data, btcmtg is a non-commercial, non-monetized project. The current version does not generate revenue.
- No advertising, paid features, subscriptions or other monetization mechanisms will be introduced.
- Use of Binance public market data is limited to this non-commercial version of the project.
- If the project owner decides to commercialize btcmtg in the future, paid API providers whose licences and terms explicitly permit commercial product use will be evaluated first.
- Any future commercialization requires a separate review of data licensing, API providers, architecture, technical specifications and product requirements.
- This decision applies to the current project scope. It does not rule out future commercialization under a different data provider and an appropriately reviewed commercial arrangement.

**Informative:** The Binance Vision Dataset Terms permit use in "non-monetized open educational projects". Whether those terms apply to the hosts btcmtg will use is not yet verified (V-03). This decision therefore does not by itself complete the licence and terms review (§17).

## 2. Supported market and data scope

### 2.1 Market and data — Approved

- Market: Binance Spot, BTC/USDT only.
- Sources: Binance public REST API and public WebSocket market data streams.
- No API keys, user accounts or authenticated endpoints.
- Use of Binance public market data is limited to the current non-commercial version of btcmtg (§1.5).
- Hosts, endpoints and fallback strategy: **Deferred** to `TECHNICAL_SPEC.md`.

### 2.2 Data groups — Proposed

| Group | Contents | Tier |
|---|---|---|
| DG-1 24h statistics | Current price, 24h change (absolute and %), 24h high and low, 24h volume (BTC and USDT) | Core MVP |
| DG-2 Candles | OHLCV candles for the selected timeframe: recent history plus live updates | Core MVP |
| DG-3 Trades | Most recent individual trades | P1 |

Freshness and error handling are defined per group (§7, §8), because groups can fail or become stale independently (§2.4).

### 2.3 Data definitions — Proposed

- **Current price:** the last traded price reported by Binance.
- **24h statistics:** values computed by Binance over a rolling 24-hour window ending now, not a calendar day. btcmtg displays Binance's values and does not recalculate them.
- **24h change:** the last price minus the price at the start of the window. The percentage is relative to that starting price.
- **Candle:** one Binance candle (kline) for one period of the selected timeframe, with open, high, low, close and volume.
- **Candle volume unit:** BTC (base asset). **Approved** (OQ-23, 2026-11-11)

### 2.4 Source facts relevant to requirements — Informative

Checked on 2026-11-10. Sources are listed in §20.

| Topic | Fact |
|---|---|
| 24h statistics updates | Binance publishes live 24h statistics every 1000 ms (documented and measured). |
| Candle updates | Binance publishes live candle updates every 2000 ms for 1m–1d timeframes. Each update states whether the candle is closed (documented and measured). |
| Trades | Published in real time. A 13-second sample showed an average gap of about 0.1 s and a longest gap of 1.4 s. |
| History | One request returns up to 1000 candles (default 500). Candles are identified by their open time. |
| Candle boundaries | UTC by default; a time-zone offset can be requested. |
| Connections | A streaming connection lasts at most 24 hours and may be closed earlier. Binance may send a shutdown notice before closing. |
| Rate limits | 6000 request weight per minute per IP. Candle-history and 24h-statistics requests cost 2 each. 300 connection attempts per 5 minutes per IP. |
| Precision | BTC/USDT price tick 0.01 USDT; quantity step 0.00001 BTC. Binance publishes the 24h percentage change with 3 decimals. |
| Browser access | Binance's public REST responses allow cross-origin reads. Not documented by Binance. Confirmed by command-line tests only; real-browser verification is outstanding (V-05). |
| Regional restriction | Binance restricts its services in some locations. How public market data endpoints respond there is not documented (V-01, V-02, V-04). |
| Periods without trades | Not documented by Binance. Community reports: Binance creates zero-volume candles for periods without trades, a few seconds after the period ends, and creates no candles while trading is halted. |

**Independence:** 24h statistics and candle history are loaded separately and can fail separately. Live updates for each group arrive at different rates. Whether groups share a connection is **Deferred** to `TECHNICAL_SPEC.md`. Groups can therefore fail or become stale independently.

## 3. Requirement index

| ID | Requirement | Tier | Brief §4.2 | Section | Acceptance criteria |
|---|---|---|---|---|---|
| FR-01 | Current price | Core | 1 | §4 | AC-01.1–01.3 |
| FR-02 | 24h price change, absolute and % | Core | 2 | §4 | AC-02.1–02.2 |
| FR-03 | 24h high and low | Core | 3 | §4 | AC-03.1–03.2 |
| FR-04 | 24h volume in BTC and USDT | Core | 4 | §4 | AC-04.1–04.2 |
| FR-05 | OHLCV candlestick chart with volume | Core | 5 | §5 | AC-05.1–05.4 |
| FR-06 | Timeframe selection: 1m, 5m, 15m, 1h, 4h, 1d | Core | 6 | §5 | AC-06.1–06.5 |
| FR-07 | Live updates | Core | 7 | §6 | AC-07.1–07.2 |
| FR-08 | Connection status | Core | 8 | §6 | AC-08.1–08.5 |
| FR-09 | Data freshness | Core | 8 | §7 | AC-09.1–09.4 |
| FR-10 | Responsive dashboard interface | Core | 9 | §10 | AC-10.1–10.3 |
| FR-11 | Loading, error and empty states, including regional restrictions | Core | 10 | §8 | AC-11.1–11.7 |
| FR-12 | Footer: disclaimer and attributions | Core | 11 | §9 | AC-12.1–12.4 |
| FR-P1-01 | Recent trades feed | P1 | P1 | §13 | AC-P1.1–P1.6 |

## 4. Price and 24-hour statistics

### FR-01 Current price

- Shows the current BTC/USDT price. **Approved**
- Shown in USDT with its unit, with the market identity "BTC/USDT, Binance Spot" visible alongside. **Proposed**
- Shown to 2 decimal places, matching the 0.01 USDT price tick. **Proposed**
- Updates at least as often as Binance publishes 24h statistics (once per second). **Proposed**

### FR-02 24-hour price change

- Shows both the absolute change (USDT) and the percentage change. **Approved**
- Both values show an explicit + or − sign; zero is shown without a sign. **Proposed**
- The direction of change is never conveyed by colour alone. **Proposed**
- The percentage is shown to 2 decimal places; the absolute change uses price precision. **Proposed**

### FR-03 24-hour high and low

- Shows the 24h high and low. **Approved**
- Same precision as the price. **Proposed**

### FR-04 24-hour volume

- Shows 24h volume in both BTC (base asset) and USDT (quote asset). **Approved**
- Each value is labelled with its unit. **Proposed**
- Number format (full or abbreviated, number of decimals): **Open** (OQ-08).

### 4.5 Rules common to FR-01 to FR-04

- Labels make the 24h window clear. **Proposed**
- Values are Binance's values, not recalculated (§2.3). **Proposed**
- Number format and locale: **Open** (OQ-15).
- Final labels and copy: approved by the project owner.

## 5. OHLCV chart and timeframe selection

### FR-05 Candlestick chart with volume

- Shows open, high, low and close for each period, with volume for each period on the same time axis. **Approved**
- Volume for each period is shown in BTC (base asset). **Approved** (OQ-23, 2026-11-11)
- When a timeframe is loaded, the chart shows the 500 most recent candles for that timeframe. **Approved** (OQ-07, 2026-11-11)
- The chart has a price scale and a time axis. **Proposed**
- How volume is drawn is part of the visual design (project owner).
- The current period's candle updates live. When the period ends it is finalized and a new candle starts. **Proposed**
- Time covered by 500 candles (**Informative**):

| Timeframe | Time covered by 500 candles |
|---|---|
| 1m | ~8.3 hours |
| 5m | ~1.7 days |
| 15m | ~5.2 days |
| 1h | ~20.8 days |
| 4h | ~83 days |
| 1d | ~1.4 years |

- Chart interactions: **Open** (OQ-06); see §12.

### FR-06 Timeframe selection

- Offers exactly six timeframes: 1m, 5m, 15m, 1h, 4h and 1d. **Approved**
- Default timeframe on load: 1h. **Approved** (OQ-05, 2026-11-11)
- Exactly one timeframe is active, and the active one is clearly indicated. **Proposed**
- Switching timeframe replaces all candle data; data from two timeframes is never mixed. **Proposed**
- If the user switches quickly, only the last selected timeframe's data is displayed. **Proposed**
- While a new timeframe loads, the loading state is limited to the chart area, and the 24h statistics stay visible and live. **Proposed**
- The selection is not remembered between visits. **Proposed** (see §15.2)

### 5.3 Candle data integrity — Approved (2026-11-11)

btcmtg never fabricates candle data. It distinguishes three cases:

| Case | Meaning | Required behaviour |
|---|---|---|
| Zero-volume candle | Binance provides a candle for a period without trades. | Displayed as Binance provides it. |
| Source gap | Binance provides no candle for a period, for example during a trading halt. | Left as a gap. Not filled with invented candles. |
| App gap | Candles the app did not receive, for example during a disconnection. | After reconnection, the app requests the missed candles from Binance's API and displays the candles Binance provides. Any period for which Binance provides no candle is treated as a source gap. Never filled with invented values. |

- Every displayed closed candle matches a Binance candle with the same open time and values.
- There are never two candles with the same open time.
- Recovery is limited to what Binance's API provides. btcmtg does not guarantee that every missed candle can be recovered.
- If the recovery request fails, E-06 applies to the chart area (**Proposed**, §8.2).
- How a source gap looks is part of the visual design; how it is represented technically is **Deferred** to `TECHNICAL_SPEC.md`.
- The newest closed candle may appear a few seconds after its period ends. **Informative**

### 5.4 Time and time zone

- Times on the chart's time axis and elsewhere in the interface are shown in UTC. **Approved** (OQ-16, 2026-11-11)
- The interface makes clear that displayed times are in UTC. **Approved** (2026-11-11). How this is presented is part of the visual design (project owner).
- Daily (1d) candles start at 00:00 UTC, which is Binance's default. **Approved** (OQ-24, 2026-11-11)
- Date and time formats: **Open** (OQ-15).

## 6. Live data and connection states

### FR-07 Live updates

- 24h statistics (DG-1) and candles (DG-2) update without reloading the page. **Approved**
- Updates appear on screen within 1 second of being received. **Proposed**

### FR-08 Connection status

The dashboard shows the connection status. **Approved**

**Indicator scope — Approved** (OQ-09, 2026-11-11): one global connection status indicator, plus a local indicator in a data group's own area when that group fails or becomes stale (§7.4, W-03b, W-03d).

State model — **Proposed**. Status words are draft copy.

| State | Entry condition | Status shows | Data on screen |
|---|---|---|---|
| ST-01 Connecting | First load, before any data arrives | "Connecting" | Loading placeholders (W-03a) |
| ST-02 Live | Updates arriving within freshness thresholds | "Live" and last update | Current values |
| ST-03 Reconnecting | Connection lost; automatic reconnection in progress | "Reconnecting" and last update | Last known values, marked stale (W-03b) |
| ST-04 Offline | The browser reports no network connection | "Offline" and last update | Last known values, marked stale (W-03b) |
| ST-05 Unavailable | Binance can't be reached or refuses access after reconnection attempts (E-01, E-03, E-04) | "Unavailable" | Notice (W-03c). If data was loaded earlier, it stays visible, marked stale. |

Behaviour — **Proposed**:

- The app reconnects automatically, without a page reload. Timing and backoff are **Deferred** to `TECHNICAL_SPEC.md` and must respect Binance's connection limits (§2.4).
- After reconnecting, DG-1 and DG-2 are refreshed, and missed candles that Binance provides are recovered (§5.3).
- When Binance closes a connection (the 24-hour limit, earlier closures, shutdown notices), the user sees at most a brief Reconnecting state. No error is shown unless reconnection fails.
- When the network returns after ST-04, reconnection starts immediately.
- When a background tab becomes visible again, its data is current within 5 seconds.

## 7. Data freshness (FR-09)

The dashboard shows data freshness. **Approved**

### 7.1 Definition — Proposed

Freshness is the time since the app last received an update for a data group.

### 7.2 Stale thresholds

| Group | Expected update interval (Informative) | Marked stale after | Status |
|---|---|---|---|
| DG-1 24h statistics | 1 s | 10 s without an update | **Approved** (OQ-10, 2026-11-11) |
| DG-2 Candles | 2 s | 10 s without an update | **Approved** (OQ-10, 2026-11-11) |
| DG-3 Trades (P1) | Irregular; quiet periods are normal | Follows the connection state, not trade arrival | **Proposed** |

**Informative:** the 10-second threshold equals five missed candle updates.

### 7.3 Display — Proposed

- The global indicator shows the time of the most recent update. Relative or absolute time: **Open** (OQ-29). An absolute time is shown in UTC (§5.4).
- Stale values stay visible and are clearly marked (W-03b). Stale data is never presented as live.
- The stale mark disappears automatically when fresh data arrives.

### 7.4 Independence

- **Approved** (OQ-09, 2026-11-11): one global connection status indicator. A data group that fails or becomes stale gets a local indicator in its own area (W-03b, W-03d).
- **Proposed:** each data group has its own freshness state, and the global indicator reflects the connection state.

## 8. Loading, error and empty states (FR-11)

Clear error states, including regional access restrictions, are required. **Approved**

### 8.1 Loading states — Proposed

| Situation | Behaviour |
|---|---|
| First load (ST-01) | Placeholders in the price, statistics and chart areas (W-03a). Zeros or invented values are never shown. |
| Timeframe switch | Placeholder in the chart area only. The 24h statistics stay live. |
| Reconnection | Last known values stay visible, marked stale (W-03b). |

### 8.2 Error catalogue — Proposed

Draft copy only states the intent of each message. Final wording is approved by the project owner.

| ID | Situation | Scope | Message intent (draft) | Recovery |
|---|---|---|---|---|
| E-01 | Regional restriction positively identified | Whole page (W-03c) | Market data is unavailable in the user's region because Binance restricts access in some locations. | Not expected to recover. Retry control per OQ-11. |
| E-02 | No network connection | Whole page (ST-04) | The user is offline; data resumes when the connection returns. | Automatic when the network returns. |
| E-03 | Binance unreachable or unavailable, including maintenance, server errors and unidentified failures | Whole page (W-03c) | Binance market data can't be reached right now. This may be temporary, or access may be restricted in the user's region. | Automatic retries within Binance's limits. |
| E-04 | Binance is limiting requests | Whole page | Binance is temporarily limiting requests; data resumes shortly. | Automatic after the wait Binance specifies. |
| E-05 | Unexpected or invalid data | Affected group's area | Some data couldn't be displayed. | Automatic with the next valid update or refresh. |
| E-06 | One group fails while others work | Affected group's area (W-03d) | This section's data couldn't be loaded. | Automatic retries. Retry control per OQ-11. |

### 8.3 Identifying regional restrictions — Proposed, pending verification

- Binance's spot API documentation does not describe responses for restricted locations. Community reports mention HTTP 451 from the main API host. Whether market-data-only hosts are restricted, and whether a browser can read such a response, is unverified (V-04).
- E-01 is shown only when the app can positively identify a regional restriction. Otherwise E-03 is shown, which names regional restriction as a possible cause.
- The app never suggests VPNs, proxies or other ways around restrictions.
- How to test this state: **Open** (OQ-22).

### 8.4 Message copy — Proposed

- Plain language: what happened, and what the user can do, if anything.
- No technical error codes in the main message.
- Final wording is approved by the project owner.

### 8.5 Empty states — Proposed

- Core MVP: no empty state in normal operation. If Binance returns no data for a group, this is treated as E-05.
- P1: see §13.

## 9. Footer, disclaimer and attributions (FR-12)

A compact footer with the disclaimer and the required data and chart attributions is required. **Approved**

| Item | Status | Content |
|---|---|---|
| Disclaimer | **Approved** | "Educational purposes only. Not financial advice." |
| TradingView attribution | **Approved** (licence requirement) | **Proposed:** the attribution notice from the NOTICE file of the adopted library version, currently "TradingView Lightweight Charts™ Copyright (c) 2025 TradingView, Inc.", with a link to https://www.tradingview.com/ |
| Binance attribution | **Approved** | **Proposed:** "Market data: Binance" as plain text, with no Binance logo. Final wording: **Open** (OQ-26). |
| Non-affiliation statement | **Open** (OQ-12) | **Proposed:** "Not affiliated with Binance or TradingView." |

Rules — **Proposed**:

- The footer is present at every supported width and in every state, including W-03c.
- The footer stays secondary to market data in the information hierarchy.
- The chart library can show a TradingView logo on the chart. This satisfies the licence's link requirement but not the notice text, so the footer notice is required either way (**Informative**). Whether to keep the on-chart logo: **Open** (OQ-25).
- The licence and terms review (brief R4) must be complete before public release (§17).

## 10. Responsive UI requirements (FR-10)

A responsive dashboard interface that works on both phone and desktop screens is required. **Approved**

- **Layout classes in the wireframes:** Phone (W-02, W-05) and Desktop (W-01, W-04). Tablet behaviour and breakpoint values: **Open** (OQ-17).
- **Minimum supported width:** **Open** (OQ-17). A 360 px proposal exists but is not approved.
- **Rules — Proposed:**
  - No horizontal page scrolling at any supported width.
  - All Core MVP information is reachable at every supported width.
  - On a phone, market identity, status, current price and 24h change are visible without scrolling.
  - The chart is usable with touch.
  - Portrait and landscape orientations are supported.
  - Touch targets meet the accessibility target (OQ-19).
- **Supported browsers:** **Approved** (OQ-18, 2026-11-11). See `TECHNICAL_SPEC.md` §12.3.

## 11. Functional layout and low-fidelity wireframes

### 11.1 Information hierarchy — Proposed

Hierarchy means prominence, not position.

1. Market identity, current price and 24h change
2. Chart with timeframe selector
3. 24h high, low and volumes
4. Connection status and data freshness
5. Footer

P1 recent trades rank below all Core MVP market information.

### 11.2 Component inventory — Proposed

| Component | Content | Tier | Wireframes |
|---|---|---|---|
| Product name | Shown or not: **Open** (OQ-13) | Core | All |
| Market identity | "BTC/USDT, Binance Spot" | Core | All |
| Status and freshness | Connection state, last update | Core | All |
| Price block | Current price; 24h change, absolute and % | Core | W-01, W-02, W-03a/b/d, W-04, W-05 |
| 24h statistics | High, low, volume (BTC), volume (USDT) | Core | W-01, W-02, W-03a/b/d, W-04, W-05 |
| Timeframe selector | Six options, one active | Core | W-01, W-02, W-03a/b/d, W-04, W-05 |
| Chart | Candles, volume, price scale, time axis | Core | W-01, W-02, W-03a/b/d, W-04, W-05 |
| Notice | Page-level or area-level error and unavailable messages | Core | W-03c, W-03d |
| Footer | Disclaimer and attributions | Core | All |
| Recent trades panel | Latest trades, newest first | P1 | W-04, W-05 |

### 11.3 Wireframe conventions

- Every wireframe is **Low-fidelity — not a visual design**.
- `<...>` marks placeholder content. All words are draft labels, not final copy.
- Box sizes, proportions and spacing have no meaning. Only grouping, order and content do.
- `[stale]` marks where a stale indication is required. Its visual form is the project owner's decision.
- Positions shown are proposals for review.

### 11.4 Wireframes

```text
W-01  Desktop, Core MVP
Low-fidelity — not a visual design

+----------------------------------------------------------------------+
| <Product name: OQ-13>   BTC/USDT, Binance Spot       Status: <state> |
|                                                  Last update: <time> |
+-----------------------------------+----------------------------------+
| PRICE                             | 24H STATISTICS                   |
|                                   |                                  |
| <current price> USDT              | High     <price> USDT            |
|                                   | Low      <price> USDT            |
| 24h change                        | Volume   <amount> BTC            |
| <+/- amount> USDT  <+/- %>        | Volume   <amount> USDT           |
+----------------------------------------------------------------------+
| CHART                                                                |
| Timeframe:  1m   5m   15m   1h   4h   1d   (one option active)       |
|                                                                      |
| Candles: open, high, low, close per period             <price scale> |
| The current period's candle updates live                             |
|                                                                      |
|                                                                      |
| Volume per period, aligned with the candles                          |
| <time axis>                                                          |
+----------------------------------------------------------------------+
| FOOTER                                                               |
| Educational purposes only. Not financial advice.                     |
| <Binance market data attribution>                                    |
| <TradingView Lightweight Charts attribution and link>                |
+----------------------------------------------------------------------+
```

```text
W-02  Phone, Core MVP
Low-fidelity — not a visual design
Visible without scrolling: market identity, status, price, 24h change.

+--------------------------------------+
| <Product name: OQ-13>                |
| BTC/USDT, Binance Spot               |
| Status: <state>  Updated: <time>     |
+--------------------------------------+
| PRICE                                |
| <current price> USDT                 |
| 24h change                           |
| <+/- amount> USDT  <+/- %>           |
+--------------------------------------+
| CHART                                |
| Timeframe:                           |
| 1m  5m  15m  1h  4h  1d              |
|                                      |
| Candles: OHLC per period             |
|                                      |
| Volume per period                    |
| <time axis>                          |
+------------------+-------------------+
| 24h high         | 24h low           |
| <price> USDT     | <price> USDT      |
+------------------+-------------------+
| 24h volume       | 24h volume        |
| <amount> BTC     | <amount> USDT     |
+--------------------------------------+
| FOOTER                               |
| Educational purposes only.           |
| Not financial advice.                |
| <Binance market data attribution>    |
| <TradingView attribution and link>   |
+--------------------------------------+
```

```text
W-03a  Initial loading (ST-01 Connecting)
Low-fidelity — not a visual design
No zeros or invented values while loading.

+----------------------------------------------------------------------+
| <Product name: OQ-13>   BTC/USDT, Binance Spot    Status: Connecting |
|                                                       Last update: - |
+-----------------------------------+----------------------------------+
| PRICE                             | 24H STATISTICS                   |
|                                   |                                  |
| <loading placeholder>             | High     <loading placeholder>   |
|                                   | Low      <loading placeholder>   |
| 24h change                        | Volume   <loading placeholder>   |
| <loading placeholder>             | Volume   <loading placeholder>   |
+----------------------------------------------------------------------+
| CHART                                                                |
| Timeframe:  1m   5m   15m   1h   4h   1d   (one option active)       |
|                                                                      |
|                     <loading placeholder for chart>                  |
|                                                                      |
+----------------------------------------------------------------------+
| FOOTER                                                               |
| Educational purposes only. Not financial advice.                     |
| <Binance market data attribution>                                    |
| <TradingView Lightweight Charts attribution and link>                |
+----------------------------------------------------------------------+
```

```text
W-03b  Reconnecting, data stale (ST-03 / ST-04)
Low-fidelity — not a visual design
Last known values stay visible and are marked stale.

+----------------------------------------------------------------------+
| <Product name: OQ-13>   BTC/USDT, Binance Spot  Status: Reconnecting |
|                                                  Last update: <time> |
+-----------------------------------+----------------------------------+
| PRICE   [stale]                   | 24H STATISTICS   [stale]         |
|                                   |                                  |
| <last known price> USDT           | High     <last known value>      |
|                                   | Low      <last known value>      |
| 24h change                        | Volume   <last known value>      |
| <last known change>               | Volume   <last known value>      |
+----------------------------------------------------------------------+
| CHART   [stale]                                                      |
| Timeframe:  1m   5m   15m   1h   4h   1d   (one option active)       |
|                                                                      |
| Last known candles and volume remain visible                         |
|                                                                      |
+----------------------------------------------------------------------+
| FOOTER                                                               |
| Educational purposes only. Not financial advice.                     |
| <Binance market data attribution>                                    |
| <TradingView Lightweight Charts attribution and link>                |
+----------------------------------------------------------------------+
```

```text
W-03c  Data unavailable (E-01 regional restriction / E-03)
Low-fidelity — not a visual design
Shown when no data has loaded. If data loaded earlier, it stays visible
and marked stale (W-03b), with this notice added above it.

+----------------------------------------------------------------------+
| <Product name: OQ-13>   BTC/USDT, Binance Spot   Status: Unavailable |
+----------------------------------------------------------------------+
| NOTICE                                                               |
|                                                                      |
| <Title: market data is unavailable>                                  |
| <Explanation in plain language: what happened>                       |
| <What the user can do, if anything>                                  |
| <Retry control: only if OQ-11 is approved>                           |
|                                                                      |
+----------------------------------------------------------------------+
| FOOTER                                                               |
| Educational purposes only. Not financial advice.                     |
| <Binance market data attribution>                                    |
| <TradingView Lightweight Charts attribution and link>                |
+----------------------------------------------------------------------+
```

```text
W-03d  Partial failure: chart data failed, 24h statistics live (E-06)
Low-fidelity — not a visual design

+----------------------------------------------------------------------+
| <Product name: OQ-13>   BTC/USDT, Binance Spot          Status: Live |
|                                                  Last update: <time> |
+-----------------------------------+----------------------------------+
| PRICE                             | 24H STATISTICS                   |
|                                   |                                  |
| <current price> USDT              | High     <price> USDT            |
|                                   | Low      <price> USDT            |
| 24h change                        | Volume   <amount> BTC            |
| <+/- amount> USDT  <+/- %>        | Volume   <amount> USDT           |
+----------------------------------------------------------------------+
| CHART                                                                |
| Timeframe:  1m   5m   15m   1h   4h   1d   (one option active)       |
|                                                                      |
| NOTICE (chart area only)                                             |
| <Chart data could not be loaded>                                     |
| <Retry control: only if OQ-11 is approved>                           |
|                                                                      |
+----------------------------------------------------------------------+
| FOOTER                                                               |
| Educational purposes only. Not financial advice.                     |
| <Binance market data attribution>                                    |
| <TradingView Lightweight Charts attribution and link>                |
+----------------------------------------------------------------------+
```

```text
W-04  Desktop with P1 recent trades
Low-fidelity — not a visual design
P1 only. Core MVP information keeps its prominence.

+----------------------------------------------------------------------+
| <Product name: OQ-13>   BTC/USDT, Binance Spot       Status: <state> |
|                                                  Last update: <time> |
+-----------------------------------+----------------------------------+
| PRICE                             | 24H STATISTICS                   |
|                                   |                                  |
| <current price> USDT              | High     <price> USDT            |
|                                   | Low      <price> USDT            |
| 24h change                        | Volume   <amount> BTC            |
| <+/- amount> USDT  <+/- %>        | Volume   <amount> USDT           |
+----------------------------------------------+-----------------------+
| CHART                                        | RECENT TRADES (P1)    |
| Timeframe:  1m   5m   15m   1h   4h   1d     |                       |
|                                              | Price   Amount  Time  |
| Candles: OHLC per period                     | <p>     <BTC>   <t>   |
|                                              | <p>     <BTC>   <t>   |
|                                              | <p>     <BTC>   <t>   |
|                                              | <p>     <BTC>   <t>   |
| Volume per period, aligned                   | <p>     <BTC>   <t>   |
| <time axis>                                  | (newest first)        |
+----------------------------------------------------------------------+
| FOOTER                                                               |
| Educational purposes only. Not financial advice.                     |
| <Binance market data attribution>                                    |
| <TradingView Lightweight Charts attribution and link>                |
+----------------------------------------------------------------------+
```

```text
W-05  Phone with P1 recent trades
Low-fidelity — not a visual design
P1 only. Trades appear after all Core MVP information.

+--------------------------------------+
| <Product name: OQ-13>                |
| BTC/USDT, Binance Spot               |
| Status: <state>  Updated: <time>     |
+--------------------------------------+
| PRICE                                |
| <current price> USDT                 |
| 24h change                           |
| <+/- amount> USDT  <+/- %>           |
+--------------------------------------+
| CHART                                |
| Timeframe:                           |
| 1m  5m  15m  1h  4h  1d              |
|                                      |
| Candles: OHLC per period             |
|                                      |
| Volume per period                    |
| <time axis>                          |
+------------------+-------------------+
| 24h high         | 24h low           |
| <price> USDT     | <price> USDT      |
+------------------+-------------------+
| 24h volume       | 24h volume        |
| <amount> BTC     | <amount> USDT     |
+--------------------------------------+
| RECENT TRADES (P1)                   |
| Price       Amount      Time         |
| <price>     <BTC>       <time>       |
| <price>     <BTC>       <time>       |
| <price>     <BTC>       <time>       |
| (newest first; length: OQ-21)        |
+--------------------------------------+
| FOOTER                               |
| Educational purposes only.           |
| Not financial advice.                |
| <Binance market data attribution>    |
| <TradingView attribution and link>   |
+--------------------------------------+
```

## 12. Interaction requirements

All items are **Proposed** unless marked otherwise.

- **IR-01 Timeframe selector:** works with mouse, touch and keyboard. Exactly one option is active. A selection takes effect immediately, and the last selection wins.
- **IR-02 Chart interactions:** **Open** (OQ-06). Candidates are a crosshair, a readout of the hovered candle's values, pan, zoom and reset view. A value readout is a data display, not an educational tooltip, but it still needs a decision.
- **IR-03 Status indicator:** information only, with no interaction.
- **IR-04 Error recovery:** automatic. A visible retry control: **Open** (OQ-11).
- **IR-05 Footer links:** open the linked external site in a new tab.
- **IR-06 Keyboard:** every interactive element is reachable by keyboard, in a logical order, with visible focus.
- **IR-07 No other controls:** the Core MVP has no interactive controls beyond IR-01, IR-02 (if approved), IR-04 (if approved) and IR-05.
- **IR-08 Recent trades (P1):** read-only. No interaction beyond scrolling, if the list exceeds its area.

## 13. P1 — Recent trades (FR-P1-01)

**Approved:**

- A recent trades feed is the P1 extension. It is planned after the Core MVP and is not a release blocker.
- The P1 visual design must be approved by the project owner before P1 UI implementation begins.

**Proposed:**

- Trades are listed newest first and update live.
- Each trade shows price (USDT), amount (BTC) and time.
- Price uses FR-01 precision. Amount format follows OQ-08; the quantity step is 0.00001 BTC.
- The list has a fixed maximum length and stays readable when trades arrive fast. Updates may be batched, but trades are never reordered or altered.
- Freshness follows the connection state (§7.2).
- **States:**
  - Loading.
  - "No trades yet" when no trade has arrived since loading.
  - Stale, with the connection.
  - Area-level error (E-05, E-06).
  - Trades are never invented.
- Placement follows W-04 (desktop, beside the chart) and W-05 (phone, after the 24h statistics). The trades panel must not reduce the prominence of Core MVP information.
- P1 work starts only after the Core MVP release and the project owner's explicit approval.

**Open:** number of trades listed, and whether buy or sell side is shown (OQ-21).

**Deferred:** individual versus aggregated trades, to `TECHNICAL_SPEC.md`. **Informative:** aggregated trades combine fills of one order at one price into a single entry.

## 14. Non-functional requirements

### NFR-01 Performance

- Time until first data is shown, and download-size budget: **Approved** (OQ-20, 2026-11-11). See `TECHNICAL_SPEC.md` §12.4.
- Screen updates are batched and the interface stays responsive: no browser task longer than 200 ms during Live operation, measured with browser developer tools. **Proposed**

### NFR-02 Long sessions — Proposed

The dashboard stays Live and responsive with the tab open for 24 hours or more, including through Binance-initiated reconnections.

### NFR-03 Data integrity

- Candle integrity as defined in §5.3. **Approved**
- Stale data is always marked (§7.4). **Approved** (OQ-09)
- Timeframes are never mixed. **Proposed**
- Values are never altered except for display rounding. **Proposed**

### NFR-04 Accessibility — Proposed (OQ-19)

- Target: WCAG 2.2 AA for all interface elements except the chart drawing itself.
- Colour is never the only way information is conveyed.
- Full keyboard operation (IR-06).
- Key figures are always available as text, outside the chart.
- If motion is used, the user's reduced-motion setting is respected.

### NFR-05 Compatibility — Approved (OQ-18, 2026-11-11)

Supported browsers: see `TECHNICAL_SPEC.md` §12.3.

### NFR-06 Security and privacy

- **Approved:** no backend, no database, no server-side storage, no analytics or tracking.
- **Approved:** no API keys, user accounts or authenticated endpoints.
- **Proposed** (OQ-28):
  - No cookies.
  - No browser storage.
  - No personal data collected.
- **Proposed:** no network requests to third parties other than Binance market data unless approved. This includes web fonts and content delivery networks.

### NFR-07 Localization

- Time zone: UTC (§5.4). **Approved** (OQ-16, 2026-11-11)
- UI language, and number and date formats: **Open** (OQ-14, OQ-15).

### NFR-08 Rate limits — Proposed

- Data loading stays well within Binance's limits (based on the mitigation for brief risk R5).
- In normal use, request weight stays below 10% of Binance's per-minute limit, and connection attempts stay well below Binance's limit, including during repeated failures.

## 15. Out-of-scope functionality

### 15.1 Approved exclusions

**Excluded from the project** (brief §5.1):

- Trading or order placement of any kind
- Wallets
- Portfolios
- User accounts
- AI predictions
- Trading signals

**Excluded from the MVP** (brief §5.2):

- A backend of any kind, including a proxy for Binance data and serverless functions such as Cloudflare Pages Functions
- A database or any server-side storage
- Order book. It may be reconsidered as a future feature, but it is not currently approved or planned.
- Technical indicators, including moving averages and RSI
- Educational UI features such as tutorials, tooltips or interactive lessons, unless separately approved
- Analytics or tracking
- Trading pairs other than BTC/USDT and markets other than Binance Spot

**Excluded from the current version of the project** (OQ-27, approved by the project owner on 2026-11-10; not yet in the brief; see §1.5):

- Advertising
- Paid features
- Subscriptions
- Any other monetization mechanism

### 15.2 Additional exclusions — Proposed, not yet approved

These features have not been approved. This draft proposes stating explicitly that they are outside the MVP:

- Market or pair switcher
- Settings or preferences
- Theme switcher
- Remembering user choices between visits
- Drawing tools on the chart
- Switching chart type, for example to a line or area chart
- Loading older history when scrolling back in time
- Alerts, notifications or sounds
- Data export, download or sharing
- Full-screen chart mode
- Offline mode or an installable app

## 16. Acceptance criteria

Each criterion carries a status:

- **Approved:** the criterion checks only previously approved requirements, including any time or limit it states. This does not mean the criterion's wording was approved separately.
- **Proposed:** the criterion checks at least one Proposed requirement, or states a Proposed time, limit or tolerance.

A criterion's status never changes the status of the requirements it checks. The verification approach (§16.1) is Proposed and applies to all criteria without changing their status. A Proposed criterion becomes a release condition only after the project owner approves it (§17, §18).

### 16.1 Verification approach — Proposed

- Criteria are verified manually on a Cloudflare Pages preview deployment, in each supported browser (OQ-18) and layout class (OQ-17). Automated tests are added only if testing tools are approved.
- Value checks compare the dashboard with Binance's own public data captured at the same moment. A difference is acceptable only if it disappears with the next update (within 2 seconds).
- Where a criterion states a time without its own tolerance, a measurement tolerance of 1 second applies.
- Network conditions are simulated with browser developer tools: offline mode, request blocking and throttling.
- Values in `‹ ›` are placeholders. In AC-08.2 and AC-08.3 they are proposed values, to be confirmed in review. In AC-N1.1 the value is set when OQ-20 is resolved.

### 16.2 Criteria

**FR-01 Current price**
- **AC-01.1** (**Approved**) *Given* the dashboard is Live, *when* the price is compared with Binance's 24h statistics for BTC/USDT, *then* they match (§16.1).
- **AC-01.2** (**Proposed**) *Given* data is shown, *then* the price shows the unit "USDT", and "BTC/USDT, Binance Spot" is visible.
- **AC-01.3** (**Proposed**) *Then* the price is shown with exactly 2 decimal places.

**FR-02 24h change**
- **AC-02.1** (**Approved**) *Given* the dashboard is Live, *then* both the absolute change (USDT) and the percentage change are shown and match Binance's values at the displayed precision.
- **AC-02.2** (**Proposed**) *Given* a positive, negative or zero change, *then* the sign is shown as specified in FR-02, and *when* the screen is viewed in greyscale, the direction is still identifiable.

**FR-03 24h high and low**
- **AC-03.1** (**Approved**) *Then* the 24h high and low are shown and match Binance at the displayed precision.
- **AC-03.2** (**Proposed**) *Then* the 24h high and low are shown with 2 decimal places.

**FR-04 24h volume**
- **AC-04.1** (**Approved**) *Then* 24h volume is shown in both BTC and USDT, matching Binance at the displayed precision.
- **AC-04.2** (**Proposed**) *Then* each volume value is labelled with its unit.

**FR-05 Chart**
- **AC-05.1** (**Approved**) *Given* a timeframe is selected, *then* the 500 most recent candles that Binance provides for that timeframe are shown, with each period's volume in BTC, on a shared time axis.
- **AC-05.2** (**Proposed**) *Given* the 1m timeframe is Live, *when* a period boundary passes, *then* the current candle updated during the period, and a new candle appears within 10 s after the boundary.
- **AC-05.3** (**Approved**) *When* the displayed candles are compared with Binance's candle history for the same timeframe and range, *then* every closed candle matches Binance's open time and OHLCV values, no open time appears twice, and no candle appears that Binance does not provide.
- **AC-05.4** (**Approved**) *Given* the 1m timeframe is Live, *when* the network is offline for 3 minutes and then restored, *then* after reconnection the chart contains the candles Binance provides for the missed minutes, and the chart passes AC-05.3.

**FR-06 Timeframes**
- **AC-06.1** (**Approved**) *Then* exactly six timeframes are offered: 1m, 5m, 15m, 1h, 4h and 1d.
- **AC-06.2** (**Approved**) *When* the dashboard loads, *then* 1h is the selected timeframe and its candles are shown.
- **AC-06.3** (**Proposed**) *When* the user selects 5m and then 1d less than one second apart, *then* only 1d candles are displayed and 1d is active.
- **AC-06.4** (**Proposed**) *Given* a throttled network, *when* the user switches timeframe, *then* the chart area shows a loading placeholder while price and 24h statistics keep updating.
- **AC-06.5** (**Proposed**) *Then* exactly one timeframe is active at any time, and the active one is clearly indicated.

**FR-07 Live updates**
- **AC-07.1** (**Approved**) *Given* the dashboard is Live, *when* observed for 60 seconds without reloading, *then* the price, 24h statistics and chart update and follow Binance's values.
- **AC-07.2** (**Proposed**) *Given* the dashboard is Live, *then* the last-update indicator advances at least every 2 seconds.

**FR-08 Connection status**
- **AC-08.1** (**Proposed**) *When* the dashboard first loads, *then* the status shows Connecting until the first data arrives, then Live.
- **AC-08.2** (**Proposed**) *Given* the dashboard is Live, *when* the browser is set offline, *then* the status shows Offline within ‹5› s, and the data is marked stale per FR-09.
- **AC-08.3** (**Proposed**) *When* the network is restored, *then* the status returns to Live within ‹10› s without a reload, and the stale marks disappear.
- **AC-08.4** (**Proposed**) *Given* Binance's hosts are blocked and the connection is interrupted, *then* the status shows Reconnecting and then Unavailable (E-03) after reconnection attempts fail. *When* the hosts are unblocked, *then* the status returns to Live without a reload.
- **AC-08.5** (**Approved**) *Then* the page has exactly one global connection status indicator, present in every state.

**FR-09 Data freshness**
- **AC-09.1** (**Proposed**) *Given* the dashboard is Live, *then* the last-update indicator matches the time of the most recent update, to within 1 s.
- **AC-09.2** (**Approved**) *When* updates for 24h statistics or for candles stop, *then* that group is marked stale in its own area once 10 seconds have passed without an update (§7.2, §7.4).
- **AC-09.3** (**Proposed**) *When* updates resume, *then* the stale mark disappears within 1 s of the next update.
- **AC-09.4** (**Proposed**) *While* a group is marked stale, *then* its last known values stay visible.

**FR-10 Responsive interface**
- **AC-10.1** (**Proposed**) *Given* each layout class and the minimum supported width (OQ-17), *then* there is no horizontal page scrolling and all Core MVP information is reachable.
- **AC-10.2** (**Proposed**) *Given* a phone in portrait at the minimum supported width, *then* market identity, status, current price and 24h change are visible without scrolling.
- **AC-10.3** (**Proposed**) *When* a phone is rotated, *then* the layout remains usable, and the selected timeframe and displayed data are kept.

**FR-11 Loading, error and empty states**
- **AC-11.1** (**Proposed**) *Given* a throttled network on first load, *then* placeholders are shown, and zeros or invented values never appear.
- **AC-11.2** (**Proposed**) *Given* the browser is offline at load, *then* the E-02 notice is shown. *When* the network returns, *then* data loads without a reload.
- **AC-11.3** (**Proposed**) *Given* all Binance hosts are blocked at load, *then* the E-03 notice is shown, naming regional restriction as a possible cause, and no workaround is suggested.
- **AC-11.4** (**Proposed**) *Given* access from a restricted location (method: OQ-22), *then* E-01 is shown if the restriction can be identified, otherwise E-03 (§8.3).
- **AC-11.5** (**Approved**) *Given* only candle-history requests are blocked, *then* a local indicator in the chart area shows that chart data could not be loaded, while price and 24h statistics keep updating (§7.4, W-03d).
- **AC-11.6** (**Proposed**) *When* blocked requests are unblocked, *then* the affected area recovers automatically, or by the retry control if OQ-11 is approved.
- **AC-11.7** (**Proposed**) E-04 (rate limiting) shows its message and recovers after the wait Binance specifies. Verification method: **Open**, because this can't be triggered safely against Binance; to be defined in `TECHNICAL_SPEC.md`.

**FR-12 Footer**
- **AC-12.1** (**Approved**) *Then* the footer shows the disclaimer "Educational purposes only. Not financial advice.", an attribution for Binance market data and an attribution for TradingView Lightweight Charts.
- **AC-12.2** (**Proposed**) *Then* the TradingView attribution text matches the NOTICE file of the adopted library version and links to https://www.tradingview.com/.
- **AC-12.3** (**Proposed**) *When* a footer link is activated, *then* the intended destination opens in a new tab.
- **AC-12.4** (**Proposed**) *Given* every layout class and every state, including W-03c, *then* the footer is present with the content checked in AC-12.1.

**Non-functional**
- **AC-N1.1** (**Proposed**) *Then* time until first data is shown is within ‹target› (OQ-20) on the reference connection.
- **AC-N1.2** (**Proposed**) *During* 5 minutes of Live operation, *then* a browser performance recording shows no task longer than 200 ms.
- **AC-N2.1** (**Proposed**) *After* 24 hours with the tab open, *then* the dashboard is Live, values match Binance, and the interface is responsive.
- **AC-N4.1** (**Proposed**) *Then* every interactive element can be operated by keyboard, with visible focus.
- **AC-N4.2** (**Proposed**) *Then* the non-chart interface meets the accessibility target (OQ-19). Checked after the visual design is implemented.
- **AC-N5.1** (**Proposed**) *Then* all Approved Core MVP criteria pass in each supported browser (OQ-18).
- **AC-N6.1** (**Proposed**) *During* a 10-minute session, *then* the browser's network log shows requests only to the site's own origin and to Binance market data hosts.
- **AC-N6.2** (**Approved**) *Then* no analytics or tracking scripts are present.
- **AC-N6.3** (**Proposed**) *If* OQ-28 is approved, *then* no cookies or browser storage entries are created.
- **AC-N7.1** (**Approved**) *Then* the chart's time axis and all times shown in the interface are in UTC, the interface makes clear that they are in UTC, and each 1d candle starts at 00:00 UTC.
- **AC-N8.1** (**Proposed**) *During* one minute that includes 20 timeframe switches, *then* the request weight Binance reports as used stays below 600 (10% of the limit).

**P1 — Recent trades**
- **AC-P1.1** (**Proposed**) *Then* trades are shown newest first and update live without a reload.
- **AC-P1.2** (**Proposed**) *Then* each trade shows price (USDT), amount (BTC) and time, matching Binance's recent trades.
- **AC-P1.3** (**Proposed**) *Then* the list never exceeds its configured length (OQ-21).
- **AC-P1.4** (**Proposed**) *Before* the first trade arrives, *then* the loading or "no trades yet" state is shown, and invented trades never appear.
- **AC-P1.5** (**Proposed**) *When* the connection is lost, *then* the trades panel is marked stale with the connection and recovers automatically.
- **AC-P1.6** (**Proposed**) *With* P1 enabled, *then* AC-10.2 still passes.

## 17. Core MVP release definition

The Core MVP may be released publicly only when all of the following are met.

**Mandatory — Approved:**

1. The project owner has reviewed and explicitly approved the final visual design.
2. The implementation has been verified against the approved visual design.

**Proposed:**

3. All Approved Core MVP acceptance criteria (FR-01 to FR-12 and the NFRs, §16) pass on the production Cloudflare Pages deployment in the supported browsers.
4. The licence and terms review (brief R4) is complete, including V-01 to V-03, and the footer attributions match its outcome.
5. No out-of-scope functionality is present (§15.1, plus §15.2 once approved).
6. Every open question marked as needed for release is resolved.
7. The documentation is updated: brief, this document, `TECHNICAL_SPEC.md` and `README.md`.
8. The project owner signs off on the release.

**Approved:** P1 is not required. The Core MVP can be released without the recent trades feed.

## 18. P1 release definition

**Approved:**

1. The P1 visual design has been approved by the project owner before P1 UI implementation begins (§1.3).

**Proposed:**

2. The P1 implementation has been verified against the approved P1 visual design.
3. All Approved P1 acceptance criteria (§16) pass.
4. All Approved Core MVP acceptance criteria still pass.
5. No out-of-scope functionality is present (§15.1, plus §15.2 once approved).
6. The documentation is updated.
7. The project owner signs off on the release.

## 19. Open questions and deferred decisions

### 19.1 Open questions

| ID | Question | Proposed default | Needed before |
|---|---|---|---|
| OQ-03 | How will the approved visual design be referenced from the repository? | Project owner's decision | UI implementation |
| OQ-06 | Chart interactions: crosshair, hovered-candle readout, pan, zoom, reset | Project owner's decision | Visual design |
| OQ-08 | Volume and amount format: full or abbreviated, number of decimals | Project owner's decision | Visual design |
| OQ-11 | Visible retry control in error states, or automatic recovery only | Project owner's decision | Visual design |
| OQ-12 | Add "Not affiliated with Binance or TradingView" to the footer | Include, consistent with Binance's no-implied-endorsement terms | Release |
| OQ-13 | Show the product name in the interface | Project owner's decision | Visual design |
| OQ-14 | UI language | Project owner's decision | Visual design |
| OQ-15 | Number and date formatting locale | Project owner's decision | Visual design |
| OQ-17 | Minimum supported width, tablet behaviour and breakpoints | 360 px minimum (proposal, not approved) | Visual design |
| OQ-19 | Accessibility target | WCAG 2.2 AA for non-chart interface | Visual design |
| OQ-21 | P1: number of trades listed; show buy/sell side | Project owner's decision | P1 visual design |
| OQ-22 | How to test the regional restriction state | Decide in `TECHNICAL_SPEC.md` | Release |
| OQ-25 | Keep the TradingView logo on the chart in addition to the footer attribution | Project owner's decision | Visual design |
| OQ-26 | Final Binance attribution wording, including whether to name "Binance Vision" | "Market data: Binance", final after the terms review | Release |
| OQ-28 | Privacy constraints: no cookies, no browser storage, no personal data | Adopt all three | Implementation |
| OQ-29 | Last-update time format: relative (for example "12 s ago") or absolute. Split from OQ-10. | Project owner's decision | Visual design |

### 19.2 Resolved during drafting

| ID | Resolved | Resolution |
|---|---|---|
| OQ-01 | 2026-11-10 | Claude drafts the low-fidelity ASCII wireframes for the project owner's review. |
| OQ-02 | 2026-11-10 | The design approval gate blocks UI implementation. A non-UI data layer after Sprint 1 requires an approved `TECHNICAL_SPEC.md` and the project owner's explicit approval. |
| OQ-04 | 2026-11-10 | Read-only research was approved and completed (§2.4, §20). |
| OQ-05 | 2026-11-11 | Default timeframe on load: 1h (FR-06). |
| OQ-07 | 2026-11-11 | Initial candle history: the 500 most recent candles for the selected timeframe (FR-05). |
| OQ-09 | 2026-11-11 | One global connection status indicator, with local indicators for data groups that fail or become stale (FR-08, §7.4). |
| OQ-10 | 2026-11-11 | Stale threshold: 10 seconds for 24h statistics and candles (§7.2). The last-update display format stays open as OQ-29. |
| OQ-16 | 2026-11-11 | Time zone: UTC for the chart's time axis and all times in the interface (§5.4). |
| OQ-18 | 2026-11-11 | Supported browsers: the latest two major versions of Chrome, Edge, Firefox and Safari (desktop and mobile), plus Chrome for Android; tested before release in desktop Chrome, desktop Firefox and Safari on iPhone. Approved in `TECHNICAL_SPEC.md` §12.3. |
| OQ-20 | 2026-11-11 | Performance targets: first data within 3 s under Fast 4G; total JavaScript bundle below 200 KB gzipped. Approved in `TECHNICAL_SPEC.md` §12.4. |
| OQ-23 | 2026-11-11 | Candle volume unit: BTC, the base asset (§2.3, FR-05). |
| OQ-24 | 2026-11-11 | Daily candle boundaries: 00:00 UTC (§5.4). |
| OQ-27 | 2026-11-10 | btcmtg is non-commercial and non-monetized under the current Binance public market data approach. Future commercialization requires a separate review. Recorded in §1.5 and §15.1. |

### 19.3 Deferred decisions

| Decision | Deferred to |
|---|---|
| Hosts, endpoints, streams and fallback strategy | `TECHNICAL_SPEC.md` |
| Reconnection timing and backoff | `TECHNICAL_SPEC.md` |
| Individual or aggregated trades (P1) | `TECHNICAL_SPEC.md` |
| Technical representation of source gaps | `TECHNICAL_SPEC.md` |
| Testing and code-quality tools | Approval of each tool |
| CSS approach, theme and any additional libraries | Approval by the project owner |
| Visual design, including how states, stale marks and gaps look | Project owner |

### 19.4 Items needing manual verification

| ID | Item | Needed before |
|---|---|---|
| V-01 | Binance Terms of Use: automated retrieval failed; review manually. | Release |
| V-02 | Binance list of prohibited countries: automated retrieval failed (HTTP 503); review manually. | Release |
| V-03 | Whether the Binance Vision Dataset Terms apply to the market-data-only API hosts. | Host decision in `TECHNICAL_SPEC.md` |
| V-04 | Behaviour from restricted locations: status codes, and whether a browser can read them. | Release (OQ-22) |
| V-05 | Cross-origin behaviour in a real browser. Command-line tests were run on 2026-11-10; real-browser verification is still outstanding. | Finalizing the technical approach in `TECHNICAL_SPEC.md` |

## 20. Sources

Official sources, accessed 2026-11-10:

- Binance Spot API — General API Information: https://developers.binance.com/docs/binance-spot-api-docs/rest-api/general-api-information
- Binance Spot API — Market Data Endpoints: https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints
- Binance Spot API — WebSocket Streams: https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams (source: https://github.com/binance/binance-spot-api-docs/blob/master/web-socket-streams.md)
- Binance Spot API — Market Data Only: https://developers.binance.com/docs/binance-spot-api-docs/faqs/market_data_only
- Binance Spot API — Changelog: https://github.com/binance/binance-spot-api-docs/blob/master/CHANGELOG.md
- Binance Vision Dataset Terms v1.0 (updated 2026-08-26): https://data.binance.vision/Binance_Vision-Terms_of_Use.pdf
- Binance Terms of Use (not retrieved, V-01): https://www.binance.com/en/terms
- Binance List of Prohibited Countries (not retrieved, V-02): https://www.binance.com/en/legal/list-of-prohibited-countries
- TradingView Lightweight Charts — README (licence and attribution): https://github.com/tradingview/lightweight-charts
- TradingView Lightweight Charts — NOTICE: https://github.com/tradingview/lightweight-charts/blob/master/NOTICE
- TradingView Lightweight Charts — `attributionLogo` (v5.3 docs): https://tradingview.github.io/lightweight-charts/docs/api/interfaces/LayoutOptions#attributionlogo

Tests run on 2026-11-10:

- Cross-origin response headers of Binance's public REST hosts, checked from the command line (V-05).
- A 13-second sample of Binance's live 24h statistics, candle and trade streams for BTC/USDT.
- Binance's exchange information for BTC/USDT: price tick, quantity step and rate limits.

Community sources (not authoritative):

- https://dev.binance.vision/t/new-candlestick-kline-generation-behavior/137
- https://dev.binance.vision/t/missing-kline-when-no-transaction-change-was-made-after-22th-april-9-57am-utc/10553
- https://dev.binance.vision/t/api-error-451-unavailable-for-legal-reasons/13828
- https://dev.binance.vision/t/binance-international-api-do-not-respond-with-error-code-451-for-public-get-endpoints/13990
- https://dev.binance.vision/t/public-rest-api-for-commercial-use-case/23067

## 21. Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-11-10 | First draft for review. |
| 1.0 | 2026-11-11 | Approved by the project owner. §5.3 approved; UTC must be made clear in the interface (§5.4); OQ-28 is now needed before implementation; meaning of Approved acceptance criteria clarified (§16). |
