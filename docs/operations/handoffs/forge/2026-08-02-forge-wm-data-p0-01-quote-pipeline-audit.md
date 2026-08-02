# WM-DATA-P0-01 — Live-quote pipeline audit: `+0.00%` rail + contradictory provenance · ROOT-CAUSE (Forge)

**From:** Forge (Principal Architect) · **Date:** 2026-08-02 · **Repo HEAD:** `d81a592`
**Type:** Root-cause + evidence gate + fix contract for Noah. Forge does not ship (DEC-008/DEC-012).
**Founder proof (Atlas Chrome capture, ~12:40 CDT Sun):** whole ticker rail `+0.00 +0.00%` (AAPL stale −7.82% from Fri); NQ1! `YAHOO·DELAYED` + `Market Closed`; SPY shows **`FINNHUB·DELAYED`** and **`● ALPACA·LIVE`** simultaneously; tastytrade connected but invisible in UI.

---

## 0. Honesty framing (read first — do not "fix" this by faking live data)

It is **Sunday 12:40 CDT**. US **equities are closed** (reopen Mon) and **CME futures are closed** (reopen ~17:00 CT Sunday). So for equities and futures, *"no live tick right now"* is **correct**, and any fix that makes them appear to tick would violate rule §5. **Crypto (BTC/ETH) is 24/7 — if it shows `+0.00%`, that is a genuine live-feed break.**

So the Founder-visible defect is **not primarily "the feed is down."** It is four separate truthfulness/correctness bugs (below). The honest end state is: *show the last real session's change labeled "at close", label liveness per asset class correctly, and stream what genuinely is live (crypto now; futures after 17:00 CT).*

## 1. Provider matrix by asset class (routing from code; liveness = evidence gate)

Routing verified in `src/hooks/useWebSocket.ts`; **"live right now" must be measured** (unknown—not yet measured), same discipline as `WM-CHART-P0-01A`.

| Asset class | Preferred | Fallback chain | Live path | `Market Closed` gate effect |
|---|---|---|---|---|
| Equities RTH (AAPL/TSLA/NVDA) | Finnhub WS (`:874`) + Alpaca proxy WS (`:948`) | REST `fetchRealQuote` 1.5s (`:890`) | WS + REST | cosmetic label only (§2) |
| Equities extended | Alpaca/Yahoo REST | REST poll | REST | cosmetic |
| Index ETFs SPY/QQQ | Finnhub WS + Alpaca proxy | REST | WS+REST | cosmetic |
| Futures /ES /NQ /RTY /YM /GC /CL | Yahoo REST (`:85`, `isFutures`→no Finnhub/proxy) | Yahoo REST poll | **REST only** | mislabeled closed weekend (§2) |
| Crypto BTC/ETH | Coinbase WS (`:397` primary) | Binance.US WS (`:287`) → exchange REST | **WS 24/7** | should never be "closed" |

**Observation (unverified, for the evidence owner):** futures have **no WS path at all** — Yahoo REST only. That alone makes futures feel frozen vs TradingView even during futures hours. Measure and record per cell.

## 2. `Market Closed` gate audit — it is COSMETIC and NAIVE (not the suppressor)

`src/components/chart/BottomIndexBar.tsx:8-22` `getSessionLabel()`:
```
const day = now.getUTCDay(); if (day === 0 || day === 6) return "Market Closed";
```
Findings:
- **F-1 · It is display-only.** It sets a footer label; it does **not** gate `useWebSocket` polling/WS. So it is **not** why the rail reads `+0.00%`. (Do not chase it as the suppressor.)
- **F-2 · Asset-class-blind.** Returns "Market Closed" Sat/Sun for **all** symbols — wrong for crypto (24/7) and for futures once they reopen 17:00 CT Sunday. This is the mislabel the Founder sees on NQ1!.
- **F-3 · DST-broken + UTC-day.** Hardcoded `etOffset = -5` (`:11`, `:48`) ignores DST; `getUTCDay()` bins by UTC, so the Fri-night/Sun-evening CT boundaries (exactly when futures close/open) are computed wrong.

**The gate must be replaced by a single asset-class-aware, DST-correct `isMarketOpen(assetClass, ts)` — see §5.**

## 3. The actual `+0.00%` cause — day-change collapses to zero

