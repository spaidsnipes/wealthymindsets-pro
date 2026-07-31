# WM PRO — `WM-CHART-P0-01A` · Canonical Timeframe Contract & Provider Capability Matrix

**Author:** Forge (Principal Architect) · **Date:** 2026-07-30
**Ticket base (declared):** `main @ e1a8c94` · **Evidence read at working tree:** `e14e8dd` (local is *ahead* of the declared base — see §0)
**Type:** Architecture / evidence gate. **No production code changed by this document.**
**Release status:** NO-GO (unchanged). **Implementation owner:** Forge, under `WM-CHART-P0-01`.

**Status legend:** `native` · `aggregated` · `unsupported` · `unknown—not yet measured` · `CODE-ASSERTS` (declared by current source, *not* a live measurement).

---

## 0. Scope, honesty notes, and what this gate does / does not do

This document defines **one** timeframe language for WM Pro and the **structure + methodology** for proving each provider's real capability. It is the gate that must pass before `WM-CHART-P0-01` is accepted.

Two honesty caveats up front:

1. **Base-commit drift.** The ticket names base `e1a8c94`; the local `main` HEAD is `e14e8dd` (ahead). All file/line citations below are as of the working tree `e14e8dd`. Sentinel must re-confirm against whatever commit is actually deployed before signing off.
2. **No cell in the matrix is "measured" yet.** Everything I can state today comes from *reading the source*. Source-declared behavior is labeled **`CODE-ASSERTS`** and is **not** acceptable as final evidence. The `Evidence` column is `unknown—not yet measured` until the evidence owner runs the read-only probes in §7. This satisfies the acceptance rule *"measured evidence or `unknown—not yet measured`"* — it does not shortcut it.

---

## 1. Canonical identifiers — the 19, with documented semantics

Canonical ID identifies **candle (bar) duration only**. It never encodes how much history is visible. `class` groups the arithmetic rule that governs aggregation.

| Canonical ID | Meaning (one bar =) | Class | Notes |
|---|---|---|---|
| `1m`  | 1 minute      | intraday | base intraday unit |
| `2m`  | 2 minutes     | intraday | |
| `3m`  | 3 minutes     | intraday | |
| `5m`  | 5 minutes     | intraday | |
| `10m` | 10 minutes    | intraday | |
| `15m` | 15 minutes    | intraday | |
| `30m` | 30 minutes    | intraday | |
| `45m` | 45 minutes    | intraday | rarely native; almost always aggregated |
| `1h`  | 60 minutes    | intraday | |
| `2h`  | 120 minutes   | intraday | |
| `4h`  | 240 minutes   | intraday | |
| `1D`  | 1 trading day | session  | calendar/session-bounded, **not** 86 400 s of wall-clock |
| `1W`  | 1 trading week| session  | trading-week close, not 7×86 400 s |
| `1M`  | 1 calendar month | calendar | variable length (28–31 days) |
| `3M`  | 1 calendar quarter | calendar | 3 calendar months |
| `6M`  | 1 calendar half-year | calendar | 6 calendar months |
| `1Y`  | 1 calendar year | calendar | |
| `2Y`  | 2 calendar years | calendar | |
| `5Y`  | 5 calendar years | calendar | |

**Rule restatement (normative, from the ticket):**

- R1 `D`/`W`/bare `M` are **invalid** internal IDs → `1D`/`1W`/`1M`.
- R2 Candle duration ≠ visible range. `visibleRange` is a **separate** field; changing it must never change the candle interval.
- R3 Provider syntax (`1Min`, `60`, `1mo`, `1d`) must never appear in shared app state — only inside a provider adapter.
- R6 `session` and `calendar` classes are **not** fixed-second arithmetic. `intraday` is.
- R8 Unknown input **fails closed** — typed error, never a silent `1D`.

### 1.1 Interval vs. visible range — the split that is currently broken

State carries two independent fields:

