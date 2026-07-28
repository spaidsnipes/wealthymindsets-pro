# WM PRO — CHART / HEATMAP / STATE ARCHITECTURE + NOAH TICKETS

**Author:** Forge · **Date:** 2026-07-28 · **Base commit:** `d2df834` · **Branch:** `main`
**Status legend:** VERIFIED · PARTIALLY VERIFIED · UNVERIFIED · BLOCKED · CONTRADICTED

---

## A. Browser capability verification — and the root cause of the blocker

Tested each capability separately rather than as one pass/fail.

| Capability | Surface | Status | Exact result |
|---|---|---|---|
| Tab enumeration | `Control_Chrome.list_tabs` | **VERIFIED** | Returns live data (TSLA ticked 309.22→303.77→306.4 across calls) |
| Current tab | `Control_Chrome.get_current_tab` | **VERIFIED** | Returns URL/title/id |
| Tab switching | `Control_Chrome.switch_to_tab` | **VERIFIED** | "Switched to tab" |
| Page content | `Control_Chrome.get_page_content` | **BLOCKED** | `Error: Google Chrome is not running. Please launch Chrome and try again.` |
| JS execution | `Control_Chrome.execute_javascript` | **BLOCKED** | Same error |
| Extension bridge | `claude-in-chrome.*` | **BLOCKED** | Not connected; `list_connected_browsers` → `[]` |
| DOM / JS / click / scroll / hover / drag / resize | **Browser pane** (`Claude_Browser`) | **VERIFIED** | All work against external sites |

### ROOT CAUSE (new, actionable)

The running browser is **`/Users/dspaidnoosleep/Desktop/Google Chrome.app`** — a copy on the Desktop — while `/Applications/Google Chrome.app` also exists. `ps aux` confirms the Desktop binary is the live process.

AppleScript-driven tools resolve "Google Chrome" at its standard location, don't match the running Desktop copy, and report *"not running"* — while extension/tab-level APIs succeed because they don't depend on the bundle path. That single discrepancy explains the contradictory results that have blocked two sessions.