`useWebSocket.ts:114-118`:
```
const prev = j?.prevClose ?? j?.pc ?? j?.open ?? price;   // falls through to `price`
const change = j?.change ?? +(price - prev).toFixed(4);   // → 0 when prev === price
```
- **F-4 · When the quote payload lacks `prevClose`/`pc`/`open`, `prev` falls through to `price`, so `change = price − price = 0` → `+0.00%`.** On a weekend many providers return only a last price (no session delta), so most symbols zero out. AAPL differs only because its provider happened to return a `pc`/`change` (hence Friday's −7.82% survives). This provider-inconsistent fallthrough is the frozen-rail root cause — **not** market-closed.
- Honest fix: preserve the **last real session change** and label it (e.g. `−7.82% · at Fri close`), never silently render `+0.00%`. Zero is a *measured* value only when `prevClose` is real and equal — otherwise it is "unknown", which must not display as `0.00`.

## 4. Same-symbol provenance contradiction (SPY `FINNHUB·DELAYED` vs `ALPACA·LIVE`)

Two independent liveness/provenance determinations for one symbol/instant:
- **Chart pill:** `MainChart.tsx:6594-6607` — `const extra = b.live ? " LIVE" : " DELAYED"`, driven by the **candle provider's** `b.live` flag (Alpaca supplied candles → `ALPACA·LIVE`).
- **Header/feed pill:** `useWebSocket` `source`/`tapeSource` (`:882`, `:910`) — driven by the **quote/tape feed** (Finnhub → `FINNHUB·DELAYED`).

**F-5 · There is no single provenance resolver.** Candle-liveness and feed-liveness are computed separately and can legitimately differ (Alpaca candles + Finnhub tape), then rendered as two contradictory badges. This is the `WM-CHART-P0-05` truthfulness class on a **new surface pair** P0-05 didn't unify (chart-pill vs feed-source). Root cause = duplicated provenance, not a wrong value.

## 5. Tastytrade quote wiring — honest gap, file the ticket

- Tastytrade **has** a streaming-quote capability: `tastytrade.ts:202-206` probes `/api-quote-tokens` (dxFeed) and sets `quotes: true`. So dxFeed quotes are obtainable for the connected account.
- **F-6 · Zero consumers.** `grep` finds **no** tastytrade quote consumer in `useWebSocket` or the tape pipeline — the adapter serves accounts/capabilities (and the DEC-005-flagged order lifecycle) only, **not quotes**. So the connected tastytrade session contributes nothing to the ticker/chart, and is invisible.
- This is the honest gap the Founder rule demands we name, not fake. **File `WM-BROKER-QUOTE-P0-01`** — integrate the tastytrade/dxFeed streaming quote as a real provider in the fallback chain (especially valuable for **futures**, which currently have no WS path — §1). Do **not** claim tastytrade liveness until a verified quote timestamp proves it (`tastytrade.ts:211` doctrine).

## 6. Fix contract for Noah — `WM-DATA-P0-01`

**Files:** `src/hooks/useWebSocket.ts`, `src/components/chart/BottomIndexBar.tsx`, `src/components/chart/MainChart.tsx`, new `src/lib/marketSession.ts`, new `src/lib/quoteProvenance.ts`.

1. **Single source of truth `isMarketOpen(assetClass, ts)`** in `src/lib/marketSession.ts` — DST-correct America/New_York + CME calendar: equities RTH/extended; **futures 24/5 with the Fri 16:00→Sun 17:00 CT closure**; crypto always-open. Replace `getSessionLabel()` (F-2/F-3) and any other ad-hoc weekend check with it. Deprecate every "close everything Sat/Sun" path.
2. **Honest day-change (F-4):** never fall `prev` through to `price`. If no real `prevClose`, do not compute a fabricated 0 — carry the **last real session close** and render `change` with an explicit `at close`/`prev session` label; if genuinely unknown, render `unavailable`, never `+0.00%`.
3. **Single provenance resolver (F-5):** `src/lib/quoteProvenance.ts` resolves one `{ provider, live: boolean, reason }` per symbol/instant from BOTH candle-liveness and feed-liveness, with a defined precedence and an honest combined label; both the chart pill and the header pill read it. No surface computes liveness independently.
4. **Crypto live check:** confirm Coinbase/Binance WS actually stream now; if BTC/ETH read `+0.00%`, that is a real break (F, not "closed") — fix the WS path.
5. **Futures:** with no WS path, at minimum poll REST during futures hours and label `DELAYED`; the real WS/quote upgrade is `WM-BROKER-QUOTE-P0-01` (tastytrade/dxFeed).

**Tests:** `marketSession.test.ts` (equity/futures/crypto open-state across Fri-close/Sun-open/DST boundaries); day-change never renders `0.00` when `prevClose` is absent (renders last-close-labeled or `unavailable`); provenance resolver yields ONE label per symbol (no chart/header contradiction) under mixed candle/tape providers.

**Acceptance:** on a weekend, equities/futures show last-session change labeled `at close` (not `+0.00%`) and an honest closed/label; crypto streams live or honestly reports the break; SPY shows **one** consistent provenance badge; futures labeled honestly; type-check + tests + 69-page build green.

**Sentinel re-verify:** live Chrome capture — (a) no `+0.00%` where a last-session change exists; (b) SPY single provenance badge; (c) crypto ticking or honest-unavailable; (d) after 17:00 CT, futures reflect the open honestly; (e) no surface labels delayed data as `LIVE`.

## 7. Tickets spun out
- **`WM-BROKER-QUOTE-P0-01`** (new) — tastytrade/dxFeed streaming quotes into the provider chain (F-6); Founder-gated read-only, no order actions.
- Cross-ref `WM-CHART-P0-05` (provenance truthfulness class) — F-5 is the same class, unresolved surface pair.

**BATON → Noah** for §6 (single `isMarketSession` + honest change + single provenance). **File `WM-BROKER-QUOTE-P0-01`** for the tastytrade quote gap. Cite this handoff in commits. Do not fake any live feed (rule §5).