```
interface ChartRequest {
  interval: CanonicalTF     // candle duration — one of the 19
  visibleRange: RangeSpec   // how far back to show / fetch; independent of interval
}
type RangeSpec =
  | { kind: 'bars';   count: number }             // e.g. last 500 bars
  | { kind: 'lookback'; unit: 'D'|'M'|'Y'; n: number }  // e.g. last 5Y of history
  | { kind: 'from'; start: EpochSeconds }
```

**Finding F-1 (root defect).** Today the two are conflated. In `src/app/api/alpaca/route.ts` (`toAlpacaTF`, lines 48–71) `3M`, `6M`, `1Y`, `3Y`, `5Y` **all map to a `1Month` candle** and differ only by `daysBack`. Same pattern in `src/app/api/yahoo/route.ts` (`toYFInterval`, lines 68–92). That means the current UI's "3M/6M/1Y/5Y" are *ranges wearing an interval's clothing* — they are not distinct candle durations at all. The canonical set treats `1M/3M/6M/1Y/2Y/5Y` as **distinct candle durations**; the range is chosen separately. This split is the single biggest behavioral change 01 must make.

---

## 2. Provider capability matrix — structure + current CODE-ASSERTS

Scope key: matrix is per **provider × asset class × canonical TF** (ticket R12). Asset classes in play: **US equity / ETF**, **crypto**, **FX/futures**. Providers: **Alpaca**, **Yahoo**, **Finnhub**, **Polygon**, **Exchange-direct** (Coinbase/Kraken/Bitstamp/BinanceUS/Gemini).

Each cell's final form is:
`<native|aggregated|unsupported>` + (if aggregated) `source TF & rule` + `Evidence: <date/env/endpoint/entitlement/barCount/limits>`.
Until probed, `Evidence = unknown—not yet measured`.

### 2.1 Alpaca — US equity & crypto — `CODE-ASSERTS` from `toAlpacaTF` (alpaca/route.ts:48–71)

| Canonical | Code asserts | Reading | Evidence |
|---|---|---|---|
| `1m`,`2m`,`3m`,`5m`,`10m`,`15m`,`30m` | `1Min…30Min` | native intraday | unknown—not yet measured |
| `45m` | *absent* | **falls through to `1Day` default (F-2)** | unknown—not yet measured |
| `1h`,`2h`,`4h` | `1Hour/2Hour/4Hour` | native | unknown—not yet measured |
| `1D` | `1Day` (key is `"D"`) | native, **but keyed by invalid `D` (F-3)** | unknown—not yet measured |
| `1W` | `1Week` (key `"W"`) | native, invalid key | unknown—not yet measured |
| `1M` | `1Month` (key `"M"`) | native, invalid key | unknown—not yet measured |
| `3M`,`6M`,`1Y`,`5Y` | **all `1Month`** | **range-as-interval (F-1)** — should be `aggregated` from `1M` | unknown—not yet measured |
| `2Y` | *absent — code has `3Y` instead* | **canonical/code set mismatch (F-4)** | unknown—not yet measured |

### 2.2 Yahoo — equity/ETF/FX-futures — `CODE-ASSERTS` from `toYFInterval` (yahoo/route.ts:68–92)

| Canonical | Code asserts | Reading | Evidence |
|---|---|---|---|
| `1m`,`2m` | `1m`,`2m` | native | unknown—not yet measured |
| `3m` | **`5m`** | **silent substitution (F-5, violates R9)** | unknown—not yet measured |
| `5m`,`15m`,`30m` | native | native | unknown—not yet measured |
| `10m` | **`15m`** | **silent substitution (F-5)** | unknown—not yet measured |
| `1h` | `60m` | native-equivalent | unknown—not yet measured |
| `2h`,`4h` | **`60m`** | **silent substitution (F-5)** — should be `aggregated` from `1h` | unknown—not yet measured |
| `1D`,`1W`,`1M` | `1d`,`1wk`,`1mo` (keys `D/W/M`) | native, invalid keys | unknown—not yet measured |
| `3M`,`6M` | `3mo` | native-ish (YF coarsest = 3mo) | unknown—not yet measured |
| `1Y`,`5Y` (+code `3Y`) | `1mo` | **range-as-interval (F-1)** | unknown—not yet measured |
| `45m` | *absent → `1d` default (F-2)* | unsupported/aggregate-only | unknown—not yet measured |

