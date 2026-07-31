# WM-VP-P0-01 — Session Volume Profile broke AGAIN · ROOT-CAUSE (Forge)

**From:** Forge (Principal Architect) · **Date:** 2026-07-31 · **Repo HEAD:** `50dc7cb`
**Type:** Architecture root-cause + contract for Noah. **Forge does not ship this** (DEC-008 lane / DEC-012 — Noah implements).
**Founder proof:** TSLA 15m, 08:52 CDT (09:52 ET, ~22 min into RTH) — Session VP absent / wrong. **Second recurrence.**

---

## 1. Why the prior two "fixes" did not hold

| Commit | What it actually changed | Why it was a symptom patch |
|---|---|---|
| `c78bc69` "Restore truthful fixed and session volume profiles" | Re-derived the profile from OHLCV, removed synthesized bid/ask | Kept the **independent Yahoo fetch** inside the component |
| `c09b174` "harden non-manifest Yahoo consumers" | Guarded the Yahoo response shape | Hardened the **duplicate pipeline** instead of removing it |

Both fixes operated *inside* `WMSessionVP`'s own data path. Neither addressed the structural fact that **the Session VP fetches its own candles instead of consuming the chart's canonical candle series.** So every time the chart's provider, symbol-mapping, or data-shape changes, the VP silently diverges again. That is the definition of a recurring defect: the fix and the bug live in two different pipelines.

## 2. Root cause (architectural, byte-precise)

`src/components/chart/WMSessionVP.tsx`:

- **L146** subscribes to `useWebSocket({symbol,timeframe})` for ticks, but
- **L149–165** runs its **own** `fetch('/api/yahoo?...&tf=${profileTf}&bars=3000&ext=1')` for candles — **hardcoded to Yahoo**, regardless of which provider the chart actually rendered (`MainChart` records provider provenance around L1157/L1582; the VP ignores it).
- It does **not** use `DataVersionGuard` / `dataVersion` from `src/lib/chartContext.ts` (WM-CHART-P0-02). Its only staleness protection is a local `cancelled` closure flag — which cannot coordinate with the chart's canonical version boundary.

Three concrete failure modes this produces:

- **F-A · Provider divergence → "absent."** For any symbol the chart renders via Alpaca/exchange (crypto, futures, or a Yahoo-unmapped ticker), the VP's Yahoo fetch returns empty or a mismapped series → `levels.length === 0` → the whole panel shows *"No reported volume for this session."* The chart shows candles; the VP shows nothing. That is the "absent."
- **F-B · Stale-session → "wrong."** `selectSessionCandles` (L90–109) picks `latestDate = eligible.at(-1)?.date` and keeps only that date. Early in the live RTH session, Yahoo intraday for *today* is frequently delayed/not yet returned, so `latestDate` resolves to **yesterday** → the panel renders **yesterday's** RTH profile as if it were the live session. At 09:52 ET that is exactly "Session VP wrong."
- **F-C · Empty-gate hides live tape.** L224 gates the entire panel on `loading || levels.length === 0`. When the bar-derived fetch is empty, live ticks (which *are* flowing via L193) can never render, because the component returns the empty state before the tick layer paints.

## 3. The invariant that must hold (this is the acceptance spine)

> **The Session VP is a pure projection of the exact candle series the chart rendered for the current `dataVersion` — same provider, same symbol, same timeframe — filtered to the selected session window. It never fetches its own candles. It holds no level/tick state across a `dataVersion` boundary.**

Formally, for a given `(symbol, timeframe, provider, dataVersion)`:
`VP.candleInput ≡ Chart.canonicalCandles(dataVersion)` (byte-identical array reference/derivation), and `VP.levels` recompute atomically when `dataVersion` changes; on change, prior `levels` and accumulated ticks are dropped, not carried.

## 4. Contract for Noah — `WM-VP-P0-01`

**Files:**
- `src/components/chart/WMSessionVP.tsx` — remove the internal `/api/yahoo` fetch (L149–165). Accept candles + provenance as props (or via a shared chart context/store) from `MainChart`, which already owns the canonical, provider-correct candle array.
- `src/components/chart/MainChart.tsx` — pass the canonical candle series + `dataVersion` + resolved provider to the VP (the data the chart already fetched; no second network call).
- `src/lib/chartContext.ts` — VP consumes `dataVersion`; recompute keyed to it (reuse `DataVersionGuard.isCurrent` semantics — do not reinvent).

**Behavior:**
1. VP input candles = the chart's rendered candles, not a Yahoo refetch. **Delete F-A's provider hardcode.**
2. Session selection must key off the **live trading day** explicitly; if today's session has no candles yet, show an honest `"Session starting — awaiting first bars"` state, **never** silently substitute the prior day (fixes F-B). No stale-date fallback.
3. Split the empty gate: bar-derived-empty must NOT suppress the live-tape layer (fixes F-C). Panel shows whichever layers have real data, each labeled.
4. On `dataVersion` change: drop `levels` + tick accumulation atomically (no cross-symbol/provider bleed — same defect class as WM-CHART-P0-06 tick fold).

**Tests (must exist, `tests/`):**
- VP candle input equals the chart's candle array for the same `(symbol,tf,dataVersion)` — no independent fetch is issued (assert `/api/yahoo` is **not** called by the VP).
- Symbol switch A→B: VP levels for B never contain A's price bins (race guard).
- Early-session (today's intraday empty) renders the honest "awaiting bars" state, **not** yesterday's profile.
- Crypto/exchange-provider symbol renders a VP (or an honest `unavailable`), never a blank Yahoo-driven panel.

**Acceptance:** TSLA 15m at RTH open shows the *current* session profile that matches the chart's candles; switching symbol/provider never shows a stale or empty panel while the chart has data; type-check + full tests + 69-page build pass; **Sentinel** independently confirms on a live-market symbol across ≥2 providers.

**Do NOT** reintroduce any provider fetch inside the VP. If historical session depth beyond the chart's loaded window is needed, that is a *separate* ticket routed through the canonical provider matrix (`WM-CHART-P0-01A`), not a hardcoded Yahoo call.
