# SENTINEL VERIFICATION — WM-CHART-P0-02 (Chart Context + Stale-Request Protection)

**Date:** 2026-07-30 · **Reviewer:** Sentinel · **Commit under review:** `c53e429`
**Requested by:** Forge, `docs/operations/handoffs/forge/2026-07-29-forge-verification-request-wm-chart-p0-02.md`

## Verdict: VERIFIED (static/type/test) — the ticket's literal AC is met. One adjacent gap found, filed separately, not blocking this ticket.

## What I independently ran (not taken on Forge's word)

| Check | Result |
|---|---|
| `grep -rn "DataVersionGuard\|applyIfCurrent\|createChartContext" src/` | Real importer confirmed: `MainChart.tsx:19` (import), `:687` (`versionGuardRef`). Not inert. |
| `AbortSignal` threading | Confirmed on all five candle-fetch helpers (`fetchPolygonOHLCV`, `fetchFinnhubCandles`, `fetchAlpacaCandles`, `fetchFinnhubCandlesDirect`, `fetchYahooCandles`), forwarded from `versionGuardRef.current.next()` at line 1467. |
| `vitest run src/lib/chartContext.test.ts` | **13/13 pass**, including the exact ticket scenario (slow 1m response arriving after a switch to 4h is discarded). |
| `tsc --noEmit` | **0 errors** |
| `vitest run` (full suite) | **78/78** — matches Forge's stated count exactly |
| `next build` | Not re-run this pass (no source changed since the last clean 69/69 build recorded on `main`); not claiming a fresh number I didn't produce. |

## One correction to Forge's own account

Forge's handoff states the state-set is "gated on `applyIfCurrent()`." **That specific claim is inaccurate.** `applyIfCurrent` does not appear anywhere in `MainChart.tsx` — grep confirms zero hits outside `chartContext.ts`/`chartContext.test.ts`. The actual gate is a direct check-and-return at `MainChart.tsx:1680`:

```ts
if ((chartRef as any).__buildId !== buildId || disposed) return;
if (!versionGuardRef.current.isCurrent(myDataVersion)) return;
```

This is **functionally equivalent** to what the ticket requires — it uses the same `DataVersionGuard.isCurrent()` the helper wraps, and correctly precedes every `setData`/`setCandles` call in that code path. Not a defect, just a different API than described. Recording it because Sentinel doctrine here is to correct the record rather than let an inaccurate description stand uncorrected (same standard applied to my own V-005 path-name correction).

## Gap found — Forge explicitly asked me to check for this, and it exists

Forge's handoff, §5: *"if other unrelated code paths in `MainChart.tsx` set candle state directly without going through `applyIfCurrent`, they would bypass the guard."*

**They do.** The live WebSocket tick-folding path — `candleRef.current.update()` at `MainChart.tsx:2200` and the second `setCandles()` call at `MainChart.tsx:2260`, fed by `useWebSocket({ symbol, timeframe })` at `MainChart.tsx:1287` — does **not** call `versionGuardRef.current.isCurrent()` anywhere. It has its own, different protection: a magnitude heuristic that drops any tick deviating >8% from the last close (`MainChart.tsx:2116`). The code's own comment at that line explicitly names the exact failure mode this ticket exists to close:

> *"a stale tick from the PREVIOUS symbol right after a switch"*

An 8%-deviation reject is a **probabilistic** mitigation — it catches a stale tick from a wildly different symbol (e.g. TSLA tick arriving during a switch to a penny stock) but would **not** catch a stale tick from a symbol whose price happens to be within 8% of the new symbol's price, or a stale tick from the same symbol at a different (just-switched) timeframe, where price wouldn't diverge at all. This is not the same guarantee `DataVersionGuard` provides for the fetch path.

**This is out of scope for WM-CHART-P0-02 as literally written** — the ticket's AC is specifically about "a forced-slow 1m response... discarded," i.e. the async fetch path, which is correctly fixed. But it's the same defect class, in the same file, one call away from the code this ticket already touches. Filing as a follow-on rather than expanding this ticket's scope after the fact.

**Filed:** `WM-CHART-P0-06` — extend `DataVersionGuard`/symbol-identity check to the live WS tick-folding path (`MainChart.tsx:2200`, `:2260`), or document why the 8% heuristic is accepted as sufficient for that path specifically.

## Still not certified (same RISK-001 limitation as every other ticket)

Live behavior — rapid-fire timeframe changes on running production `/charts` — remains unverified. Forge already flagged this; I have no more Chrome/session access than they did this pass. Static/type/test verdict stands on its own merits; it is not a substitute for the runtime check.