### 2.3 Finnhub — equity — `CODE-ASSERTS` from `FH_RES` (finnhub/route.ts:38–42)

| Canonical | Code asserts | Reading | Evidence |
|---|---|---|---|
| `1m` | `1` | native | unknown—not yet measured |
| `2m` | **`1`** | **silent substitution (F-5)** | unknown—not yet measured |
| `3m` | **`5`** | **silent substitution (F-5)** | unknown—not yet measured |
| `5m` | `5` | native | unknown—not yet measured |
| `10m` | **`15`** | **silent substitution (F-5)** | unknown—not yet measured |
| `15m`,`30m` | `15`,`30` | native | unknown—not yet measured |
| `1h` | `60` | native | unknown—not yet measured |
| `2h`,`4h` | **`60`** | **silent substitution (F-5)** | unknown—not yet measured |
| `1D`,`1W` | `D`,`W` | native | unknown—not yet measured |
| `45m`,`1M`,`3M`,`6M`,`1Y`,`2Y`,`5Y` | *absent → `"1"` (1-min) default (F-2, F-6)* | unsupported | unknown—not yet measured |

> **F-6 is the worst fallback in the tree:** `finnhub/route.ts:118` defaults unknown resolutions to `"1"` (one-minute), so an unmatched long-range request silently returns *minute* candles. (Finnhub's stock-candle endpoint is also widely reported as entitlement-gated on free tier — probe must record HTTP status, not just parse output.)

### 2.4 Exchange-direct — crypto — `CODE-ASSERTS` from exchange/route.ts:70–109

Each exchange snaps to its own native granularity set and **silently substitutes** the nearest:
- Coinbase (`:81`): reduces to nearest of `[60,300,900,3600,21600,86400]` → **substitution**.
- Kraken (`:88`): `interval = round(sec/60)` minutes → arbitrary rounding.
- BinanceUS (`:99`): `D→1d`, `W→1w`, else passes `tf` raw.
- Gemini (`:105`): only `1m,5m,15m,30m,1h,6h,1d`; **everything else → `15m`**.
No exchange exposes `1M/3M/6M/1Y/2Y/5Y` natively → all `calendar` TFs are `aggregated` or `unsupported` here. `Evidence: unknown—not yet measured` for every cell.

### 2.5 Polygon — **no adapter exists in the tree.**

`grep` finds no `polygon` route under `src/app/api`. Every Polygon × class × TF cell is therefore **`unknown—not yet measured`**, and additionally **`no adapter`** — a prerequisite, not just an unmeasured probe. Do not represent Polygon as available anywhere until both an adapter and probe evidence exist.

---

## 3. Aggregation eligibility (R5, R6)

Aggregation is legal **only** from a *measured-supported* lower interval whose duration divides the target **exactly**, within the same class. Non-divisible → **reject** (typed error), never approximate.

| Target | Class | Legal source(s) & rule | Illegal examples (must reject) |
|---|---|---|---|
| `2m` | intraday | `1m ×2` | from `3m` (2/3 non-integer) |
| `3m` | intraday | `1m ×3` | from `2m` |
| `10m`| intraday | `5m ×2`, `2m ×5`, `1m ×10` | from `3m` (10/3) |
| `45m`| intraday | `15m ×3`, `5m ×9`, `1m ×45` | from `30m` (45/30) |
| `2h` | intraday | `1h ×2`, `30m ×4` | from `45m` (120/45) |
| `4h` | intraday | `1h ×4`, `2h ×2` | from `45m`, `1h30m` |
| `1W` | session  | `1D ×5` **trading days, calendar-aware** | fixed-second math |
| `3M` | calendar | `1M ×3` **calendar-aware** | fixed-second math |
| `6M` | calendar | `3M ×2`, `1M ×6` | mixing across class |
| `1Y` | calendar | `6M ×2`, `3M ×4`, `1M ×12` | from `1W` |
| `2Y` | calendar | `1Y ×2` | from `6M` if `1Y` unmeasured |
| `5Y` | calendar | `1Y ×5` | — |

**R6 enforcement:** `session`/`calendar` aggregation must go through a calendar-aware roll-up (trading-session boundaries, month/quarter/year boundaries), **never** `seconds × n`. Intraday aggregation may use fixed-second math.

---

## 4. Legacy migration map (R11)

Persisted values (chart layouts, saved watchlists, journal entries, backtests) currently store `D/W/M` and — critically — `3Y`, which **is not a canonical ID**.

| Legacy persisted value | Migrates to | Confidence |
|---|---|---|
| `D` | `1D` | deterministic |
| `W` | `1W` | deterministic |
| `M` | `1M` | deterministic |
| `1m…4h`, `1D/1W already-canonical` | identity | deterministic |
| **`3Y`** | **OPEN — do not guess (R11)** | **needs Founder call** |

**F-4 / OPEN-1.** Canonical set has `2Y`; current code has `3Y`. Options: (a) add `3Y` to canonical (→ 20 IDs), (b) migrate persisted `3Y → 2Y` (data change), (c) migrate `3Y → 5Y`. R11 forbids guessing. **This is the one decision this gate cannot make alone.** Recommendation: **(a) drop `3Y` from providers to match the approved 19; migrate any persisted `3Y` to the nearest *supported range*, not a fabricated interval** — but Founder confirms before Forge writes the migration. Any unknown legacy value → typed `LegacyUnmapped` error, surfaced, never silently defaulted.

---

## 5. Failure & unavailable behavior (R7, R8, R9)

No silent anything. Contract:

```
type TFResolution =
  | { ok: true;  provider: ProviderId; native: string }                 // direct
  | { ok: true;  provider: ProviderId; aggregate: { source: CanonicalTF; factor: number } }
  | { ok: false; reason: 'unsupported' | 'unentitled' | 'unmeasured'
              | 'invalid-id' | 'legacy-unmapped'; message: string }      // honest, typed
```

- **Unsupported** (provider genuinely lacks it) → `{ok:false, reason:'unsupported'}` → UI shows the TF **disabled** with the honest reason on hover. Not clickable, not fetched.
- **Unentitled** (endpoint exists but tier blocks it) → distinct reason; UI must not claim "unsupported."
- **Unmeasured** → disabled until §7 probe fills the cell. Never rendered as available.
- **Invalid/legacy-unmapped** → typed error surfaced to caller.
- **No path may return `1D`/`1m` as a substitute.** F-2 and F-6 (`?? {timeframe:"1Day"}`, `?? "1"`) are the exact anti-pattern to delete.

---

## 6. Contract test plan (must exist before 01 is accepted)

Automated tests (`tests/`) covering, at minimum:

1. **Canonical parse** — all 19 IDs parse; `D`/`W`/`M`/`""`/`"1x"`/`3Y` reject with `invalid-id`.
2. **Provider mapping** — every matrix cell returns the declared `native`/`aggregate`/`unsupported`; no cell returns a *different* interval than requested.
3. **Aggregation eligibility** — every §3 legal pair accepted; every illegal pair (`45m` from `30m`, `10m` from `3m`, calendar-from-intraday) rejected.
4. **Legacy migration** — `D→1D`, `W→1W`, `M→1M` round-trip; `3Y` → `legacy-unmapped` until OPEN-1 is decided.
5. **Unsupported behavior** — unsupported/unentitled cells yield disabled UI + typed reason, and **never** trigger a fetch.
6. **Round-trip** — `interval` chosen in chart survives → heatmap → backtest → indicator → persistence → export and comes back byte-identical.
7. **Range independence (R2)** — changing `visibleRange` never mutates `interval`; asserted at the state boundary.
8. **No-1D-fallback guard** — a fuzz test feeding random/garbage TFs asserts the resolver never returns a `1D`/`1m` bar set.

---

## 7. Evidence gate — read-only provider probes (assigned evidence owner)

For **each** `provider × asset class × canonical TF` cell, record: **date · environment · provider · endpoint · entitlement/tier · HTTP status · result · bar count · observed limitations**. Read-only only — no orders, no writes, no auth beyond existing keys.

Probe recipe per cell:
1. Request the canonical TF's provider-native syntax for a liquid symbol per class (equity `AAPL`, crypto `BTC/USD`, FX/futures per Yahoo map).
2. Record HTTP status + whether the returned bar spacing **equals the requested duration** (this is how silent substitution F-5 is caught — a `2h` request that returns 60-min spacing is `unsupported-as-native`, mark `aggregated` or `unsupported`).
3. Record max historical depth (bar count at max range) → fills the depth limit.
4. Classify: `native` (exact spacing) / `aggregated` (only a divisible lower TF returns exact) / `unsupported` (neither) / `unentitled` (HTTP 401/403/422).

Result attaches to this ticket. **Sentinel** then independently re-runs a sample and approves or rejects. **No canonical-timeframe implementation is accepted before this gate passes.**

---

## 8. Acceptance-contract traceability

| Acceptance item | Where satisfied |
|---|---|
| All 19 IDs documented | §1 |
| Every cell = measured **or** `unknown—not yet measured` | §2 (all cells `unknown—not yet measured`; `CODE-ASSERTS` is advisory only) |
| No unsupported/unknown shown as supported | §2.5 Polygon, §5 |
| Aggregated interval names source + rule | §3 |
| Non-divisible aggregation rejected | §3, test #3 |
| `1D/1W/1M` round-trip unambiguous | §1, §4, test #6 |
| Invalid IDs & unavailable mappings → explicit failure | §5, test #1/#5 |
| No fallback silently produces `1D` | §5 (delete F-2/F-6), test #8 |
| Visible-range change ≠ candle change | §1.1, test #7 |
| Contract tests exist | §6 |
| Forge impl passes types/tests/69-page build/19 manual selects | `WM-CHART-P0-01` (downstream) |
| Sentinel confirms evidence + unsupported behavior | §7 |

---

## 9. Open items requiring a decision (do not let Forge guess)

- **OPEN-1 (Founder):** `3Y` vs `2Y` mismatch → §4. Blocks the legacy-migration test and the provider maps.
- **OPEN-2 (Forge/Sentinel):** Polygon has **no adapter** (§2.5). Either build one (new sub-ticket) or mark Polygon out-of-scope for 01 and record every cell as `no adapter`.
- **OPEN-3 (Ops):** deployed commit vs declared base `e1a8c94` vs local `e14e8dd` (§0) — Sentinel confirms which commit evidence is measured against.

---

### Findings index
- **F-1** interval/range conflation (`3M…5Y` → single month candle) — Alpaca & Yahoo.
- **F-2** silent `1D` fallback on unmatched TF — Alpaca `:71`, Yahoo `:92`.
- **F-3** invalid `D`/`W`/`M` keys throughout adapters + `TimeframeSelector.tsx`.
- **F-4** canonical `2Y` vs code `3Y` mismatch → OPEN-1.
- **F-5** silent substitution (`2h/4h→1h`, `3m→5m`, `10m→15m`, `2m→1m`) — Yahoo, Finnhub, exchanges.
- **F-6** Finnhub defaults unknown resolution to `"1"` (minute) `:118` — worst-case silent substitution.
- **F-7** `TimeframeSelector.tsx` offers only 9 TFs, using invalid `D/W/M`; must present the canonical 19 with disabled states for `unsupported`/`unmeasured`.

*End `WM-CHART-P0-01A`. Architecture/evidence gate only — no production code modified.*