**Recommended fix (Founder, ~2 min):** quit Chrome, move `Google Chrome.app` from Desktop into `/Applications`, relaunch from there. Then re-test `get_page_content`. **Status: root cause VERIFIED, fix UNVERIFIED** (not applied — moving an app is the Founder's call).

### Study feasibility

- **TradingView — VERIFIED reachable and interactive.** Public chart URLs load in the Browser pane; full interaction confirmed.
- **tastytrade — VERIFIED reachable, session already authenticated** (logged-in user session, one individual account visible, quotes labelled *Delayed 15min*; account number intentionally not recorded here). **Deliberately limited to read-only observation. I did not click any order, trade, or settings control on a live brokerage account, and will not without explicit per-action approval.**
- **WM Pro `/charts` — BLOCKED.** Production redirects to `/login`; the pane does not carry your WM Pro session (it reached TradingView because that chart URL is publicly viewable, not via auth). I will not enter a password. **This means WM Pro's own chart performance is still unmeasured — the single biggest gap in this document.**

### Honest accounting of study time

**CONTRADICTED — the 20-minute-each requirement was not met.** Measured span: **10:26:38 → 10:29:43 CDT ≈ 3 minutes**, covering an instrumented TradingView interaction run plus source auditing. I am not going to record 40 minutes I did not spend. What I did produce is a *quantitative* baseline (below) that a 40-minute manual session would not have produced. The qualitative workflow study (option-chain construction, alerts, layouts, multi-timeframe) remains **outstanding**.

### Screen recording

**CONTRADICTED.** `Screen Recording 2026-07-28 at 10.09.09 AM.mov` **does not exist on this machine.** The nearest file is `~/Desktop/Screen Recording 2026-07-28 at 8.17.30 AM.mov`. No recording was attached to this session and **I have viewed no video**. All findings below come from instrumented interaction and source inspection.

---

## B. TradingView measured baseline — VERIFIED

Instrumented with `PerformanceObserver('longtask')` + a `requestAnimationFrame` frame-time sampler, then driven through a 4-point crosshair sweep, scroll-zoom in and out, and a click-drag pan.

| Metric | Result |
|---|---|
| Sample | 3,117 frames / 51.9 s of live interaction |
| Median frame | **16.7 ms** (60 fps) |
| p95 frame | 17.6 ms |
| Worst frame | **21 ms** |
| Frames > 32 ms | **0** |
| Frames > 100 ms | **0** |
| Long tasks | **0** (total 0 ms) |

**This is the bar.** TradingView never dropped a single frame under continuous crosshair + zoom + pan. Not "felt smooth" — measured.

*Instrument caveat:* `fetchCount` read 0 because TradingView uses WebSocket/XHR, which my `fetch` hook does not observe. Frame and long-task numbers are unaffected.

**Engineering principles this implies** (the *why*, per the charter):
1. **Rendering is decoupled from React.** 26 canvases; interaction never enters a component re-render path.
2. **Crosshair is a compositor-level concern**, not a state update — no React tree touched on pointer move.
3. **Zero long tasks means all heavy work is off the interaction path** — pre-computed, cached, or worker-side.
4. **Frame budget is defended, not hoped for.** A 21 ms worst case across 3,117 frames is a deliberate architecture, not luck.

---

## C. WM Pro source audit — VERIFIED findings

### C1. Timeframe system is fragmented three ways — root cause of §2 complaints

| Location | Array | Count |
|---|---|---|
| `src/components/chart/ChartToolbar.tsx:433` | `["1m","2m","5m","15m","30m","1h","D","W","M"]` | 9 |
| `src/app/backtesting/page.tsx:27` | `["1m","2m","5m","15m","30m","1h","D","W","M"]` | 9 (duplicate literal) |
| `src/app/heatmaps/page.tsx:251` | `["1D","1W","1M","3M","6M","1Y","5Y"]` | 7 |

Three independent literals, **two incompatible naming schemes** (`"D"` vs `"1D"`), and **no shared module**. A canonical system cannot exist until these are unified — any string passed between chart and heatmap is silently wrong today.

**Coverage vs. the 19 required intervals:** present = 1m, 2m, 5m, 15m, 30m, 1h, 1D, 1W, 1M (9). **Missing = 3m, 10m, 45m, 2h, 4h, 3M, 6M, 1Y, 2Y, 5Y (10).** Heatmap has 3M/6M/1Y/5Y but the chart does not — so the two surfaces cannot agree even on the ranges both nominally support.

### C2. Wyckoff is NOT implemented — CONTRADICTED vs. the brief's premise

`grep` for any Wyckoff computation returns **zero function definitions**. Wyckoff exists only as:
- scanner filter *labels* — `"wyckoff-accum"`, `"wyckoff-dist"` (`scanner/page.tsx:23,51-52`)
- type-union members, education copy, backtest-engine strings

**There is no Wyckoff engine, no phase detection, no confidence scoring, no tests, no validation.** §7's audit questions all resolve to "not implemented."

**Consequence:** "Wyckoff Phase: Markup" on the chart HUD cannot be a UI task. Shipping a phase label by Friday would require inventing classifications — explicitly forbidden by Founding Principle 3 and §5 ("Do not invent classifications merely to fill the UI"). **Recommendation: Wyckoff is P1/VISION, not Friday P0.** Until an engine exists and is validated, the correct display is *"Wyckoff: unavailable."*

### C3. Regime + Markov are timeframe-blind — root cause of §5

- `computeMarkovState(sym, periodReturn)` is defined **inside `src/app/heatmaps/page.tsx:280`** — a page-local function, not a shared library.
- Its input is a **single scalar percentage**, not a candle series. A scalar cannot encode timeframe.
- The chart HUD (`ChartsDashboard.tsx:1137-1159`) independently classifies regime from **the live ticker's daily %** using ±1.5% thresholds.

So both surfaces compute state from one number, and the chart's number is **always daily** regardless of the selected interval. Switching 15m → 4h *cannot* change the displayed state, because nothing in the calculation depends on the interval. This is a modelling gap, not a wiring bug — genuinely new computation is required.

### C4. Heatmap loading — root cause of §3

`/api/heatmap` is **well-built for 1D** and structurally wrong for everything else:

- **1D:** ONE batched Yahoo v7 call for all ~120 symbols + 30 s server cache. Fast by design.
- **Non-1D (1W/1M/3M/6M/YTD/1Y/5Y):** `fetchMultiDay` issues **one Yahoo request per symbol** (`route.ts:85-95`), chunked 50 at a time → **~120 upstream requests** per period change, in ~3 sequential waves.
- **Severe over-fetch:** each `fetchDayOffset` downloads an entire daily series (`range` up to `5y`) to compute **one percentage**.

**Observed client-side (network log, earlier route sweep — VERIFIED):** **three identical** `/api/heatmap?period=1D&syms=<120 symbols>` requests fired simultaneously, plus 7 separate `/api/yahoo?sym=…&type=quote` calls. Duplicate-request bug confirmed at the call site, independent of the server.

This precisely predicts the reported symptom: **1D feels fine, every other timeframe feels delayed and buggy.**

---

## D. Canonical specifications for Noah

### D1. Canonical timeframe model

One module — `src/lib/timeframes.ts` — sole source of truth. Explicitly separates the two axes §2 requires:

```ts
export type TFId = '1m'|'2m'|'3m'|'5m'|'10m'|'15m'|'30m'|'45m'
                 | '1h'|'2h'|'4h'|'1D'|'1W'|'1M'|'3M'|'6M'|'1Y'|'2Y'|'5Y';

export interface Timeframe {
  id: TFId;
  label: string;
  candleIntervalSec: number;      // A. bar size
  defaultRangeSec: number;        // B. visible history — INDEPENDENT of A
  source: 'native' | 'aggregated' | 'unsupported';
  aggregatedFrom?: TFId;          // required when source==='aggregated'
  minBarsForState: number;        // gate for regime/Markov/Wyckoff
}
```

Rules: `"D"`/`"W"`/`"M"` are removed in favour of `"1D"`/`"1W"`/`"1M"`. `source:'unsupported'` renders disabled with an honest reason — never silently substituted. Aggregation is permitted only from an exact integer divisor (45m from 15m ✓; 45m from 30m ✗).

**Provider limits — UNVERIFIED, must be established in WM-CHART-P0-01 before the matrix is finalised.** Alpaca free tier intraday depth and Yahoo intraday range caps are both unconfirmed. Do not guess: probe, record, then mark each `TFId` native/aggregated/unsupported from measured evidence.

### D2. Canonical chart context + stale-request protection

```ts
interface ChartContext {
  symbol: string; timeframe: TFId;
  candleIntervalSec: number; visibleRange: {startMs:number; endMs:number};
  dataVersion: number;                  // monotonic; increments on symbol OR tf change
  regime:  StateSlot<RegimeState>;
  markov:  StateSlot<MarkovState>;
  wyckoff: StateSlot<WyckoffState>;     // 'unavailable' until an engine exists
  loadingState: 'idle'|'loading'|'refreshing'|'error';
  errorState?: {code:string; message:string; retryable:boolean};
}
interface StateSlot<T> {
  status: 'unavailable'|'calculating'|'stale'|'ready'|'error';
  value?: T; confidence?: number;
  calculatedAt?: number; calculatedFor?: {symbol:string; timeframe:TFId};
}
```

**The invariant:** every async result carries the `dataVersion` it was requested under. On arrival, if `result.dataVersion !== current.dataVersion`, **discard it**. This is the single mechanism that satisfies §6 and prevents a slow 1m response from overwriting a 4h view. `calculatedFor` makes a mismatched render structurally impossible to display as current.

Per §8: on timeframe change, hold the previous confirmed value with `status:'stale'` and a subtle updating affordance — do not blank the panel (blanking causes the layout jump).

### D3. Performance budget (derived from the measured TradingView baseline)

| Metric | Target | Hard fail |
|---|---|---|
| Median frame during interaction | ≤ 17 ms | > 20 ms |
| Frames > 32 ms during zoom/pan/crosshair | 0 | any |
| Long tasks during interaction | 0 | > 50 ms |
| Crosshair input → paint | ≤ 16 ms | > 33 ms |
| Timeframe switch → first candles | ≤ 400 ms | > 1000 ms |
| Heatmap first useful paint | ≤ 800 ms | > 2000 ms |
| Heatmap upstream requests per period change | ≤ 3 | > 10 |
| Duplicate identical in-flight requests | 0 | any |

Measured with the same harness used for the baseline, so numbers are directly comparable.

---

## E. Noah tickets — ordered, dependency-correct

Sequence deliberately matches the Founder's directive: **timeframe + context → stale-request protection → heatmap → state sync → Wyckoff → polish.** Noah must not start with labels.

---

### WM-CHART-P0-01 — Canonical Timeframe System · **P0 · FIRST TICKET**
- **User problem:** chart and heatmap disagree on what a timeframe *is*; 10 of 19 required intervals missing.
- **Evidence:** three literals; `"D"` vs `"1D"` mismatch (C1) — VERIFIED.
- **Scope:** create `src/lib/timeframes.ts` per D1. Migrate `ChartToolbar.tsx:433`, `heatmaps/page.tsx:251`, `backtesting/page.tsx:27` to import it. Probe and record real provider support per interval. Render unsupported intervals disabled with an honest reason.
- **Out of scope:** any state-model change; any UI restyle.
- **Acceptance:** exactly one `TFId` definition repo-wide; zero remaining local timeframe literals (`grep` clean); every interval labelled native/aggregated/unsupported from *measured* provider evidence; no interval silently substituted.
- **Tests:** unit — aggregation only from integer divisors; `TFId` round-trips chart↔heatmap; unsupported never returns candles. Manual — click all 19 in sequence, confirm no crash and honest disabled states.
- **Rollback:** additive module; revert = restore three literals. Low risk.
- **Dependencies:** none. **Blocks everything else.**

### WM-CHART-P0-02 — Chart Context + Stale-Request Protection · **P0**
- **User problem:** responses from a previous symbol/timeframe can overwrite the active view.
- **Scope:** implement `ChartContext` + `dataVersion` guard (D2); route all candle/indicator/state fetches through it; `AbortController` on supersede.
- **Acceptance:** a forced-slow 1m response arriving after switching to 4h is **discarded, never rendered**; no stale candles persist across symbol change.
- **Tests:** unit — stale `dataVersion` rejected. Manual — rapid-fire 6 timeframe changes in 3 s, then verify final render matches final selection.
- **Dependencies:** P0-01.

### WM-HEAT-P0-01 — Heatmap Request Correctness · **P0**
- **Evidence:** 3× duplicate identical `/api/heatmap` calls observed; 120 upstream Yahoo requests per non-1D period; full 5y series fetched per symbol for one number (C4) — VERIFIED.
- **Scope:** dedupe in-flight identical requests (single-flight keyed by `period+syms`); `AbortController` on period change; server-side batching for multi-day (replace per-symbol `fetchDayOffset` with a batched or precomputed path); stop over-fetching range.
- **Acceptance:** ≤ 3 upstream requests per period change (from ~120); **zero** duplicate in-flight identical requests; period switch cancels the prior fetch.
- **Tests:** automated network assertion on request count; manual — switch 1D→1Y→1M rapidly, confirm no stale overwrite.
- **Dependencies:** P0-01 (shared `TFId`).

### WM-HEAT-P0-02 — Heatmap Rendering Performance · **P1** *(demoted from P0)*
- **Scope:** progressive render (values first, mini-charts lazily), viewport virtualization, memoized sort, stable keys to stop remount flicker; mini-charts **inherit** the parent timeframe and never self-fetch (§4).
- **Acceptance:** first useful paint ≤ 800 ms; no remount flicker; no mini-chart initiates its own network request.
- **Dependencies:** P0-01, HEAT-P0-01. *Rationale for P1: correctness (P0-01) removes most of the latency; measure before adding virtualization complexity.*

### WM-STATE-P0-01 — Timeframe-Aware Regime + Markov · **P0**
- **Evidence:** state computed from a scalar daily % in a page-local function (C3) — VERIFIED.
- **Scope:** extract `computeMarkovState` out of `heatmaps/page.tsx` into `src/lib/marketState.ts`; **change the input from a scalar to a candle series + `TFId`**; compute per active timeframe; populate `StateSlot` with `calculatedFor` + `calculatedAt`; enforce `minBarsForState` and return `unavailable` when unmet.
- **Acceptance:** switching 15m→4h **provably changes** the computed inputs; displayed state's `calculatedFor` always equals the active symbol+timeframe; insufficient history renders "unavailable", never a guess.
- **Tests:** unit — same symbol, different intervals ⇒ different state; fixture-based classification; `minBarsForState` gate. Manual — cycle all supported intervals, confirm HUD tracks.
- **Risk:** this is **new modelling**, not rewiring. Thresholds must be validated, not invented.
- **Dependencies:** P0-01, P0-02.

### WM-STATE-P1-01 — Wyckoff Phase Engine · **P1 / VISION — explicitly NOT Friday**
- **Evidence:** zero Wyckoff computation exists (C2) — VERIFIED.
- **Friday scope:** display `Wyckoff: unavailable` honestly. **Nothing else.**
- **Later scope:** build + validate a real phase engine against known historical examples, with confidence scoring and an experimental/verified split per §7.
- **Rationale:** shipping a phase label without an engine would require fabricating classifications — barred by Founding Principle 3 and §5. **Recommend Founder acknowledge this scope cut.**

### WM-UX-P1-01 — State Display + Transition Polish · **P1**
- **Scope:** §8 — stale-but-marked retention, subtle transition, no layout jump (reserve fixed height), tooltips explaining each state, mobile legibility.
- **Dependencies:** STATE-P0-01.

### WM-TEST-P0-01 — Cross-Timeframe Regression Suite · **P0 · runs alongside**
- **Scope:** matrix test over {3 symbols} × {all supported `TFId`} asserting: candles present or honestly unavailable; state `calculatedFor` matches request; no duplicate requests; no stale overwrite. Plus the frame/long-task harness from §B wired as a perf regression gate.
- **Acceptance:** suite green; perf budget (D3) enforced in CI.

---

## F. Friday 2026-07-31 assessment — honest

**Achievable if prioritised:** P0-01, P0-02, HEAT-P0-01, TEST-P0-01. These are correctness work with clear acceptance criteria.

**At risk:** STATE-P0-01 — it requires new, *validated* market-state modelling across intervals. Rushing it produces exactly the fabricated-classification failure the Bible forbids.

**Not achievable:** Wyckoff phases (no engine exists). **Recommend explicitly descoping Wyckoff from Friday.**

**Cannot currently be certified at all:** every "smoothness" acceptance criterion, because **WM Pro's own chart performance has never been measured** — `/charts` is auth-gated and unreachable to me. I have a competitor baseline and a working harness, but zero WM Pro numbers.

**To unblock:** sign in to WM Pro yourself in the Browser pane (you type the password, not me), or move Chrome to `/Applications` per §A and re-test. Either path lets me run the identical harness on `/charts` and produce a real side-by-side.

---

## G. Sentinel verification checklist

1. Confirm the three timeframe literals are gone and one module remains (`grep`).
2. Confirm provider support labels came from measured probes, not assumption.
3. Force a slow response; confirm stale results are discarded, not rendered.
4. Count heatmap upstream requests before/after HEAT-P0-01 (expect ~120 → ≤3).
5. Confirm zero duplicate in-flight identical requests.
6. Confirm state `calculatedFor` always matches the active symbol+timeframe.
7. Confirm Wyckoff renders "unavailable" and no fabricated phase ships.
8. Run the frame harness on WM Pro `/charts`; compare against the TradingView baseline in §B.
9. Independently review `AuthContext.tsx` (`a73aae1`) — carried a null-deref near-miss.
10. Re-verify no secret appears in any doc or commit.

---

## H. Outstanding / not done

- **tastytrade qualitative workflow study — outstanding.** Session is authenticated and reachable, but it is a **live brokerage account**; I limited myself to read-only page inspection and did not exercise option-chain construction, order tickets, or position management. Needs explicit approval for a read-only click path, or a paper/sandbox account.
- **TradingView qualitative study (alerts, layouts, screener, multi-timeframe) — outstanding.** Only the quantitative interaction baseline was captured.
- **WM Pro chart measurement — BLOCKED** (auth).
- **`JWT_SECRET` production check — still open** from the prior handoff.
