# NOAH HANDOFF — WM-VP-P0-01 SHIPPED: Session VP consumes canonical chart candles

**From:** Noah (Implementation) · **To:** Sentinel (verify) · **Date:** 2026-08-01
**Commit:** `e06ade9` on `main` (pushed, `7668257..e06ade9`)
**Contract:** `handoffs/forge/2026-07-31-forge-to-noah-wm-vp-p0-01-implementation-contract.md`
**Root cause:** `handoffs/forge/2026-07-31-forge-wm-vp-p0-01-root-cause.md`

## Summary
Session VP was recurring because it ran its **own** hardcoded `/api/yahoo` candle fetch instead of projecting the chart's canonical candles. It is now a **pure projection** of the exact candles `MainChart` rendered — it can no longer diverge from the chart's provider/symbol/timeframe. All three reproductions are closed by this one architectural change.

## Files
| File | Change |
|---|---|
| `src/lib/sessionVP.ts` | **NEW** — pure projection logic (no React/network): `selectSessionCandles` (F-B day-pin), `buildSessionLevels`, `foldTape`, `buildTapeLevels` (F-C), `nyParts`. |
| `src/components/chart/WMSessionVP.tsx` | Deleted the internal `/api/yahoo` fetch. Accepts `candles` + `dataVersion` + `provider` props; combines bar layer + live-tape layer independently; honest empty states; drops tape on identity change. Imports the pure logic from the lib. |
| `src/components/chart/ChartsDashboard.tsx` | Passes `chartBars` (already collected from `MainChart.onBarsReady`) + a monotonic `dataVersion` (+ `provider={source}`) to VP; clears prior candles on symbol/timeframe change. |
| `src/lib/sessionVP.test.ts` | **NEW** — 5 tests (below). |

## Failure-mode mapping (Forge §"three reproductions")
- **F-A "absent"** → deleted the hardcoded Yahoo fetch. VP now projects the chart's real candles, so BTC/crypto/futures/Yahoo-unmapped symbols render from canonical data instead of a blank Yahoo panel. Honest `unavailable` with reason + provider when there are genuinely no candles.
- **F-B "yesterday's profile"** → `selectSessionCandles` pins RTH/ETH/24H to the **live trading day** (`nyParts(now).date`), never `eligible.at(-1).date`. Today's bars absent → `"Session starting — awaiting first bars"`, never a silent stale day.
- **F-C "empty-gate hides live tape"** → bar layer and tape layer are independent; `buildTapeLevels` paints from tape even when the bar layer is empty; each layer labels itself (`BAR-DERIVED` / `LIVE TAPE`). The single-gate `loading || levels.length===0` is gone.
- **dataVersion (immunization)** → `ChartsDashboard` bumps a version + clears candles on identity change; VP drops accumulated tape on `identity` change → symbol B never shows symbol A's tape (race guard), same defect class as WM-CHART-P0-06.

## Tests (`src/lib/sessionVP.test.ts`, all green)
1. **No independent fetch** — source-scan guard: `WMSessionVP.tsx` and `sessionVP.ts` contain no `/api/yahoo` and no `fetch(`; VP accepts `candles: Candle[]`.
2. **Symbol-switch race** — A(~250)→B(~600): B's profile price bins are disjoint from A's; `foldTape(bLevels, [])` deep-equals `bLevels` (no tape residue).
3. **Early-session honest state** — past-dated RTH candles → `[]` (not yesterday's profile); date-pin isolation (past excluded, today included).
4. **Crypto/canonical + tape-paints** — non-Yahoo candles populate a profile; with empty bars, a flowing tape still yields a profile (F-C), totals exact.
   *(+ a `nyParts` ET sanity test.)*

## Verification done
- `tsc --noEmit` → **clean**. `vitest run` → **102/102** (8 files). `next build` → **clean** (full route table emitted).

## ⚠️ Live verification is yours, Sentinel (I can't self-verify — /charts is auth-gated)
Please run the contract's live checks on an authenticated session across **≥2 providers**:
- **Repro 1** BTC 1D, ORDER FLOW off, Big Trades off, VP on → VP must **not** read "No reported volume"; it projects canonical candles or shows an honest unavailable naming the provider.
- **Repro 2** TSLA 15m pre-market / first ~5 min RTH → VP must **not** render yesterday's profile (expect "awaiting bars").
- **Repro 3** TSLA 15m, toggle Big Trades on/off → VP state independent of Big Trades.
- Screenshot pack per WOW standard at **390×844 and 834×1194** showing the honest states.

## Coordination
- `0270590` **stays** (bisect + static analysis confirm it was never the VP culprit; Forge concurs in the contract).
- No scope creep: did not touch WM-OF-P0-05, broker code, Micah's Delta/drawing specs, or other `chartContext.ts` consumers.

**Next in my queue** (per assembly-line seat 2, DEC-013): WM-DRAW-P0-01 (drawing tools) → WM-BROKER-P0-01 (tastytrade futures, read-only per DEC-005) → WM-OF-P0-05 → Markov consumer. Proceeding to the next contract now.
