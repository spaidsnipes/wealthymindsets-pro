# ACTIVE TASK QUEUE

**Owner:** Sentinel · **Last updated:** 2026-07-30 (Sentinel reconciliation — see DAILY_OPERATIONS_REPORT Finding 1)
**Product in this block:** WM Pro · **Base commit:** `708b5c4`

> **2026-07-30 reconciliation note.** This queue drifted two days behind git (stamped 07-28 while commits ran to 07-30). Closed since 07-28: **WM-CHART-P0-02** (`c53e429`, VERIFIED), **WM-CHART-P0-06** (`3cbf3a9`, CLOSED), **WM-CHART-P0-05** (`a223fc5` +3, SHIPPED — runtime agreement still RISK-001-blocked). The `WM-CHART-P0-01B-PREREQ-SCANNER-A11Y-01` gate referenced in §TEAM ASSIGNMENTS has **no ticket body** — RETURNED by Sentinel; it gates nothing until authored. Nehemiah owns keeping this file in step with git going forward.

## Valid statuses

`BACKLOG` · `READY FOR FORGE` · `FORGE ACTIVE` · `READY FOR NOAH` · `NOAH ACTIVE` ·
`READY FOR VERIFICATION` · `SENTINEL VERIFYING` · `VERIFIED` · `PARTIALLY VERIFIED` ·
`BLOCKED` · `DEFERRED`

## Claim protocol

1. Pull. 2. Read `ATH_COMMAND_CENTER.md` and this file. 3. Read your latest role handoff.
4. Confirm repo/branch/HEAD/working tree. 5. **Claim exactly one primary task** by setting
*Owner*, *Status*, *Claimed by*, *Claim timestamp*. 6. Commit that claim before starting work.

**No duplicate work.** Before starting, check *Owner*, *Status*, *Latest commit*,
*Existing branch*, *Handoff location*, and whether someone already claimed it. If another
employee is actively implementing it, take a supporting audit/test/research/doc task instead.

---

## WM-OF-P0-06 — Order-flow master/sub-tool state model (silent dead state)

| Field | Value |
|---|---|
| **Ticket ID** | WM-OF-P0-06 |
| **Priority** | P0 — Founder: "we still dont have any of the order flow tools working." |
| **Found by** | Sentinel, 2026-08-02 00:10 CDT, prod BTC 15m. |
| **Confirmed state** | Master `ORDER FLOW: OFF` while a sub-tool (Big Trades / Agg-Passive) is highlighted green as if active; nothing renders, no explanation. Silent dead state. |
| **Scope note** | Market closed at verify time — live-data *population* (master ON + tape) not tested; the state-model defect is what's confirmed. |
| **Owner (design)** | Micah — pick: (A) sub-tool click auto-enables master, or (B) sub-tools inert/disabled + hint while master OFF. |
| **Then** | Noah implements → Sentinel verifies (incl. live population at market open). |
| **Dispatch** | `dispatches/2026-08-02/0010-sentinel-to-micah-of-master-toggle-ux.md` |
| **Status** | OPEN — dispatched Micah for design pick. |

---

## WM-CHART-P0-01 — Canonical Timeframe System

| Field | Value |
|---|---|
| **Ticket ID** | WM-CHART-P0-01 |
| **Product** | WM Pro |
| **Priority** | P0 — **FIRST TICKET**, blocks four other P0s |
| **Owner** | Forge |
| **Status** | **PARTIALLY VERIFIED — CLOSED** at `d2ea511` (Sentinel verified 2026-07-28, DB-V/V-006). 5 of 7 acceptance criteria fully met; AC#3 partial (legacy `D`/`W`/`M` retained at the emit boundary → WM-CHART-P0-01b), AC#6 **not met** (unsupported intervals are hidden, not shown disabled with a reason → WM-CHART-P0-04). Closed because the core objective is genuinely achieved and four P0s should not block on a toolbar affordance. |
| **Objective** | One canonical timeframe module that separates candle interval, visible historical range, provider-specific interval value, and display label. Eliminate the three incompatible literals. |
| **Dependencies** | None |
| **Evidence source** | `docs/WM_CHART_ARCHITECTURE_2026-07-28.md` §C1, §D1, §E — **independently re-verified by Sentinel 2026-07-28** |
| **Files / subsystems** | New `src/lib/timeframes.ts`; `src/components/chart/ChartToolbar.tsx:433`; `src/app/heatmaps/page.tsx:251`; `src/app/backtesting/page.tsx:27` |
| **Acceptance criteria** | 1. Exactly one `TFId` definition repo-wide. 2. `grep -rn "TIMEFRAMES" src/` returns only the canonical module and its importers — zero local literals. 3. `"D"/"W"/"M"` unified with `"1D"/"1W"/"1M"`. 4. Every interval labelled `native` / `aggregated` / `unsupported` from **measured provider probes, not assumption**. 5. Aggregation permitted only from an exact integer divisor. 6. Unsupported intervals render disabled with an honest reason — **never silently substituted**. 7. No state-model change and no UI restyle in this ticket. |
| **Verification requirements** | Unit: aggregation rejects non-integer divisors; `TFId` round-trips chart↔heatmap; unsupported never returns candles. Automated: `tsc --noEmit` 0 errors, `npm test` green, `npm run build` 69/69. Manual: click all supported intervals in sequence, no crash, honest disabled states. Sentinel re-runs the `grep` and inspects the provider-probe evidence. |
| **Claimed by** | Forge — claimed under DEC-008 (Founder ruled "Forge codes" on the DEC-004 role conflict) |
| **Claim timestamp** | 2026-07-28 |
| **Latest commit** | `d2ea511` |
| **Handoff location** | `docs/operations/handoffs/forge/2026-07-28-forge-wm-chart-p0-01.md` |
| **Blockers** | None — closed. Provider limits RESOLVED (measured 2026-07-28, recorded in `PROVIDER_EVIDENCE`). |
| **Sentinel verification** | **TWO independent Sentinel passes ran concurrently and agree the ticket CLOSES. Both re-ran the automated evidence and got identical numbers** — `tsc` **0 errors**, `vitest` **43/43**, `npm run build` **69/69**, AC#2 grep clean — matching Forge's reported figures exactly. Pass A (V-006): AC#3 partial, AC#6 **not met**. Pass B (`.../sentinel/2026-07-28-sentinel-wm-chart-p0-01-verification.md`): AC#3 **met**, AC#6 met-with-correction. **Resolved in favour of the stricter reading (Pass A)** — see the disagreement row. Neither pass has runtime evidence; both are static/type/test/build only (RISK-001). |
| **Sentinel disagreement — Founder-visible, unresolved** | **AC#3.** Pass A: partial, because the toolbar still *emits* legacy `"D"`. Pass B: met, because only one module *authors* the mapping and `toChartEmitId()` is a single typed adapter boundary. **Recorded as partial** so nothing is over-claimed; the practical consequence is identical either way (WM-CHART-P0-01b is filed and owns the remainder). No action needed unless the Founder wants the stricter standard written into future ACs. **AC#6.** Pass A is literally correct — the AC says unsupported intervals *render disabled with an honest reason*, and the implementation **hides** them instead. Hiding is fail-closed and safe, but it is not the stated criterion. **Pass B concedes; AC#6 stands as NOT MET → WM-CHART-P0-04.** Pass B adds one fact Pass A does not state: `assertGranularity()` / `resolveFetchPlan()` / `aggregateCandles()` have **zero importers repo-wide** — the guard is correct, unit-tested, and **inert at runtime**. That is out of P0-01's scope but is the whole reason WM-CHART-P0-03 is a P0. |
| **Next action** | **Closed.** Successors: **WM-CHART-P0-03** (Noah — live defect, highest severity), WM-CHART-P0-02 (Forge, claimed `1424ef3`), WM-CHART-P0-04 (toolbar disabled-state affordance), WM-CHART-P0-01b (consumer migration). |

---

---

## WM-CHART-P0-01b — Migrate Chart Consumers to Canonical TFId
| Field | Value |
|---|---|
| **Ticket ID** | WM-CHART-P0-01b |
| **Product** | WM Pro |
| **Priority** | P1 — completes AC#3 of P0-01 |
| **Owner** | *(unclaimed)* |
| **Status** | READY |
| **Objective** | Migrate the six consumers that still switch on legacy `"D"/"W"/"M"` so the toolbar can emit canonical `TFId`, retiring `toChartEmitId()` and `legacyChartId`. |
| **Dependencies** | WM-CHART-P0-01 (done, `d2ea511`). Sequence with/after P0-02 — both touch the same call sites. |
| **Evidence source** | `docs/operations/handoffs/forge/2026-07-28-forge-wm-chart-p0-01.md` §6 |
| **Files / subsystems** | `src/hooks/useWebSocket.ts:701`; `src/components/chart/MainChart.tsx:105,160,219,1545`; `src/components/chart/WMSessionVP.tsx:152`; `src/components/chart/indicatorConfig.ts:16` |
| **Acceptance criteria** | 1. Toolbar emits canonical `TFId`. 2. `toChartEmitId`/`legacyChartId` removed. 3. `normalizeTFId` still migrates persisted layouts. 4. Chart data path verified unbroken by interaction evidence. |
| **Blockers** | Requires an authenticated `/charts` session to verify. Do not close on build-passing alone. |
| **Next action** | Hold for claim. Also triage the adjacent finding: `MainChart.tsx:219` maps `2h`/`4h` to provider `"60"` — possible pre-existing mislabel, UNVERIFIED. |

## WM-CHART-P0-03 — Fail-closed provider interval mapping

> **Naming note.** The Founder directive refers to a corrected "`WM-CHART-P0-01B`". Two
> different pieces of work were carrying that name: (a) **`WM-CHART-P0-01b`** (lowercase,
> Forge's, cited in shipped code at `src/lib/timeframes.ts:73` and `:305`) = migrate the six
> legacy consumers to `TFId`; (b) fail-closed provider mappings = the directive's meaning.
> They are not the same ticket. **(b) is filed here as WM-CHART-P0-03.** `WM-CHART-P0-01b`
> keeps its original meaning.
>
> **Scope boundary vs WM-CHART-P0-04.** P0-04 is a *presentation* ticket: render intervals
> the app declines to serve as visibly disabled with an honest reason, instead of hiding
> them. **P0-03 is a *data* ticket:** make the provider layer decline in the first place.
> P0-03 must land first — P0-04 has nothing truthful to display until the data layer stops
> substituting. No file overlap: P0-04 touches the toolbar, P0-03 touches the API routes
> and the fetch helpers.

| Field | Value |
|---|---|
| **Ticket ID** | WM-CHART-P0-03 (= the directive's "corrected WM-CHART-P0-01B") |
| **Product** | WM Pro |
| **Priority** | **P0 — live shipping truthfulness defect. Same class as WM-WYCK-P0-01.** |
| **Owner** | **Noah** |
| **Status** | **NOAH ACTIVE** — claimed 2026-07-29. Defect re-confirmed in current source before claim: `finnhub/route.ts:39` `FH_RES` `"2m":"1"`, `MainChart.tsx:216` `resMap` `"2m":"5"` (two different substitutions), `MainChart.tsx:110` `getIntervalSec` `?? 60`. |
| **Objective** | No provider may return a bar size other than the one requested without the request being rejected. Every interval map becomes fail-closed: exact native match, exact integer aggregation, or an honest `unavailable` — never a silent substitution. |
| **Dependencies** | WM-CHART-P0-01 (**satisfied**, `d2ea511`) |
| **Evidence source** | Sentinel verification handoff §4, `docs/operations/handoffs/sentinel/2026-07-28-sentinel-wm-chart-p0-01-verification.md`. **CONFIRMED in source, four independent maps.** |
| **Confirmed defect** | Four provider maps disagree and three substitute silently:<br>• `src/app/api/finnhub/route.ts:39` — `"2m": "1"` → **1-minute bars labelled 2m**; `"3m":"5"`, `"10m":"15"`, `"2h":"60"`, `"4h":"60"`<br>• `src/components/chart/MainChart.tsx:216` — `"2m":"5"` → **5-minute bars labelled 2m**; same `3m`/`10m`/`2h`/`4h` substitutions<br>• `src/app/api/alpaca/route.ts:50` (`2Min`) and `src/app/api/yahoo/route.ts:70` (`2m`) are **correct**<br>• `MainChart.tsx:110` `getIntervalSec()` ends `?? 60` — **fail-open**: an unrecognised timeframe silently becomes 1 minute |
| **Blast radius** | **`2m` is live today** — it is one of the nine ids in `CHART_TF_SHIPPED`. Fallback order (`MainChart.tsx:1568-1572`) is `exchangeData → alpaca → finnhubDirect → yahoo → finnhubClient → polygon`; `/api/finnhub` runs **ahead of Yahoo**, so whenever Alpaca returns `null` the user is served 1-minute bars labelled `2m`. The same click can yield 1-, 2-, or 5-minute candles depending on which provider answers — **non-deterministic mislabelling with no user-visible indication.** `3m`/`10m`/`2h`/`4h` are latent (withheld by `CHART_TF_SHIPPED`) and go live the moment P0-01b widens the toolbar. |
| **Files / subsystems** | `src/app/api/finnhub/route.ts`; `src/components/chart/MainChart.tsx` (`resMap`, `getIntervalSec`); `src/app/api/alpaca/route.ts`; `src/app/api/yahoo/route.ts` |
| **Acceptance criteria** | 1. Every provider map is derived from `src/lib/timeframes.ts` — no hand-written interval literal survives in any route or fetch helper. 2. A provider that cannot serve the exact requested interval returns `null`/`unavailable`; it **never** returns a different bar size. 3. `assertGranularity()` is wired into every path that returns candles — currently it has **zero importers**. 4. `getIntervalSec()` throws or returns `null` on an unknown timeframe instead of defaulting to 60. 5. Where an exact integer divisor exists, `aggregateCandles()` may be used; otherwise unavailable. 6. When all providers decline, the chart renders an honest empty/unavailable state — **never a substituted or fabricated series.** |
| **Verification requirements** | Unit: each provider map rejects a non-exact interval; `assertGranularity` throws on mismatch; `getIntervalSec` fail-closed on unknown input; a `2m` request never yields a 1- or 5-minute series. Automated: `tsc --noEmit` 0 errors, `vitest` green, `npm run build` 69/69. Sentinel: re-grep for surviving literals and confirm `assertGranularity` has real importers. |
| **Claimed by** | Noah (this session ran Forge earlier today; re-tasked to Noah by Founder directive 2026-07-29 after all Forge tickets shipped + were handed off — bus tracks roles, no collision) |
| **Claim timestamp** | 2026-07-29 |
| **Latest commit** | *(claim commit pending)* |
| **Handoff location** | `docs/operations/handoffs/noah/` |
| **Blockers** | **None.** Independent of the auth blocker (RISK-001) — this is provider-mapping logic, unit-testable without a session. **P0-02 is now shipped and pushed (`c53e429`)** — `MainChart.tsx` is clear; no coordination needed, just pull latest before editing. |
| **Next action** | **Noah: claim now and start with `src/app/api/finnhub/route.ts:39` — that is the map serving mislabelled bars ahead of Yahoo in the live fallback chain.** |

---

## WM-CHART-P0-02 — Chart Context + Stale-Request Protection

| Field | Value |
|---|---|
| **Ticket ID** | WM-CHART-P0-02 |
| **Product** | WM Pro |
| **Priority** | P0 |
| **Owner** | Forge |
| **Status** | **PARTIALLY VERIFIED — CLOSED** (Sentinel, 2026-07-30). AC met for the ticket's literal scope (async fetch path); one adjacent gap found and filed separately, not blocking. |
| **Objective** | A response from a previous symbol/timeframe must never overwrite the active view. Implement `ChartContext` + monotonic `dataVersion` guard. |
| **Dependencies** | WM-CHART-P0-01 (done, `d2ea511`) |
| **Evidence source** | Architecture report §D2 |
| **Files / subsystems** | New `src/lib/chartContext.ts`; `src/components/chart/MainChart.tsx` (candle-fetch effect + 5 provider helper fns) |
| **Acceptance criteria** | A forced-slow 1m response arriving after switching to 4h is **discarded, never rendered**. No stale candles persist across symbol change. Every async result carries the `dataVersion` it was requested under. `AbortController` fires on supersede. |
| **Verification requirements** | Unit: stale `dataVersion` rejected. Manual: 6 rapid timeframe changes in 3 s; final render must match final selection. |
| **Claimed by** | Forge — DEC-008 engineering scope |
| **Claim timestamp** | 2026-07-28 |
| **Latest commit** | `c53e429` |
| **Handoff location** | `docs/operations/handoffs/forge/2026-07-28-forge-wm-chart-p0-02.md` |
| **Sentinel verification** | `docs/operations/handoffs/sentinel/2026-07-30-sentinel-wm-chart-p0-02-verification.md`. Independently confirmed: real importer at `MainChart.tsx:687`, `AbortSignal` threaded through all 5 fetch helpers, `chartContext.test.ts` 13/13, `tsc` 0 errors, full suite 78/78 (matches Forge's count exactly). **One correction:** Forge's handoff says the state-set is "gated on `applyIfCurrent()`" — that function is not called anywhere in `MainChart.tsx`. The actual gate is a direct `versionGuardRef.current.isCurrent(myDataVersion)` check-and-return at line 1680, which is functionally equivalent but a different API than described. Not a defect; recording it because the description was inaccurate. |
| **Gap found (out of this ticket's scope, filed separately)** | The live WebSocket tick-folding path (`MainChart.tsx:2200`, `:2260`, fed by `useWebSocket({symbol,timeframe})`) does **not** call `versionGuardRef.isCurrent()` — it relies on an 8%-price-deviation heuristic instead. The code's own comment at `MainChart.tsx:2116` names the exact risk this ticket exists to close: *"a stale tick from the PREVIOUS symbol right after a switch."* Heuristic is probabilistic, not a guarantee. → **WM-CHART-P0-06**. |
| **Blockers** | Manual verification (6 rapid timeframe changes) still needs an authenticated `/charts` session — **blocked by RISK-001**, same as every runtime check this session. Static/type/test verdict stands on its own merits and is not a substitute for it. `buildId`/`disposed` (pre-existing) and the new `DataVersionGuard` are currently redundant, not unified — both must agree before data applies; full consolidation is safe optional follow-up, not required for closure. |
| **Next action** | **Closed** on static/type/test evidence. Runtime check remains open behind RISK-001 for whoever gets an authenticated session first. |

---

## WM-CHART-P0-06 — Version-guard the live WS tick-folding path

| Field | Value |
|---|---|
| **Ticket ID** | WM-CHART-P0-06 |
| **Product** | WM Pro |
| **Priority** | P1 — same defect class as P0-02, narrower blast radius (needs a same-instant symbol switch + in-range stale tick to manifest) |
| **Owner** | — |
| **Status** | BACKLOG |
| **Objective** | Close the one gap WM-CHART-P0-02 left: the live WS tick-folding path (`candleRef.current.update()` at `MainChart.tsx:2200`, `setCandles()` at `:2260`) does not use `DataVersionGuard`/`isCurrent()` at all — only an 8%-deviation heuristic (`:2116`) that can miss a stale tick whose price happens to be close to the new symbol's, or a stale tick for the same symbol at a just-switched timeframe. |
| **Dependencies** | WM-CHART-P0-02 (done, `c53e429`) — reuses the same `versionGuardRef` already present in `MainChart.tsx`. |
| **Evidence source** | Sentinel verification of WM-CHART-P0-02, `docs/operations/handoffs/sentinel/2026-07-30-sentinel-wm-chart-p0-02-verification.md` |
| **Files / subsystems** | `src/components/chart/MainChart.tsx:2100-2270` (live-tick handler), likely `useWebSocket` hook for symbol-scoped subscription cleanup |
| **Acceptance criteria** | A live tick arriving for a symbol/timeframe other than the currently-active `dataVersion` is discarded before it reaches `candleRef.current.update()` or `setCandles()` — same guarantee P0-02 gives the fetch path, not a magnitude heuristic. Existing 8% bad-tick rejection stays (different purpose: corrupt data, not staleness). |
| **Verification requirements** | Unit: simulate a tick tagged with a superseded `dataVersion`/symbol, confirm it's dropped before touching chart refs. Manual: rapid symbol switch while ticks are in flight, confirm no cross-symbol bleed — same RISK-001 constraint as everything else. |
| **Next action** | Unclaimed. Small, additive, low collision risk — safe for either Forge or Noah once Noah's held lane reopens. |

---


## WM-CHART-P1-02 — Verify the `2h`/`4h` → provider `"60"` mapping

| Field | Value |
|---|---|
| **Ticket ID** | WM-CHART-P1-02 |
| **Product** | WM Pro |
| **Priority** | **P1 — potential truthfulness defect, not cosmetic** |
| **Owner** | — |
| **Status** | BACKLOG |
| **Objective** | Establish whether `MainChart.tsx:219` maps `2h` and `4h` to provider interval `"60"`, and if so whether the chart has been serving 1-hour candles under a 2h/4h label. |
| **Dependencies** | None to investigate. A fix may depend on WM-CHART-P0-01b. |
| **Evidence source** | Raised by Forge as an adjacent observation during WM-CHART-P0-01; **UNVERIFIED**. Promoted to its own ticket by Sentinel (V-006) rather than left in a closed ticket's next-action field. Corroborating context: `PROVIDER_EVIDENCE` records `2h` in `rejectedIntervals` — Yahoo does not serve it natively — so *something* must be substituting, and the canonical module's answer is that `2h` should be `aggregated`, never silently swapped. |
| **Files / subsystems** | `src/components/chart/MainChart.tsx:219` |
| **Acceptance criteria** | The actual granularity returned for a `2h`/`4h` request is established from a real response. If mislabelled: either aggregate correctly from a native interval, or label the timeframe honestly/disable it. **Under no circumstances does a bar labelled `4h` contain 1h data.** |
| **Verification requirements** | Inspect a real provider response and compare `dataGranularity` against the requested label — the same check `assertGranularity()` was written to enforce. A passing build proves nothing here. |
| **Claimed by** | — |
| **Claim timestamp** | — |
| **Latest commit** | — |
| **Handoff location** | `docs/operations/handoffs/` |
| **Blockers** | None to investigate. |
| **Next action** | Read `MainChart.tsx:219`, confirm or refute the mapping, and record the finding either way. **If confirmed, this is the third instance today of the same failure class: plausible output with nothing real behind it** (Wyckoff schematic, `range=max` silent downgrade, this). |

---

## ⚠️ Integrity note — 2026-07-28, raised by Sentinel

Two ticket rows in this file were marked **"VERIFIED — CLOSED at `d2ea511` (Sentinel,
2026-07-28)"**. Sentinel wrote neither line.

- **WM-CHART-P0-01** — the verification had genuinely not happened at the time the row was
  written. It has now been done (V-006 below), and the honest verdict is **PARTIALLY
  VERIFIED**, not VERIFIED.
- **WM-CHART-P0-02** — **not implemented, let alone verified.** `src/lib/chartContext.ts`
  has never been committed, `dataVersion` does not appear anywhere in `HEAD`, and the only
  trace of the work is uncommitted edits in the working tree. Its own row simultaneously
  read *"Latest commit: (none yet)"* and *"Next action: Forge implementing"* — the row
  contradicted itself.

**Nothing was lost and no code was harmed** — but a queue that records unverified work as
verified, over a verifier's name, is worse than a queue with gaps. The whole point of
separating implementation from verification is that the second signature means something.

**Standing rule, effective now:** only Sentinel sets a status to `VERIFIED` or `PARTIALLY
VERIFIED`, and every such entry must name the verification record (`V-nnn`) that backs it.
An implementer who believes work is done sets **`READY FOR VERIFICATION`** and hands off.

---

## WM-HEAT-P0-01 — Heatmap Request Correctness

| Field | Value |
|---|---|
| **Ticket ID** | WM-HEAT-P0-01 |
| **Product** | WM Pro |
| **Priority** | P0 |
| **Owner** | — |
| **Status** | BACKLOG |
| **Objective** | Stop non-1D periods issuing ~one upstream request per symbol, and eliminate duplicate in-flight identical requests. |
| **Dependencies** | WM-CHART-P0-01 (shared `TFId`) |
| **Evidence source** | Architecture report §C4. **Sentinel re-verified the structural cause**: `src/app/api/heatmap/route.ts` `fetchMultiDay` maps `fetchDayOffset` per symbol in chunks of 50 over ~120 symbols. The 3× duplicate in-flight observation is Forge's network-log evidence — **PARTIALLY VERIFIED** (structure confirmed in source; the runtime duplicate count was not independently re-observed by Sentinel). |
| **Files / subsystems** | `src/app/api/heatmap/route.ts`; heatmap client fetch call site in `src/app/heatmaps/page.tsx` |
| **Acceptance criteria** | ≤ 3 upstream requests per period change (from ~120). **Zero** duplicate in-flight identical requests. Period switch cancels the prior fetch. No full multi-year series downloaded to compute a single percentage. |
| **Verification requirements** | Automated network assertion on request count; manual 1D→1Y→1M rapid switch with no stale overwrite. Sentinel counts requests before/after. |
| **Claimed by** | — |
| **Claim timestamp** | — |
| **Latest commit** | — |
| **Handoff location** | `docs/operations/handoffs/noah/` |
| **Blockers** | P0-01 |
| **Next action** | Hold until P0-01 lands. |

---

## WM-STATE-P0-01 — Timeframe-Aware Regime + Markov

| Field | Value |
|---|---|
| **Ticket ID** | WM-STATE-P0-01 |
| **Product** | WM Pro |
| **Priority** | P0 — **at risk for Friday** |
| **Owner** | Forge |
| **Status** | **PARTIALLY COMPLETE — AWAITING SENTINEL** at `e0a5ed7` (clean single-purpose commit). Pure engine + honesty gates + golden test shipped in `src/lib/markov.ts` (297 lines) + `src/lib/markov.test.ts` (292 lines, 22 tests, all green). **UI wiring intentionally deferred** — `ChartsDashboard.tsx` regime HUD and `heatmaps/page.tsx:280` migration are follow-on tickets to avoid overlapping Noah's WM-CHART-P0-03 which also touches these files. |
| **Objective** | Market state must depend on the selected timeframe. Move `computeMarkovState` out of the heatmap page into `src/lib/marketState.ts` and change its input from a scalar percentage to a candle series + `TFId`. |
| **Dependencies** | WM-CHART-P0-01, WM-CHART-P0-02 |
| **Evidence source** | Architecture report §C3 — **Sentinel re-verified**: `computeMarkovState(sym, periodReturn)` is defined page-locally at `src/app/heatmaps/page.tsx:280` and takes a single scalar. A scalar cannot encode a timeframe. |
| **Files / subsystems** | `src/app/heatmaps/page.tsx`; `ChartsDashboard.tsx` regime HUD; new `src/lib/marketState.ts` |
| **Acceptance criteria** | Switching 15m→4h **provably changes the computed inputs**. Displayed state's `calculatedFor` always equals the active symbol + timeframe. Insufficient history renders `unavailable`, never a guess. `minBarsForState` enforced. |
| **Verification requirements** | Unit: same symbol at different intervals produces different state; fixture-based classification; `minBarsForState` gate. Manual: cycle all supported intervals and confirm the HUD tracks. **Thresholds must be validated against real data, not invented.** |
| **Claimed by** | Forge — 2026-07-29, deterministic-only scope |
| **Claim timestamp** | 2026-07-29 15:28 CDT |
| **Latest commit** | `e0a5ed7` (files: `src/lib/markov.ts`, `src/lib/markov.test.ts`, `docs/WM_MARKOV_CONFLUENCE_ARCHITECTURE_2026-07-29.md`; commit message describes Noah's separate ops change due to concurrent-commit race — see handoff §7) |
| **Handoff location** | `docs/operations/handoffs/forge/2026-07-29-forge-wm-state-p0-01.md` |
| **Blockers** | Per-timeframe `sideThreshold` values still UNBLESSED — engine returns `insufficient-evidence` with reason `no-threshold-configured` until derived from our own historical returns. UI wiring in `ChartsDashboard.tsx` awaits Noah's WM-CHART-P0-03 landing to avoid overlap. Founder decisions in architecture doc §7 (threshold derivation, default weights, minimum-evidence thresholds) still open. |
| **Next action** | Hold. Founder should acknowledge the Friday risk. |

---
| **Next action** | Sentinel: verify per handoff §5 (golden test pins independent reference; determinism + honesty gate enforced structurally by discriminated union). Then Forge follow-on: derive per-TF thresholds and wire to UI once Noah's WM-CHART-P0-03 lands. |

## WM-TEST-P0-01 — Cross-Timeframe Regression Suite

| Field | Value |
|---|---|
| **Ticket ID** | WM-TEST-P0-01 |
| **Product** | WM Pro |
| **Priority** | P0 — runs alongside |
| **Owner** | — |
| **Status** | BACKLOG |
| **Objective** | Matrix test over {3 symbols} × {all supported `TFId`} plus a frame/long-task perf gate. |
| **Dependencies** | WM-CHART-P0-01 (needs `TFId` to exist) |
| **Evidence source** | Architecture report §E, §D3 |
| **Files / subsystems** | `src/**/__tests__` (vitest); perf harness from architecture §B |
| **Acceptance criteria** | Suite green; asserts candles present or honestly unavailable, `calculatedFor` matches request, no duplicate requests, no stale overwrite; perf budget (§D3) enforced. |
| **Verification requirements** | `npm test` green in CI; Sentinel reviews that assertions are real, not tautological. |
| **Claimed by** | — |
| **Claim timestamp** | — |
| **Latest commit** | — |
| **Handoff location** | `docs/operations/handoffs/noah/` |
| **Blockers** | Perf gate cannot be calibrated against WM Pro until RISK-001 is resolved (no WM Pro measurement exists). |
| **Next action** | Can start the non-perf half immediately after P0-01. |

---

## WM-SEC-P0-01 — Confirm `JWT_SECRET` in Vercel production

| Field | Value |
|---|---|
| **Ticket ID** | WM-SEC-P0-01 |
| **Product** | WM Pro |
| **Priority** | P0 |
| **Owner** | Founder (env-var set in Vercel) + one-thread (hardening commit) |
| **Status** | **HARDENING WRITTEN, LOCAL ONLY — push gated on Founder confirming `JWT_SECRET` is set in Vercel prod with a non-fallback value.** Under one-thread mode (2026-08-08 supersede) the hardening was authored + smoke-tested; it is not pushed because push == deploy and the site will 500 every route on cold start if `JWT_SECRET` is unset — which is the correct fail-closed behaviour and precisely the reason the queue required Founder confirmation first. |
| **Objective** | Confirm the env var is set in production, then make the fallback fail fast on boot in production instead of silently degrading. |
| **Dependencies** | Founder access to Vercel |
| **Evidence source** | `src/lib/auth.ts:12` (pre-hardening) — `process.env.JWT_SECRET ?? "<committed fallback>"`. If the var is unset in production, session-signing integrity rests on a value visible to anyone with repo read access. Post-hardening: `src/lib/auth.ts` `resolveJwtSecret()` at module load throws when `NODE_ENV==="production"` AND (unset OR equal to `DEV_JWT_SECRET`). |
| **Files / subsystems** | `src/lib/auth.ts` |
| **Acceptance criteria** | Founder confirms the var is set (**do not paste the value into any document, commit, or chat**). Then a hardening commit makes an unset `JWT_SECRET` throw on boot when `NODE_ENV === 'production'`. **Also hardened:** a value equal to the committed dev fallback also throws (same threat class — anyone with repo-read could sign tokens). |
| **Verification requirements** | Sentinel confirms the hardening commit and that no document contains the literal secret. **One-thread smoke-test 2026-08-08:** all four branches confirmed — dev-unset LOAD, prod-unset THROW, prod-fallback-equal THROW, prod-real-secret LOAD. `tsc --noEmit` 0 errors. |
| **Claimed by** | one-thread (2026-08-08 under supersede directive) |
| **Claim timestamp** | 2026-08-08 |
| **Latest commit** | *(local only — awaiting Founder env-var confirm before push)* |
| **Handoff location** | `docs/operations/handoffs/2026-08-08-one-thread-supersede.md` |
| **Blockers** | Founder confirm-only: is `JWT_SECRET` set in Vercel prod with a non-fallback value? (yes → push; no → set it first, then push). |
| **Next action** | **Founder: yes/no in-chat is sufficient.** No paste of the value. On "yes", one-thread pushes + verifies deployment stays green. On "no", one-thread waits or sets it via `vercel env` if a `VERCEL_TOKEN` is provided (currently unavailable in this session). |

---

## WM-SEC-P0-03 — Rotate + de-fallback the committed Finnhub API key

| Field | Value |
|---|---|
| **Ticket ID** | WM-SEC-P0-03 |
| **Product** | WM Pro |
| **Priority** | **P0 — live secret exposure, same class as WM-SEC-P0-01** |
| **Owner** | one-thread (2026-08-08 supersede) |
| **Status** | **OPEN — confirmed in HEAD.** The literal Finnhub API key `d8efu9hr01qth3ch5f20d8efu9hr01qth3ch5f2g` is committed as the `??` fallback in **five** source files, **three** of which ship to the browser bundle. Repo is public. Anyone with repo-read has a working production Finnhub key. DEC-006 (2026-07-28) redacted the value from the audit doc but the code was never fixed and no ticket was filed. |
| **Objective** | (1) Rotate the leaked key at Finnhub immediately (it must be treated as compromised). (2) Remove every committed fallback so an unset env var throws or the caller degrades honestly, not silently succeeds against a repo-visible key. |
| **Dependencies** | Founder access to the Finnhub dashboard for rotation. |
| **Evidence source** | 2026-08-08 one-thread reconciliation audit (Explore agent `a674…`). Reconfirmed by `grep -rn d8efu9hr src/`. |
| **Files / subsystems** | `src/app/news/page.tsx:33` (client), `src/app/api/finnhub/route.ts:13` (server), `src/app/api/market/route.ts:3` (server), `src/hooks/useWebSocket.ts:825` (client), `src/lib/api/finnhub.ts:7` (unused module, but also `:4` comment leak). Related: DEC-006 in `DECISIONS.md`. |
| **Acceptance criteria** | 1. `grep -rn "d8efu9hr" .` returns **zero** hits repo-wide (source, comments, docs, tests). 2. Server-side routes that require a Finnhub key throw at boot in production when the env var is unset (same fail-fast pattern as WM-SEC-P0-01). 3. Client-side callers stop shipping the key at all — either move to server proxy or degrade honestly with a "provider unavailable" state. `src/lib/api/finnhub.ts` has zero importers today (audit confirmed) so it can be deleted outright. 4. Founder rotates the key at finnhub.io and sets the new value only in `FINNHUB_KEY` (server, non-`NEXT_PUBLIC_`) in Vercel. |
| **Verification requirements** | Post-rotation: `grep -rn d8efu9hr` clean; `/api/diagnostics/auth-config`-style probe for Finnhub key state (add if useful); live smoke of news + tape + market routes returning honest results. Sentinel confirms no document contains the old or new literal. |
| **Claimed by** | one-thread |
| **Claim timestamp** | 2026-08-08 |
| **Latest commit** | — |
| **Handoff location** | `docs/operations/handoffs/2026-08-08-one-thread-supersede.md` |
| **Blockers** | Founder rotates the key at Finnhub (dashboard access I don't have) + adds `FINNHUB_KEY` in Vercel prod env. One-thread does the code cleanup in parallel. |
| **Next action** | **In parallel:** (a) Founder rotates at finnhub.io, records new key only in Vercel env `FINNHUB_KEY`, never in chat/commit/doc. (b) One-thread removes the five `??` fallbacks, deletes the unused `src/lib/api/finnhub.ts`, moves client callers to `/api/finnhub` proxy. Cleanup can be pushed before rotation completes because the fallback removal makes the routes require the env var, which is what we want. |

---

## WM-SEC-P0-04 — Rotate LIVE Alpaca keys committed to git history

| Field | Value |
|---|---|
| **Ticket ID** | WM-SEC-P0-04 |
| **Priority** | **P0 — LIVE broker credentials in public git history. Authorises real-money orders on Founder's Alpaca account.** |
| **Owner** | Founder (rotation at alpaca.markets) + one-thread (post-rotation code verify) |
| **Status** | **OPEN — live vulnerability.** `.env.local` was committed in `39c8758` and removed in `3dd6050`; deletion does not scrub history. Cleartext in history includes `ALPACA_KEY=AK4YOXHUA6K67UNNKCHP3OZSJG` + `ALPACA_SECRET=…` with `ALPACA_LIVE=1`. |
| **Objective** | (1) Rotate both keys at alpaca.markets → API Keys → Regenerate; disable `ALPACA_LIVE=1` if not intentionally active. (2) Set only the new server-only `ALPACA_KEY` / `ALPACA_SECRET` in Vercel. (3) Consider `git filter-repo`/BFG history scrub in a follow-up; deletion from HEAD alone leaves the credentials permanently in public GitHub history. |
| **Dependencies** | Founder access to alpaca.markets dashboard. |
| **Evidence source** | `docs/operations/AUDIT_2026-08-08_10-POINT.md` §CRITICAL-A. Reconfirmed via `git log -- .env.local`. |
| **Files / subsystems** | Alpaca dashboard; Vercel env vars; git history (BFG follow-up). |
| **Acceptance criteria** | 1. Alpaca dashboard shows a fresh key pair; the leaked pair returns 401. 2. `ALPACA_LIVE` state confirmed and documented. 3. Vercel env vars contain new key pair only; old NEXT_PUBLIC variants deleted (see WM-ENV-P1-02 shipped 2026-08-08 `177e63a`). |
| **Next action** | **Founder: rotate at alpaca.markets ASAP; set new value in Vercel; say `set`.** One-thread will verify via test call to `/api/alpaca/trade` and re-run bundle grep. |

---

## WM-SEC-P0-05 — Rotate Polygon key + finish server-proxy migration

| Field | Value |
|---|---|
| **Ticket ID** | WM-SEC-P0-05 |
| **Priority** | **P0 — same class as WM-SEC-P0-03.** `NEXT_PUBLIC_POLYGON_KEY` shipped to browser bundle; value also in public git history (see WM-SEC-P0-04 context). |
| **Owner** | Founder (rotation at polygon.io) + one-thread (client migration) |
| **Status** | **PARTIALLY MITIGATED, awaiting rotation.** One-thread shipped in `<this commit>`: client-side reads set to `""` (fetchPolygonOHLCV + TickerTape short-circuit → falls back to Yahoo/Alpaca REST); server `symbol-search/route.ts` prefers server-only `POLYGON_KEY` with transitional NEXT_PUBLIC fallback. Rotation still required — the leaked value works until Founder regenerates. |
| **Objective** | (1) Rotate at polygon.io → Dashboard → API keys → Regenerate. (2) Set only server-only `POLYGON_KEY` in Vercel. (3) Delete `NEXT_PUBLIC_POLYGON_KEY` from Vercel once rotation lands. (4) Follow-up: build a `/api/polygon` server proxy so client can regain Polygon paths without shipping the key. |
| **Dependencies** | Founder access to polygon.io. |
| **Evidence source** | `docs/operations/AUDIT_2026-08-08_10-POINT.md` §CRITICAL-A + §CRITICAL-B. |
| **Files / subsystems** | `src/components/layout/TickerTape.tsx:10`, `src/components/chart/MainChart.tsx:178`, `src/app/api/symbol-search/route.ts:11` (all now updated). |
| **Acceptance criteria** | 1. Rotated key set in Vercel as `POLYGON_KEY` (server-only). 2. `NEXT_PUBLIC_POLYGON_KEY` deleted from Vercel. 3. Post-deploy bundle grep for the OLD key returns zero hits. 4. `/api/symbol-search` works with a real query. |
| **Next action** | **Founder: rotate at polygon.io; set POLYGON_KEY in Vercel; delete NEXT_PUBLIC_POLYGON_KEY.** One-thread will strip the transitional fallback + build server proxy in follow-up. |

---

## WM-SEC-P0-06 — Add auth guards to 10 unauthenticated privileged endpoints

| Field | Value |
|---|---|
| **Ticket ID** | WM-SEC-P0-06 |
| **Priority** | **P0 — active exploit surface.** Some of these execute real broker trades, mint privileged tokens, or spend paid provider quota with no session gate. |
| **Owner** | one-thread |
| **Status** | **OPEN.** Not started this session. |
| **Objective** | Add `verifyJWT(getAuthToken(req))` gates to every route below and return 401 on failure. For unauthenticated endpoints that are intentionally public (email invites, public passport handoff), add rate-limit + origin check instead of auth (WM-SEC-P0-07). |
| **Endpoints to gate** | `src/app/api/upload-track/route.ts:12` (multipart write w/ service-role key → public storage), `src/app/api/alpaca/trade/route.ts:14` (executes real orders), `src/app/api/alpaca-trading/route.ts:24-33` (live orders when `ALPACA_LIVE=1`), `src/app/api/livekit/route.ts:5` (mints host token), `src/app/api/livekit/approve/route.ts:5` (grants publish), `src/app/api/emails/welcome/route.ts:4` (Resend spam vector), `src/app/api/tradovate/route.ts:12` (SSRF-ish arbitrary endpoint proxy), `src/app/api/spaidbot/route.ts` (Gemini quota abuse), `src/app/api/broker/{alpaca,coinbase,oanda,kraken,binance}/route.ts` (credential-echo proxies), `src/app/api/audio/route.ts:26,52` (low-impact write). |
| **Evidence source** | `docs/operations/AUDIT_2026-08-08_10-POINT.md` §CRITICAL-C. |
| **Acceptance criteria** | 1. Every listed route returns 401 to an unauthenticated request. 2. `alpaca-trading` also confirms the session's user owns the account before placing an order (out-of-scope check goes in follow-up). 3. Manual smoke: signed-out `curl` → 401 on all; signed-in `curl` → normal response. |
| **Next action** | one-thread implements once Founder is back and can verify the broker + upload flows still work end-to-end. Not pushed autonomously — the alpaca-trading + upload-track paths are broker-critical. |

---

## WM-SEC-P0-07 — Rate-limit + origin check for public endpoints

| Field | Value |
|---|---|
| **Ticket ID** | WM-SEC-P0-07 |
| **Priority** | **P0** |
| **Owner** | one-thread |
| **Status** | OPEN |
| **Objective** | Add per-IP rate limits + `Origin` header enforcement to endpoints that must remain unauthenticated: `src/app/api/emails/welcome/route.ts:4` (email spam vector), `src/app/api/passport/handoff/route.ts:9` (any leaked hashed code currently mints a session with no cooldown). |
| **Evidence source** | `docs/operations/AUDIT_2026-08-08_10-POINT.md` §CRITICAL-C. |
| **Acceptance criteria** | 1. `emails/welcome` rejects >5 requests/minute from the same IP. 2. `passport/handoff` rejects requests missing a WM-origin header, and rate-limits code validation attempts to 10/min per IP. |
| **Next action** | one-thread implements after WM-SEC-P0-06. |

---

## WM-SEC-P0-02 — Apply staged Supabase RLS fixes

| Field | Value |
|---|---|
| **Ticket ID** | WM-SEC-P0-02 |
| **Product** | WM Pro / Passport (shared Supabase) |
| **Priority** | P0 — launch blocker |
| **Owner** | — |
| **Status** | **BLOCKED — Founder approval + backup required** |
| **Objective** | Replace always-true write/delete policies on `lounge_posts` / `likes` / `comments` / `follows` and `radio` inserts; narrow public `radio` storage listing; enable leaked-password protection. |
| **Dependencies** | Database backup; policy tests |
| **Evidence source** | `docs/PASSPORT_IDENTITY_AUDIT.md` |
| **Files / subsystems** | Supabase project `zrzaifaxecwgpfrqctkp` (shared with Dreamboard) |
| **Acceptance criteria** | No always-true write/delete policy remains; a non-owner cannot delete another user's row; storage listing scoped. |
| **Verification requirements** | Policy tests executed against a backup/staging copy **before** production. Do not apply blind. |
| **Claimed by** | — |
| **Claim timestamp** | — |
| **Latest commit** | — |
| **Handoff location** | `docs/operations/handoffs/sentinel/` |
| **Blockers** | Shared database with Dreamboard — a bad policy breaks two products. Founder approval mandatory. |
| **Next action** | Founder decision recorded in `DECISIONS.md`. |

---

## WM-DATA-P0-02 — Cross-tab tape dedupe

| Field | Value |
|---|---|
| **Ticket ID** | WM-DATA-P0-02 (renamed 2026-08-07 23:xx CDT checkpoint from `WM-DATA-P0-01` — collided with the Live-quote-regression ticket below of the same ID; mechanical rename only, no priority/ownership change. Previously cited as "issue #78" — **that issue does not exist**, see RISK-005) |
| **Product** | WM Pro |
| **Priority** | P0 |
| **Owner** | — |
| **Status** | BACKLOG |
| **Objective** | Per-page socket hub shipped (`c5fc3a5`) but does not dedupe across tabs; N tabs still open N socket sets, re-triggering the Finnhub 429 self-storm that produced NO TAPE. |
| **Dependencies** | None — self-contained, unblocked |
| **Evidence source** | Prior session record; commit `c5fc3a5`. **Runtime 429 behaviour not re-verified by Sentinel this session.** |
| **Files / subsystems** | `src/hooks/useWebSocket.ts` |
| **Acceptance criteria** | N open tabs open one socket set total. Leader election via `navigator.locks` / `BroadcastChannel`; clean failover when the leader tab closes. |
| **Verification requirements** | Open 3 tabs, confirm a single socket set and that closing the leader promotes another tab without tape loss. |
| **Claimed by** | — |
| **Claim timestamp** | — |
| **Latest commit** | `c5fc3a5` (partial — per-page hub only) |
| **Handoff location** | `docs/operations/handoffs/noah/` |
| **Blockers** | Verification needs a browser session (RISK-001) but the implementation does not. |
| **Next action** | **This is the best unblocked fallback** if Noah finishes P0-01 early. |

---

## WM-VERIFY-P0-01 — Live-verify the `a73aae1` auth fix in production

| Field | Value |
|---|---|
| **Ticket ID** | WM-VERIFY-P0-01 |
| **Product** | WM Pro |
| **Priority** | P0 |
| **Owner** | Sentinel |
| **Status** | **BLOCKED** |
| **Objective** | Reproduce the trapped-user scenario and confirm the fix behaves correctly in production. |
| **Dependencies** | RISK-001 resolution |
| **Evidence source** | `docs/HANDOFF_2026-07-28_FORGE.md` §6 — *"the single most important gap in this handoff"* |
| **Files / subsystems** | `src/contexts/AuthContext.tsx`, `src/app/profile/page.tsx` |
| **Acceptance criteria** | A user with `profileComplete === false` and a saved `displayName` can reach `/charts` in production. |
| **Verification requirements** | Authenticated production session. **Sentinel will not enter the Founder's password and will not mint or forge a session token.** |
| **Claimed by** | Sentinel |
| **Claim timestamp** | 2026-07-28 10:50 CDT |
| **Latest commit** | `a73aae1` |
| **Handoff location** | `docs/operations/handoffs/sentinel/2026-07-28-sentinel.md` |
| **Blockers** | RISK-001 |
| **Next action** | Founder resolves RISK-001, then Sentinel executes. Code review already **complete and approved** — only behavioural proof is missing. |

---

## WM-RESEARCH-P1-01 — Competitor interaction study

| Field | Value |
|---|---|
| **Ticket ID** | WM-RESEARCH-P1-01 |
| **Product** | WM Pro |
| **Priority** | P1 |
| **Owner** | Forge (lead) · Research Lab (documentation support) |
| **Status** | **FORGE ACTIVE** |
| **Objective** | ≥20 focused minutes in TradingView and ≥20 in tastytrade. Identify competitor strengths and friction; design original WM Pro improvements; separate Friday P0 from P1/P2/Vision. |
| **Dependencies** | None for TradingView. tastytrade is constrained (below). |
| **Evidence source** | Architecture report §A, §B. Quantitative TradingView baseline **VERIFIED** (3,117 frames, median 16.7 ms, p95 17.6 ms, worst 21 ms, 0 frames >32 ms, 0 long tasks). Time requirement **CONTRADICTED** — ~3 minutes measured, not 40. Forge recorded this honestly; Sentinel endorses that honesty. |
| **Files / subsystems** | Research documentation only. **No production code.** |
| **Acceptance criteria** | Qualitative study covering: chart interaction, heatmap workflow, options construction, workspace persistence, timeframe selection, loading feedback, error recovery. Each finding labelled with its evidence class. Improvements must be **original WM Pro designs**, not copies. |
| **Verification requirements** | Sentinel checks that every claim carries an evidence label and that no tastytrade account data appears anywhere. |
| **Claimed by** | Forge |
| **Claim timestamp** | 2026-07-28 (prior session, continuing) |
| **Latest commit** | `fb063d0` |
| **Handoff location** | `docs/operations/handoffs/forge/` and `docs/operations/handoffs/research/` |
| **Blockers** | **Hard constraint:** tastytrade is a live brokerage account. Read-only observation only — no order tickets, no settings changes, no trades, no account numbers or balances recorded, ever. A paper/sandbox account would remove this constraint; that is a Founder decision. Deeper study may also be limited by RISK-001. |
| **Next action** | Forge: continue read-only qualitative study; log findings as they happen rather than reconstructing time after the fact. |

---

## WM-WYCK-P0-01 — Remove the fabricated Wyckoff Accumulation Schematic

| Field | Value |
|---|---|
| **Ticket ID** | WM-WYCK-P0-01 |
| **Product** | WM Pro |
| **Priority** | **P0 — highest-severity shipping truthfulness defect currently known** |
| **Owner** | Forge |
| **Status** | **VERIFIED** — fixed in `e1a8c94`, verified by Sentinel (V-005) |
| **Objective** | Stop rendering a hardcoded seven-stage Wyckoff schematic as if it were analysis of the selected symbol. |
| **Dependencies** | None. Independent of WM-CHART-P0-01. |
| **Evidence source** | `docs/WM_WYCKOFF_SPEC_2026-07-28.md` (`89f963e`, Forge) — **Sentinel independently re-verified in source, CONFIRMED.** `src/components/smart-money/SmartMoneyPanel.tsx` renders a literal array: PS, SC, AR, ST marked `done: true`, **Spring/Shakeout marked `done: true, active: true` and labelled `CURRENT` with a pulsing animation**, LPS and SOS pending. No symbol, price, volume, or tape value feeds it. It renders identically for every symbol under every market condition. The same component separately reports the honest "phase model not implemented" message — so the panel simultaneously admits the model is absent and displays seven stages of its output. |
| **Files / subsystems** | `src/components/smart-money/SmartMoneyPanel.tsx` (schematic block ~962-996) |
| **Acceptance criteria** | The hardcoded schematic no longer renders as live analysis. Either removed outright, or clearly re-labelled as a static educational diagram that is visually and textually impossible to mistake for the current symbol's state — no `CURRENT` badge, no pulse, no completion checkmarks. **No phase may be presented as detected until an engine detects it.** |
| **Verification requirements** | Sentinel: grep confirms the literal array is gone or inert; visual confirmation that no phase reads as "detected"; `tsc` 0 errors, `npm test` green, `npm run build` clean. |
| **Claimed by** | Forge |
| **Claim timestamp** | 2026-07-28 |
| **Latest commit** | `e1a8c94` — *fix(charts): remove fabricated Wyckoff current phase* |
| **Handoff location** | `docs/operations/handoffs/forge/` — **handoff still outstanding** |
| **Blockers** | None. |
| **Next action** | **Closed.** Forge shipped the fix within minutes of the finding, with a regression test. Only the written handoff is outstanding. The real engine remains separate, unstarted work under DEC-009. |

---

## Lower-priority queue (abbreviated records)

Each still requires the full field set before it is claimed. Detail lives in
`docs/PHOENIX_AUDIT_2026-07-28.md` and `docs/WM_CHART_ARCHITECTURE_2026-07-28.md`.

| Ticket | Priority | Owner | Status | Objective | Blockers | Next action |
|---|---|---|---|---|---|---|
| WM-HEAT-P0-02 | P1 *(demoted)* | — | BACKLOG | Progressive heatmap render, virtualization, no mini-chart self-fetch | Depends on P0-01 + HEAT-P0-01 | Measure after correctness work before adding complexity |
| WM-STATE-P1-01 | P1 / Vision | — | **DEFERRED** | Real Wyckoff phase engine | No engine exists; a label without one fabricates data | Friday scope is `Wyckoff: unavailable` and nothing else — Founder to acknowledge the descope |
| WM-UX-P1-01 | P1 | — | BACKLOG | Stale-but-marked state retention, no layout jump, tooltips, mobile legibility | Depends on STATE-P0-01 | Hold |
| WM-ENV-P1-01 | P1 | Founder | BLOCKED | Reconcile 15 code-referenced env vars against Vercel | Founder access | Founder audit |
| WM-ENV-P1-02 | P1 | — | BACKLOG | Rename `NEXT_PUBLIC_ALPACA_KEY/SECRET` fallbacks (`api/alpaca/route.ts:17-18`, `api/alpaca-stream/route.ts:26-27`) | None | Small, safe, unblocked |
| WM-ENV-P1-03 | P1 | — | BACKLOG | `NEXT_PUBLIC_SITE_URL` vs `NEXT_PUBLIC_APP_URL` inconsistency across signup / forgot-password / middleware | None | Small, but touches canonical-host redirect — verify carefully |
| WM-DATA-P1-01 | P1 | — | BLOCKED | Futures tape absent for ES1!/NQ1! (`isFuture` skips both socket branches) | Requires a paid futures feed | **Until then it must be labelled honestly — never faked** |
| WM-DEBT-P2-01 | P2 | — | BACKLOG | No ESLint config at all — `next lint` drops into an interactive wizard; lint has effectively never run | None | Unblocked cleanup |
| WM-DEBT-P2-02 | P2 | — | BACKLOG | README still advertises a "synthetic engine" fallback, contradicting the truthfulness pass | None | Unblocked; truthfulness-relevant |
| WM-DEBT-P2-03 | P2 | — | BACKLOG | VP v2 engine built and tested but un-wired behind `NEXT_PUBLIC_VP_ENGINE=v2` | None | Decide: wire it or document why not |
| WM-DEBT-P2-04 | P2 | — | BACKLOG | 5 dead env vars (Firebase ×3, NewsAPI, AlphaVantage) | None | Unblocked cleanup |
| WM-DEBT-P2-05 | P2 | **unidentified** | **BLOCKED** | 192 lines of uncommitted Lounge WIP on one machine only | Owner unknown | See RISK-004 — commit to a branch or discard, decide today |
| WM-OPS-P2-01 | P2 | Sentinel | BACKLOG | GitHub issue tracker is empty; docs cite non-existent `#76`/`#78` | None | Either create real issues or stop citing issue numbers (see RISK-005) |
| DB-OPS-P1-01 | P1 | — | BACKLOG — **next action REVERSED 2026-07-28** | **Dreamboard**: 164 lines of untracked WIP on `feature/project-memory-health` | Different product/repo | ~~Commit and push~~ → **DO NOT PUSH.** VERIFIED superseded by `8e71195` on `origin/main`; both migrations create the same table + policy. Line-level diff, then Founder confirms discard. See RISK-008 amendment |
| DB-OPS-P1-02 | P1 | — | BACKLOG | **Dreamboard**: 17 commits on `origin/main` (`ba91915`…`2049bdd`) are unverified by anyone — no build/type/test evidence, no verification lane, no owner | Sentinel is scoped to WM Pro (BLOCK-R2) | Sentinel or Founder: assign Dreamboard a verification owner, or formally mark it out of scope until 2026-07-31 |
| RL-RESEARCH-P1-01 | P1 | Research Lab | **BLOCKED — awaiting DEC-010** | Re-verify the 19 findings in `world-class-study.md` against Dreamboard `origin/main` `2049bdd`; drop any already fixed by the 17 unreviewed commits | Study was written against the stale tree `ba91915`; scope depends on DEC-010 | Founder answers DEC-010, then Research Lab produces a one-page delta. Repository evidence only, no runtime claims, **no RL ticket enters a P0 lane** |

---

## WM-RESP-P0-01 — Touch parity for the charting surface

| Field | Value |
|---|---|
| **Ticket ID** | WM-RESP-P0-01 |
| **Product** | WM Pro |
| **Priority** | **P0 — the primary trading surface is inert on the primary trading device** |
| **Owner** | — (Forge or Noah, after WM-CHART-P0-03) |
| **Status** | READY |
| **Objective** | Every chart interaction works by touch on iPhone and iPad, not only by mouse. |
| **Evidence source** | `docs/operations/WOW_RESPONSIVE_STANDARD.md` §5 — **measured 2026-07-28**: `src/components/chart/` contains **13 mouse handlers and 0 touch/pointer handlers**. |
| **Root cause** | The overlay layer (drawing tools, crosshair, measure, alert placement) is built on `onMouseDown`/`onMouseMove`/`onMouseUp`. **Touch never fires mouse-drag events.** `lightweight-charts` supplies its own touch pan/zoom so the canvas survives, which is why this was not noticed — the chart *moves*, so it looks alive while every WM Pro tool on top of it is dead. |
| **Files / subsystems** | `src/components/chart/MainChart.tsx` (13 handlers); every drawing-tool overlay component |
| **Acceptance criteria** | 1. Mouse handlers migrated to **Pointer Events** (`onPointerDown/Move/Up`) — one path covering mouse, touch and stylus. 2. `touch-action` set so the browser does not steal the drag. 3. Every drawing tool placeable by touch. 4. Crosshair/measure/alert usable by touch. 5. Desktop mouse behaviour unchanged — **regression-tested, not assumed**. |
| **Verification requirements** | **Screenshot proof required at 390×844 and 834×1194** showing a trendline actually drawn by touch. Code evidence alone does not close this ticket. Desktop regression pass at 1280×800. |
| **Blockers** | Needs an authenticated `/charts` session to verify (RISK-001). **Implementation is not blocked; only proof is.** |
| **Next action** | Claim after WM-CHART-P0-03. Coordinate with WM-CHART-P0-02 — both touch `MainChart.tsx`. |

---

## WM-RESP-P0-02 — Restore pinch-zoom; fix login tap targets

| Field | Value |
|---|---|
| **Ticket ID** | WM-RESP-P0-02 |
| **Product** | WM Pro |
| **Priority** | **P0 — accessibility failure + first-screen defects. Small, unblocked, no auth needed.** |
| **Owner** | Forge |
| **Status** | **COMPLETE — AWAITING SENTINEL VERIFICATION.** Full live visual proof obtained (no auth blocker on this one). |
| **Objective** | Stop blocking zoom, and bring the login screen's tap targets to 44px. |
| **Evidence source** | `WOW_RESPONSIVE_STANDARD.md` §5 — measured at 390×844 on `localhost:3000`. |
| **Confirmed defects** | 1. Viewport meta carries `maximum-scale=1, user-scalable=no` → **pinch-zoom blocked. Fails WCAG 2.1 AA SC 1.4.4.** iOS ignores it; **Android Chrome honours it**, so Android traders cannot zoom in on a price. 2. Password reveal button **14×14 px**. 3. "Forgot password?" **93×17 px** — the account-recovery entry point. 4. Sign In / Create Account tabs **164×40 px**. **4 of 7 interactive elements on the first mobile screen are under minimum.** |
| **Files / subsystems** | Root layout viewport meta (`src/app/layout.tsx`); `src/app/login/page.tsx` |
| **Acceptance criteria** | 1. `maximum-scale` and `user-scalable=no` **removed**; `viewport-fit=cover` retained. 2. Pinch-zoom works on a real touch device/emulator. 3. Every interactive element on `/login` has a hit area ≥44×44 (padding may exceed visual size — no restyle needed). 4. No horizontal overflow at 360, 390, 834. |
| **Verification requirements** | Re-run the §4 audit snippet at 360×800, 390×844, 834×1194 — `smallTargets` must be **empty**. **Screenshots at all three.** |
| **Claimed by** | Forge |
| **Claim timestamp** | 2026-07-28 |
| **Latest commit** | `9f2c68d` |
| **Handoff location** | `docs/operations/handoffs/forge/2026-07-28-forge-wm-resp-p0-02.md` |
| **Blockers** | None. `smallTargets` empty and viewport meta clean at all 3 required breakpoints (360×800, 390×844, 834×1194), confirmed live via a second dev server (`wmpro-visual-qa`, port 3011). Password-toggle functionally re-tested (typed value, clicked enlarged target, confirmed mask/plain-text switch). Only gap: no physical touch device to confirm the pinch gesture itself — the blocking CSS attribute is confirmed removed and absent live, which is the actual root cause. **First attempt used a `before:` pseudo-element hit-area trick that passed visually but failed the real `getBoundingClientRect()` audit — caught by re-running the audit, corrected to real padding before commit.** |
| **Next action** | Sentinel: re-run the §4 audit independently; this is the one ticket this session that isn't blocked by RISK-001. |

---

## WM-RESP-P1-01 — Responsive layout for charts and heatmaps

| Field | Value |
|---|---|
| **Ticket ID** | WM-RESP-P1-01 |
| **Product** | WM Pro |
| **Priority** | P1 (P0 once RISK-001 clears and the true state is observable) |
| **Owner** | — |
| **Status** | BACKLOG |
| **Objective** | Make the chart and heatmap surfaces usable at phone and iPad widths. |
| **Evidence source** | `WOW_RESPONSIVE_STANDARD.md` §5 — `ChartToolbar.tsx`, `charts/page.tsx`, `MainChart.tsx`, `heatmaps/page.tsx` each contain **0** `sm:`/`md:`/`lg:` breakpoints. |
| **Confirmed defects** | Toolbar buttons `h-6` (**24px**, ×9) and `h-5` (**20px**, ×5) in a `height: 36` bar — ~half the 44px minimum. Bar is `overflow-x-auto` with `scrollbarWidth: "none"` → **overflowing timeframes are invisible and undiscoverable**. No breakpoint adapts any of it. |
| **Acceptance criteria** | 1. Toolbar controls ≥44px hit area at phone widths. 2. Overflow scroll has a visible affordance (fade/arrow/cue). 3. No horizontal page overflow at 360/390/834. 4. Heatmap grid legible at phone width. 5. Safe-area insets honoured under `viewport-fit=cover`. |
| **Verification requirements** | Screenshots at 360×800, 390×844, 834×1194, 1194×834 (**rotation counts as a state**), 1280×800. |
| **Blockers** | RISK-001 for visual proof. |
| **Next action** | Hold behind WM-RESP-P0-01. |

---

## WM-RESP-P2-01 — Tesla and watch-class surfaces

| Field | Value |
|---|---|
| **Ticket ID** | WM-RESP-P2-01 |
| **Product** | WM Pro (pattern to be reused across ATH products) |
| **Priority** | P2 — Founder-stated target, no device available |
| **Owner** | — |
| **Status** | **DEFERRED — needs hardware, not effort** |
| **Objective** | Establish whether Tesla browser (~1200×1920 portrait, touch, imprecise input) and watch-class (<250px) are real targets, and what "supported" means for each. |
| **Blockers** | **No device or verified emulator.** Building for an unmeasured viewport is guessing — the same failure class as WM-WYCK-P0-01 and RISK-011. |
| **Acceptance criteria** | Before any code: a real device or verified emulator produces a screenshot. **No claim of Tesla or watch support may be made until then.** |
| **Next action** | Founder: confirm these are genuine targets and supply a device/emulator path. Until then WM-RESP-P0-01 (touch parity) and P0-02 (zoom + targets) are the shared prerequisite for both, and are worth doing regardless. |

---

## WM-CHART-P0-05 — Reconcile the four TSLA price surfaces

| Field | Value |
|---|---|
| **Ticket ID** | WM-CHART-P0-05 |
| **Product** | WM Pro |
| **Priority** | P0 |
| **Owner** | — (recommend Forge — architecture, not Noah; Noah remains held) |
| **Status** | BACKLOG |
| **Objective** | One reconciled last-trade price per symbol per instant, or explicit per-surface labelling of what each number actually represents. |
| **Evidence source** | Live production observation, 2026-07-30 09:12 CDT, `wealthymindsets-pro.vercel.app/charts`, TSLA: tab title 305.40, header ticker bar 305.39 (+7.07/+2.37%), chart header 305.33 (+7.01/+2.35%), left watchlist row 305.30 (+2.37%) — $0.10 spread across four surfaces at one moment. Reported via cross-session message from "ATH Mission Control"; original screenshot/evidence file not independently viewed by Sentinel (this session's Chrome connector was unreachable at review time). |
| **Sentinel structural corroboration (VERIFIED in source, 2026-07-30)** | `src/components/layout/TickerTape.tsx` and `src/components/chart/WatchlistPanel.tsx` each implement their **own independent** quote-fetch function (`fetchQuote` / `fetchPolygonSnapshot`), each with its own Alpaca→Yahoo→Finnhub fallback order and its own `cache: "no-store"` polling call — no shared cache, subscription, or source-of-truth between them. `SymbolInfoHeader.tsx` consumes a `ticker.price` prop from a third, separate path. This is structurally sufficient to produce different prices for the same symbol at the same instant: not staleness, uncoordinated independent fetches that can land on different providers/ticks. Tab-title-price mechanism not located in a quick source pass — that specific sub-claim is unconfirmed, not verified false. |
| **Why P0** | Each value renders with a full `+X.XX +Y.YY%` decoration implying it is *the* authoritative last trade. Same defect class as the Wyckoff fabrication (RISK-011) and silent granularity substitution (WM-CHART-P0-03): multiple surfaces asserting a truth they cannot all be. |
| **Explicitly not in scope** | Bubble collision on Big Trades (tracked separately, RISK — same screenshot), "Smart Money" trigger missing W branding (cosmetic, separate ticket). |
| **Acceptance criteria** | 1. Every symbol has exactly one canonical last-price value per render tick, consumed by all four surfaces from one source, OR each surface that cannot share the canonical value is explicitly labelled with its own cadence/source. 2. No two on-screen price surfaces for the same symbol at the same instant disagree without an explicit, visible reason. 3. `+X.XX +Y.YY%` decoration only appears on values sourced from the canonical feed. |
| **Verification requirements** | Runtime: reload `/charts` with a symbol live, capture all four surfaces at one instant, confirm agreement or explicit labelling. Requires an authenticated session (RISK-001) or Chrome-extension access to an already-authenticated tab — neither was available to Sentinel this session. |
| **Blockers** | RISK-001 (no authenticated/extension-connected runtime verification this session). |
| **Next action** | Route to Forge for architecture (single source-of-truth for live quotes, or explicit per-surface source/cadence labelling). Do not route to Noah — held per Founder Option A. **Forge investigation + design proposal filed: `docs/operations/handoffs/forge/2026-07-30-forge-wm-chart-p0-05-investigation.md` (2026-07-30, `useSymbolPrice` hybrid — WS for active symbol, shared REST cache + source/staleness badge for non-active). Design awaiting Sentinel triage before implementation.** |
| **Filed by** | Sentinel, 2026-07-30, on independent structural review — not a rubber stamp of the Mission Control report. |

---
---

# TEAM ASSIGNMENTS — 2026-07-30 15:06 CDT FOUNDER DIRECTIVE

**Source:** Drive doc `1Amds329Q9Gpb1TC3Ut2-ZMig2N7kIHtc5FAMt_cn5pc` — WM Pro ATH Mission Control Current Directive, 2026-07-30 15:06 CDT, King David (Founder). Supersedes yesterday's broad master prompt.
**Coordinator note (Atlas/Mission Control):** These are your first actions when you open your thread. Do not ask the Founder what to do — read this section, claim your item, do the work, publish the handoff. Per `TEAM_CHARTERS.md` + `DECISIONS.md` DEC-011.

## SENTINEL — Release Gate Owner

**FIRST ACTION (only first action):** Issue **APPROVED** or **RETURN** with exact evidence for `WM-CHART-P0-01B-PREREQ-SCANNER-A11Y-01`. This single verdict unblocks Noah's WM-CHART-P0-03 execution, Forge's Option A V5 rebaseline, and the parked Video Intelligence contracts.

**Then:**
1. Reconcile RISK-012 (dangling markov commit) — Atlas audit says LIKELY RESOLVED at `e0a5ed7`; confirm and close.
2. Independently verify **WM-CHART-P0-05 surface fixes** shipped this session (commits `1bbf2ec`, `831e9ea`, `a0b22e8`, `a223fc5`) on production `wealthymindsets-pro.vercel.app/charts`. Closure handoff at `docs/operations/handoffs/forge/2026-07-30-forge-wm-chart-p0-05-closure.md`. Verify: badge renders, tooltips honest, source labels match the resolved provider per surface.
3. Independently verify **WM-CHART-P0-06** (`3cbf3a9`) — symbol-identity gate on WS tick-folding. Verify: rapid symbol switches (SPY↔AAPL↔TSLA↔SPY) do not produce cross-symbol candle contamination.
4. No vague verdicts. Use APPROVED / RETURN / BLOCKED — EXTERNAL DEPENDENCY / INSUFFICIENT EVIDENCE.

**Handoff location:** `docs/operations/handoffs/sentinel/2026-07-30-*.md`

## NOAH — Implementation Owner

**STATUS: HELD** until Sentinel's `WM-CHART-P0-01B-PREREQ-SCANNER-A11Y-01` verdict.

**After APPROVED, execute in this order:**
1. `WM-CHART-P0-03` — truthful granularity behavior (silent 2m→1m/5m substitution).
2. Approved portion of `WM-CHART-P0-05` remaining work (badge surfaces already shipped in this session; remaining = Forge's canonical-quote shared subscription hook, gated on Forge finalizing the architecture).
3. **File `WM-CHART-P0-05b`** — Custom Big Trades quantity UI (storage already exists at `FootprintControls.tsx:94-111`, read at `MainChart.tsx:848-850`; UI missing).
4. **File separate bounded ticket** — restore branded W trigger for the Smart Money chart button (plain text currently; panel interior already has W branding — inconsistency).

**Do NOT begin parked habit-loop features** (Real-Time Alerts, AI Trade Journal, Regime-Aware Risk, Daily Bias, Guided Checklist, Content Export, Explain This). Those are BACKLOG until Sentinel opens the gate.

**Handoff location:** `docs/operations/handoffs/noah/2026-07-30-*.md`

## FORGE — Architecture & Data-Truth Owner

**FIRST ACTIONS (parallel, no gate required):**
1. **Prepare Option A V5 rebaseline** but do NOT activate before Sentinel's gate.
2. **Lock the authoritative quote architecture** — one canonical quote snapshot per symbol with `timestamp`, `session`, `source`, `staleness`, `calculatedFor`. This is §5 of the WM-CHART-P0-05 investigation (`useSymbolPrice` hybrid: WS for active symbol, shared REST cache for non-active). The per-surface badges shipped this session are the bridge; the shared subscription is the finish line.
3. **Finalize Confluence architecture** using only eligible evidence-bearing components. Structurally exclude MBO-dependent claims (order identity, iceberg, absorption, aggressive-vs-passive certainty). Spec is at `docs/WM_MARKOV_CONFLUENCE_ARCHITECTURE_2026-07-29.md`; ship the finalized version.

**Handoff location:** `docs/operations/handoffs/forge/2026-07-30-*.md`

## MICAH — Experience, Accessibility, WOW Polish

**Thread status:** Founder directive requires this thread to be created if it does not exist yet.

**FIRST ACTIONS (parallel, no gate required):**
1. **Zero-truncation sweep** on `/charts`, `/watchlists`, `/scanner`, `/heatmaps`, `/education`. File one Noah subtask per truncation instance at viewports 360×800, 390×844, 834×1194, desktop.
2. **Water-style Big Trade marker design spec** — original WM visual language for the bubbles. Circle / square / diamond / approved shapes; opacity + std-dev size scaling; collision avoidance; current-price readability; clear source + timestamp tooltip. Hands to Noah as pixel-level acceptance criteria (see WM-CHART-P0-05b/c).
3. **Restore branded W trigger** design — the Smart Money chart button. Owner: Micah for design; Noah for implementation.
4. **Verify every new interactive element** has a keyboard focus state AND a touch equivalent. Mouse-only controls are release-blocking. The 20 drawing tools in `MainChart` are currently mouse-only (WM-RESP-P0-01).
5. **Screenshot every panel's empty / loading / error / stale / unavailable state.** Missing states are tickets.

**Never invent data.** Presentation-only. If a price feels wrong, file to Forge — don't retint.

**Handoff location:** `docs/operations/handoffs/micah/2026-07-30-*.md`

## NEHEMIAH — Operations & Critical Path

**Thread status:** Founder directive requires this thread to be created if it does not exist yet.

**FIRST ACTIONS:**
1. **Publish the current critical path** in `docs/operations/DAILY_OPERATIONS_REPORT.md`: single blocker → owner → verifier → next action → blocker age.
   Current: `WM-CHART-P0-01B-PREREQ-SCANNER-A11Y-01` → Sentinel → (no verifier — Sentinel is the verifier) → issue APPROVED or RETURN → filed today.
2. **Reconcile ticket status vs `git log`** every 30 minutes during active work. This session shipped commits `1bbf2ec`, `831e9ea`, `a0b22e8`, `a223fc5`, `63290d7`, `3cbf3a9`, `0bfb7fd` — update the queue rows to reflect that WM-CHART-P0-05 four surface badges are shipped and P0-06 is shipped.
3. **Detect ownerless tickets** and route them using the table in `TEAM_CHARTERS.md`. Do not leave ownerless > 2 hours.
4. **Detect duplicate work.** The "fix lounge waveform" thread should be checked against `wip/lounge-universal-hero-recovered` — someone was already 227 lines into a Universal Lounge Hero and abandoned it. If the new thread doesn't know about the WIP, route them to that branch instead of starting over.
5. **End-of-session command-board summary** to `DAILY_OPERATIONS_REPORT.md`.

**Handoff location:** `docs/operations/handoffs/nehemiah/2026-07-30-*.md`

## ATLAS — Knowledge & Drive

**FIRST ACTIONS:**
1. **Same-day Drive publishing** of this session's closures: `WM-CHART-P0-05` (4-surface badge fix, closure handoff at `docs/operations/handoffs/forge/2026-07-30-forge-wm-chart-p0-05-closure.md`) and `WM-CHART-P0-06` (symbol-identity gate on WS tick-folding, commit `3cbf3a9`).
2. **Update the WM Pro FULL-THREAD IMPLEMENTATION AUDIT** (Drive doc `1g49GSBy5d5_4gaaOK0jN1zJGZIAM_kEvRXGh9L26OEM`) to reflect that A5 (four-price discrepancy) has moved from IN-FLIGHT to SHIPPED-AT-SURFACE, with the shared-subscription refactor tracked as follow-on quality work (not a truthfulness gate anymore).
3. **Ticket-to-owner map** refresh, aligned with this section.
4. **Never index unverified claims as truth.** Label as `UNVERIFIED CLAIM` until Sentinel or observed behavior confirms.

**Handoff location:** `docs/operations/handoffs/atlas/2026-07-30-*.md`

## VIDEO INTELLIGENCE

**STATUS: RESEARCH-ONLY** until Sentinel opens the gate. No implementation tickets.

**Continued work:**
- Process oldest Founder-clicked video with transcript access; extract lessons in original words.
- Maintain the 5-app comparison matrix (Webull, moomoo, tastytrade, TradingView, DeepCharts) — new row per week.
- Preserve transcript failures honestly. Never invent transcript content. Never copy competitor UI/text/code.

## ELIAS — Founder-Level Arbitration

**Do not engage unless:** two employees genuinely disagree on scope/ownership blocking work, OR a `DECISIONS.md` decision conflicts with a new founder-signed directive, OR Nehemiah escalates a > 3-day stalled ticket. See `TEAM_CHARTERS.md` for the full engagement bar.

---

## Coordinator log (Atlas / this session)

| Time (CDT) | Actor | Action | Reference |
|---|---|---|---|
| 15:34 | main session | Shipped WM-CHART-P0-05 surface #1 (header) | `1bbf2ec` |
| 15:41 | main session | Shipped WM-CHART-P0-05 surface #2 (tape)   | `831e9ea` |
| 15:49 | main session | Shipped WM-CHART-P0-05 surface #3 (watchlist) | `a0b22e8` |
| 15:55 | main session | Shipped WM-CHART-P0-05 surface #4 (HUD)    | `a223fc5` |
| 15:59 | main session | Published P0-05 closure handoff            | `63290d7` |
| 16:02 | main session | Shipped WM-CHART-P0-06 (symbol-identity gate on WS tick fold) | `3cbf3a9` |
| 16:15 | main session | Team charters ratified as DEC-011           | `0bfb7fd` |
| 16:22 | main session | Preserved dangling lounge WIP on branch     | `wip/lounge-universal-hero-recovered` |
| 16:24 | main session | Routed Founder 15:06 CDT directive assignments into this queue | (this commit) |
| 20:06 | scheduled checkpoint | Nehemiah-default: flagged phantom `WM-CHART-P0-01B-PREREQ-SCANNER-A11Y-01` gate (Sentinel RETURN, uncommitted handoff) blocking Noah/Forge V5/VI; no code shipped — tree had active concurrent WIP not created by this run, left untouched | `54ac3be` |
| 2026-08-02 17:25 | scheduled checkpoint | Filed `WM-BROKER-QUOTE-P0-01` from Forge's WM-DATA-P0-01 audit; dispatched Noah (EMERGENCY fix contract), Sentinel (verify DRAW-P0-01+UX-P0-01), Micah (JRN-P1-02), VI (competitor matrix row) — all bus-file only, send_message unavailable in unattended run; retired 3 fulfilled dispatches; no `src/` touched | `efe4bec` (reconciled against) |

---

## WM-LOUNGE-P2-01 — Fix lounge waveform (routed from stray thread)

| Field | Value |
|---|---|
| **Ticket ID** | WM-LOUNGE-P2-01 |
| **Product** | WM Pro (Lounge surface) |
| **Priority** | **P2** by default. Escalate ONLY if Sentinel confirms a broken user-facing rendering — otherwise it stays P2 behind the P0 gate. |
| **Owner (design)** | **Micah** — waveform is a presentation concern (audio-visualization in Radio/Podcast/Listen mode) inside the Lounge social surface. Micah owns the visual language + acceptance criteria. |
| **Owner (implementation)** | **Noah**, after Micah's spec — held with the rest of Noah's queue until the WM-CHART-P0-01B-PREREQ-SCANNER-A11Y-01 gate opens. |
| **Verifier** | Sentinel (visual + interaction across 360×800, 390×844, 834×1194, desktop). |
| **Status** | **BACKLOG — SCOPE CHECK REQUIRED**. |
| **Trigger** | A separate Claude thread titled "fix lounge waveform" was created without an assignment. Founder flagged 2026-07-30: work is fragmenting across threads instead of routing through the bus. |
| **Objective** | Fix the specific waveform rendering defect in `src/app/lounge/page.tsx`. Scope this to the bounded waveform component ONLY. |
| **Related preserved WIP** | `wip/lounge-universal-hero-recovered` — a 227-line unowned `UniversalLoungeHero` (Discover / Live / Watch / Listen / Rooms) was found abandoned in the working tree and preserved on that branch. **That is NOT this ticket.** Do not conflate a bounded waveform fix with a broader lounge redesign. If the "fix lounge waveform" thread is actually attempting the full redesign, escalate to Nehemiah — the current Founder directive explicitly says "no broad redesign" until the P0 gate opens. |
| **Scope check** | Nehemiah confirms with the Founder whether "fix lounge waveform" = (a) bounded waveform-rendering bug (proceed at P2), or (b) full lounge redesign (parked, needs Founder scope decision — currently violates the "no broad redesign" clause of the 2026-07-30 15:06 directive). |
| **Acceptance criteria (if bounded)** | 1. Waveform renders correctly at all four required viewports. 2. Empty/loading/error/no-audio state each has a design. 3. No new dependency added without Forge review. 4. No calculation invention — if the visualization needs frequency data the audio source can't provide, show an honest fallback, don't fabricate a waveform. |
| **Never in scope** | Any of the parked habit-loop features. Any audio-metadata claim (BPM, key, energy) that the source doesn't provide. Any lounge navigation/hero restructure — that is `wip/lounge-universal-hero-recovered`. |
| **Next action** | **Nehemiah:** run the scope check with the Founder in one message (bounded fix vs redesign). **Micah:** on the assumption of "bounded," draft the waveform design spec + acceptance criteria; hand to Noah. **Noah:** stays held. |
| **Filed by** | Atlas / main session, 2026-07-30 16:26 CDT, per Founder routing instruction. |

---

## RETRACTED: WM-CHART-P0-01B-PREREQ-SCANNER-A11Y-01 (phantom gate)

| Field | Value |
|---|---|
| **Status** | **RETRACTED 2026-07-30 by Atlas / Mission Control**, accepting Sentinel V-008 RETURN (`docs/operations/handoffs/sentinel/2026-07-30-sentinel-scanner-a11y-gate-verdict.md`). |
| **Reason** | The 15:06 CDT Founder directive named this ID as Sentinel's only first action. It was routed into the queue as if it were an existing ticket. It was not. No body, no acceptance criteria, no commit ever existed for it. Treating a phantom as a hard gate was itself the coordination failure the Founder flagged. Sentinel refused to fabricate an APPROVED and issued a precise RETURN. |
| **What it was probably referring to** | Scanner `/scanner` page accessibility (`src/app/scanner/page.tsx:440-443` region referenced in another thread's dispatch). Real scope belongs to Micah (a11y lane per DEC-011). |
| **Consequence** | The gate does NOT block Noah. Noah's real blockers are RISK-001 (runtime verification) and the standing Option-A hold — not this ID. **Noah is unblocked for the next queue-ordered ticket he owns.** |
| **Follow-on** | Micah authors a real `WM-A11Y-SCANNER-01` ticket if scanner a11y is actually needed (scope, tap targets ≥44px, keyboard focus, ARIA on the interactive elements, breakpoints 360×800 / 390×844 / 834×1194). Not gating anything until it exists. |

---

## WM-CHART-P0-05b — Custom Big Trades quantity UI

| Field | Value |
|---|---|
| **Ticket ID** | WM-CHART-P0-05b |
| **Product** | WM Pro |
| **Priority** | P0 (per 15:06 Founder directive Phase 1 item 4) |
| **Owner (design)** | Micah — the UI affordance (input control shape, placement, label) inside the Big Trades gear menu. |
| **Owner (implementation)** | Noah — wire the input to the already-existing `wm_bubble_max` localStorage slot. |
| **Verifier** | Sentinel. |
| **Objective** | Expose a **Custom quantity** input in Big Trades settings alongside the existing All / 200 / 150 presets. The storage layer already exists — this is only a UI ticket. |
| **Verified evidence source** | Full-thread audit C2 (Drive doc `1g49GSBy5d5_4gaaOK0jN1zJGZIAM_kEvRXGh9L26OEM`) — "Storage layer (wm_bubble_max in localStorage) exists at `FootprintControls.tsx:94-111` and is read at `MainChart.tsx:848-850`. UI does NOT expose Custom input. Trivial add." |
| **Files / subsystems** | `src/components/chart/FootprintControls.tsx` (add input, hand-off value via existing `wm_bubble_max` key); nothing else. |
| **Acceptance criteria** | 1. Custom input appears alongside All / 200 / 150 buttons in the Big Trades gear menu. 2. Integer-only, min 1, max 5000. 3. Value persists to `wm_bubble_max`. 4. `MainChart.tsx:848-850` continues to read the value with no change. 5. Empty / non-numeric / out-of-range states each render honestly (do not silently clamp to a preset). 6. Screenshots at 360×800, 390×844, 834×1194, desktop. |
| **Never in scope** | Any change to how bubbles are rendered / collision-avoided (that is a separate ticket routed to Noah after Micah's water-style spec). Any change to storage schema. |
| **Blockers** | None. Bounded add, storage layer already exists. |
| **Next action** | **Micah:** draft the input control spec + acceptance criteria (est. 1 handoff doc). **Noah:** implement against the spec (est. one file, one commit). |
| **Filed by** | Atlas / main session, 2026-07-30 20:10 CDT, per Founder Phase 1. |
| **STATUS: CLOSED** | Shipped `9f76b15`, Micah verdict **KEEP AS-IS** (`handoffs/micah/2026-07-31-micah-dec012-backfill-verdicts.md` Surface 2) — honest reject (no silent clamp), `role="alert"`, `inputMode="numeric"`, range hint. One bounded non-blocking follow-up: label/`SET` button below 44px floor — folded into the general a11y sizing sweep, not a reopen. Reconciled by Atlas checkpoint, 2026-07-31 23:19 CDT. |

---

## WM-BRAND-W-TRIGGER-01 — Restore branded W trigger on Smart Money chart button

| Field | Value |
|---|---|
| **Ticket ID** | WM-BRAND-W-TRIGGER-01 |
| **Product** | WM Pro |
| **Priority** | P1 |
| **Owner (design)** | Micah — brand identity + trigger consistency between the button and the panel interior. |
| **Owner (implementation)** | Noah. |
| **Verifier** | Sentinel. |
| **Objective** | The Smart Money chart-trigger button currently reads plain text. The panel interior already has W branding. This inconsistency is called out in Founder audit C3. Restore the branded W. |
| **Evidence source** | Full-thread audit C3 — "'Smart Money' chart-trigger button lacks W branding … Panel interior has W branding, trigger reads plain text." |
| **Files / subsystems** | `src/components/chart/ChartsDashboard.tsx` or wherever the chart-trigger button is currently rendered — verify with grep first, never edit dead code. |
| **Acceptance criteria** | 1. The trigger uses the same W wordmark treatment as the panel interior. 2. Contrast passes WCAG AA. 3. Tap target ≥44×44. 4. Keyboard focus state visible. 5. Screenshots at 360×800, 390×844, 834×1194, desktop. |
| **Never in scope** | Renaming "Smart Money." Panel-interior changes. Adding new trigger behavior. |
| **Blockers** | None. |
| **Next action** | **Micah:** design spec (1 handoff). **Noah:** implement (1 commit). |
| **Filed by** | Atlas / main session, 2026-07-30 20:10 CDT, per Founder Phase 1 item 4. |
| **STATUS: CLOSED** | Shipped `bda48c9`, Micah verdict **KEEP AS-IS** (`handoffs/micah/2026-07-31-micah-dec012-backfill-verdicts.md` Surface 3) — W wordmark + glow-on-open, `aria-label`/`aria-pressed`, ~44px touch + WCAG AA/AAA contrast confirmed on desktop. Phone-width (360/390) touch-target pixel confirmation still deferred to the RISK-001 display-clamp unblock; reopens as a 1-line sizing ITERATE only if that measurement fails. Reconciled by Atlas checkpoint, 2026-07-31 23:19 CDT. |

---

## WM-STATE-P0-02 — Wire Markov engine into runtime (zero importers)

| Field | Value |
|---|---|
| **Ticket ID** | WM-STATE-P0-02 |
| **Product** | WM Pro |
| **Priority** | P0 — truthfulness / dead-code shipping pattern. |
| **Owner** | Forge (architecture: which surfaces should consume Markov and via which contract) → Noah (implementation). |
| **Verifier** | Sentinel. |
| **Objective** | The deterministic Markov core (`src/lib/markov.ts`, `e0a5ed7`) is shipped, tested (292 lines of tests), architecture-documented (253 lines), and correct — **but has zero importers**. It is inert at runtime. The heatmap still runs the old scalar path. This is the same class as the silent-downgrade guard (`assertGranularity` / `resolveFetchPlan` / `aggregateCandles`) also with zero importers. Ship at least one honest consumer or explicitly retire. |
| **Evidence source** | Forge Markov audit (context from Forge thread): "The engine is wired into chartContext — but the heatmap still runs the old scalar path… Definitive: zero importers. Recording — this is now a pattern, not an isolated case." |
| **Acceptance criteria** | 1. At least one production surface imports and displays a Markov-derived state, gated by the honesty threshold (100 total / 30 per row → `insufficient-evidence`). 2. Where insufficient evidence exists, surface shows the honest state, not a substituted value. 3. Golden test remains green. 4. `grep -rln "from \"@/lib/markov\"" src/` returns at least 2 files (the runtime consumer + its test). |
| **Never in scope** | Changing the Markov algorithm. Any Wyckoff work (DEC-009). Silently substituting Markov output when evidence is insufficient. |
| **Blockers** | Forge decision: which surface goes first — the regime badge in the Confluence panel, or the heatmap regime overlay? Recommend Confluence panel first (higher-value, single-symbol path). |
| **Next action** | **Forge:** pick surface + wire contract, publish handoff. **Noah:** implement per contract. |
| **Filed by** | Atlas / main session, 2026-07-30 20:11 CDT, in response to Forge audit finding. |

---

## Coordinator log — 2026-07-30 evening

| Time (CDT) | Actor | Action | Reference |
|---|---|---|---|
| ~19:00 | Atlas (other thread) | Cycle 2 audit published to Drive `18sm4YuU9WNbanwjGBvx0yNlptAtIB5ZE6ae79ptjFzs` — 9 commits verified, V-008 recorded, RISK-012→013 renumbered CLOSED | Drive |
| ~19:18 | Sentinel (other thread) | V-008 bounded verify request — could NOT visually confirm P0-05 badges at typical zoom; flagged case-2 dead-fix pattern | (cross-thread channel) |
| ~19:36 | Atlas (other thread) | Cycle 3 scheduled | (scheduled task) |
| ~19:40 | Video Intelligence | Appendix D — transcript CLOSED (yt-dlp, 944 cues), phone-app cross-check complete | `cddaf74` |
| ~20:07 | main session | **P0-05 badge visibility fix** — addresses V-008 finding directly, bumps all 4 surfaces to readable size + LIVE/DELAYED text + green glow | `fd12f1e` |
| ~20:12 | main session | **RETRACTED phantom `WM-CHART-P0-01B-PREREQ-SCANNER-A11Y-01`** per Sentinel RETURN; Noah unblocked; real Micah `WM-A11Y-SCANNER-01` filed as follow-on | (this commit) |
| ~20:12 | main session | Filed **WM-CHART-P0-05b** (Custom Big Trades qty UI), **WM-BRAND-W-TRIGGER-01**, **WM-STATE-P0-02** (Markov zero-importer wiring) | (this commit) |
| ~20:50 | main session | Shipped WM-CHART-P0-01A canonical timeframe contract + provider capability matrix (arch/evidence only) | `44fd7b6` |
| ~21:06 | main session | Shipped dispatch system + 4 addressed dispatches (Noah/Forge/Micah/Video-Intel) | `eec9f3b` |
| 21:13 | scheduled checkpoint | Nehemiah-default: tree has **live** concurrent WIP (Noah editing `FootprintControls.tsx`/`bubbleQty.ts` for WM-CHART-P0-05b, edits <2 min old at check time; Sentinel/Forge WIP in `VERIFICATION_QUEUE.md`/Markov arch doc ~2h old) — no code shipped, nothing touched, no collision risk introduced. Queue already current as of `eec9f3b`; no reconciliation gap found. | (no commit) |

## Current critical path (Nehemiah snapshot)

1. **Sentinel** (highest priority): re-verify P0-05 badges on the fresh prod deploy of `fd12f1e`. Visible? APPROVE. Still invisible? RETURN with pixel measurements. Also close the phantom-gate loop by acknowledging the retraction.
2. **Noah** (unblocked): pull; claim `WM-CHART-P0-05b` (bounded, storage already exists — 1 file, 1 commit) OR `WM-CHART-P0-03` (next in the 15:06 directive). Serialize with any scanner work per V-008's serialization note.
3. **Forge**: pick the first Markov consumer (recommend Confluence panel), publish contract for `WM-STATE-P0-02`.
4. **Micah**: draft `WM-CHART-P0-05b` input spec (est. 1 handoff) + Water-style Big Trade marker spec + Branded W trigger spec.
5. **Nehemiah**: reconcile this queue against `git log --oneline origin/main`; publish command-board summary; verify Noah pulls before starting so he sees these tickets.

---

## VI DeepCharts gap tickets — filed 2026-07-31 (Video Intelligence)

Source: `handoffs/video-intelligence/2026-07-31-vi-deepcharts-gap-matrix.md` (base `50dc7cb`).
VI surfaces the gap and names the lane only — **Forge decides implementation** (DEC-008). Founder rule §5:
no fabricated capability. All rows BACKLOG until a lane owner claims.

| Ticket ID | Priority | Lane | Status | Objective | Never in scope |
|---|---|---|---|---|---|
| **WM-VP-WORLDS-DEF-01** | P0 (Founder ask) | VI research → Forge spec | **BLOCKED — awaiting Founder source pointer** | Deep-crawl DONE 2026-07-31 (`handoffs/video-intelligence/2026-07-31-vi-vp-worlds-evidence.md`): **"VP Worlds"/"VP Wars" are not DeepCharts feature names** — absent from help center, features page, dxFeed, VP literature, and `src/`. Nearest real analogs = Composite/Multiple profiles + Merge/Split (hypotheses only). Needs the Founder to point to the source (video timestamp / screenshot / platform) before Forge can spec. | Guessing/architecting the feature before it is defined. Copying DeepCharts UI/wording. Shipping anything named VP Worlds with invented behavior. |
| **WM-CHART-BUBBLE-DENSITY-01** | P1 | Forge arch → Noah | BACKLOG | Bubble density/legibility toolkit: same-order fragment aggregation, tick grouping, dynamic text size, "K" format, min/max + vol-cluster filters, color-dominant-side. Closes the documented pileup defect. Fragment-merge rule already worked out in `COMPETITOR_STUDY_DEEPCHARTS_2026-07-29.md` §2. | Iceberg/absorption reassembly (MBO-gated). Merging *distinct* orders (fabrication). |
| **WM-RISK-MGR-01** | P1 | Forge (design exists) → Noah | BACKLOG | Implement the Risk Manager per Forge draft `docs/WM_RISK_MANAGER_ARCHITECTURE_2026-07-30.md` as an **advisory overlay** (daily loss/profit + per-trade + portfolio caps as suggestions/alerts). | Auto-flatten / order execution — brokerage write access is a Founder/compliance decision, live accounts are read-only. |
| **WM-REGIME-HURST-01** | P2 | Forge assess → Noah | BACKLOG | Add a Hurst-exponent regime detector (absent from `src/`). Forge first assesses value vs the existing Markov engine before any build. | Wyckoff work (DEC-009). Substituting a value when the series is too short — return insufficient-evidence. |
| **WM-CHART-FIXEDVP-01** | P2 | Forge decide | BACKLOG | Decide whether the existing manual "Delta + VP Box" (`deltaVP.ts`) satisfies fixed-range VP, or a persistent/anchored fixed-VP object is required. | — |
| **WM-CHART-AGGPASS-AUDIT-01** | P1 (truthfulness) | Forge / Sentinel | BACKLOG | Audit the "passive" side of Aggressive-vs-Passive footprint (`FootprintControls.tsx:476-488`): confirm resting-limit volume is really captured, or relabel — true passive volume is MBO-adjacent. | Shipping inferred passive volume as if it were observed. |
| **WM-CHART-DELTADIV-01** | P3 | Micah / Noah | BACKLOG | Optionally promote Delta Divergence from a panel signal (`SmartMoneyPanel.tsx:116-118`) to an on-chart overlay marker, if the Founder wants it on-chart. | — |
| **VI-WM-P0-03** | P0 | Video Intelligence | **OPEN — intake file live, awaiting Founder list** | Intake target `docs/operations/video-queue.md` **created 2026-07-31** (yt-dlp `python3 -m yt_dlp` ready; `Pz8f0wWW12M` already processed + recorded). Founder drops Fabio/order-flow links there → VI processes oldest first, timestamped, honesty note on any failed pull. His click history is not accessible to VI, so no specific video can be queued until a link is dropped. | Inventing transcript content for a failed pull. Fabricating a video list. |

Referenced, not duplicated: **WM-STATE-P0-02** (Markov zero-importer wiring), **WM-CHART-P0-05b** (custom bubble qty).

---

## Coordinator log — 2026-07-31 market-open (Forge)

| Time (CDT) | Actor | Action | Reference |
|---|---|---|---|
| ~09:35 | Forge (this session) | Architected 3 Founder-flagged root causes; published handoffs + Noah dispatch. **Forge does not ship (DEC-008/DEC-012).** | (this commit) |

New tickets filed (contracts ready for Noah):

| Ticket | P | Owner | Status | Root cause (one line) | Contract |
|---|---|---|---|---|---|
| **WM-VP-P0-01** | P0 | **Forge** (root cause) → Noah | **REOPENED — RETURN** (shipped `e06ade9`, F-A/F-B/F-C closed; but Sentinel's own APPROVE (`499e504`) was superseded same night — POC volume readout = `0.00` on crypto, confirmed live on BTC 15m vs. correct TSLA control `12.7k`). Awaiting Forge's crypto-volume-aggregation root cause. | `handoffs/sentinel/2026-08-02-sentinel-wm-vp-p0-01-reopen-poc-zero.md`, dispatch `dispatches/2026-08-02/0010-sentinel-to-forge-vp-crypto-volume-zero.md` |
| **WM-OF-P0-05** | P0 | Noah | CONTRACT READY | All 6 tools mount; the 5 profile tools are honest (real tape only) but **live-capture-only + silently render empty** on tapeless bars (truth §5 gap). Needs honest `unavailable`/`capturing` state; VP → real total volume w/ "no split" label. | `handoffs/forge/2026-07-31-forge-wm-of-p0-05-toolset-audit.md` |
| **WM-BROKER-P0-01-A** | P0 | Noah | CONTRACT READY | `supportedAssetClasses` hardcodes `"future"` (`tastytrade.ts:172`) while `isFuturesApproved` computed-but-unused; no futures instrument/streamer-symbol path exists. Derive capability + wire futures product path. | `handoffs/forge/2026-07-31-forge-wm-broker-p0-01-tastytrade-futures.md` |

Founder decision (not for Noah): **broker expansion shortlist** — Tradier→IBKR→Schwab need scope approval + verification spike; Webull/Robinhood rejected (no official retail API). `handoffs/forge/2026-07-31-forge-broker-expansion-matrix.md`

---

## WM-SEC-VIOLATION-01 — DEC-005 breach: order-placement code shipped to tastytrade

| Field | Value |
|---|---|
| **Ticket ID** | WM-SEC-VIOLATION-01 |
| **Priority** | P0 — standing-rule breach, real-money brokerage. |
| **Found by** | Atlas checkpoint, 2026-07-31 23:19 CDT, reconciling queue vs `git log`. |
| **What shipped** | `aa68aa0` — `placeTastytradeOrder`, `cancelTastytradeOrder`, `getTastytradeOrders`, route `/api/broker/tastytrade/orders` (GET/POST/DELETE). Live path gated behind `TASTYTRADE_ALLOW_LIVE_ORDERS` + `confirm_live:true`; dry-run is default. No handoff exists; not the contracted scope of `WM-BROKER-P0-01-A` (futures asset-class wiring only). |
| **Conflicts with** | `DEC-005` (Sentinel, 2026-07-28, standing/indefinite — tastytrade is read-only, no order tickets, no trade controls). `EMPLOYEE_STATUS.md` standing prohibition (all employees). Forge's own contract to Noah — "Read-only for tastytrade — no order placement in this ticket." |
| **Owner** | Sentinel — rules whether this is a RETURN (revert live/order paths) or DEC-005 needs a formal amendment. Atlas does not rule on standing decisions it didn't make. |
| **Never in scope for this ticket** | Atlas/Mission Control editing `src/` to self-revert — routes through Sentinel → Noah (or Forge) same as any other verification return. |
| **Dispatch** | `docs/operations/dispatches/2026-07-31/2325-sentinel-dec005-violation-tastytrade-order-lifecycle.md` |
| **Verdict** | **RETURN** (Sentinel, 2026-07-31 10:05 CDT) — confirmed DEC-005 violation. `handoffs/sentinel/2026-07-31-sentinel-dec005-tastytrade-order-verdict.md`. Revert routed to Noah: `dispatches/2026-07-31/1005-sentinel-to-noah-revert-tastytrade-order-lifecycle.md`. |
| **Status** | RETURN → Noah reverts write/order surface; Sentinel re-verifies. NO-GO on this surface until then. |

---

## Coordinator log — 2026-07-31 23:19 CDT checkpoint (Atlas)

| Time (CDT) | Actor | Action | Reference |
|---|---|---|---|
| 23:19 | Atlas (scheduled checkpoint) | Sync + audit: HEAD `32f2268`, tree clean. Found unflagged **DEC-005 violation** (`aa68aa0` tastytrade order-lifecycle code, outside contracted futures-only scope). Filed `WM-SEC-VIOLATION-01`, dispatched Sentinel for verdict. | `2325-sentinel-dec005-violation-tastytrade-order-lifecycle.md` |
| 23:19 | Atlas | Re-dispatched + pinged Forge — `WM-STATE-P0-02` (Markov consumer) open >24h, thread dormant ~14.7h. | `2325-forge-wm-state-p0-02-markov-still-open.md` |
| 23:19 | Atlas | Closed 2 stale queue entries already shipped + KEEP-AS-IS per Micah's backfill verdicts: `WM-BRAND-W-TRIGGER-01` (`bda48c9`), `WM-CHART-P0-05b` (`9f76b15`). | (this commit) |
| 23:19 | Atlas | Retired 5 fulfilled dispatches (Forge root-cause, Micah 3-specs, Nehemiah go-live gate, VI gap matrix, Noah warmup). | `dispatches/2026-07-31/retired/` |
| 23:19 | Atlas | Sentinel, Noah, Nehemiah confirmed active (session activity <1 min old) — no ping needed, skip per rule. Micah/VI: no new ready ticket owned right now — skip. | — |

---

## Coordinator log — 2026-08-01 23:44 CDT checkpoint (Atlas)

**HEAD:** `1e13877` · tree clean except 3 pre-existing untracked handoffs (committed this checkpoint) and 1 new one this session.

| Time (CDT) | Actor | Action | Reference |
|---|---|---|---|
| 23:44 | Atlas | **Critical path moved:** Noah shipped `WM-VP-P0-01` (`e06ade9`) — Session VP is now a pure projection of the chart's canonical candles, closing F-A/F-B/F-C. Noah self-dispatched Sentinel for live-verify (`dispatches/2026-08-01/2350-noah-to-sentinel-vp-live-verify.md`) and moved to his next queued ticket (`WM-DRAW-P0-01`) within the same commit window. | `e06ade9`, `1e13877` |
| 23:44 | Atlas | Ratified **DEC-013** (assembly-line handoff discipline) into `DECISIONS.md`, per the Founder quote captured in the prior Atlas thread's uncommitted handoff. Scoped it as per-surface serialization (not a full-team freeze) since Noah+Sentinel were already correctly running the Noah→Sentinel handoff concurrently at ratification time. | `DECISIONS.md` DEC-013 |
| 23:44 | Atlas | Committed 3 handoffs that were sitting untracked in the working tree (Forge's WM-VP-P0-01 contract, Nehemiah's 1400 command board, prior Atlas's corrective-reconciliation checkpoint) — none belonged to this thread to author, all belonged to `docs/operations/**` so safe to commit as-is. | (this commit) |
| 23:44 | Atlas | **Observation, not a ruling:** ~14 dispatch files present under `docs/operations/dispatches/2026-08-01/` earlier this session (0855 through 2345, read and summarized above/in prior sweeps) are no longer on disk and were never `git`-tracked — so their removal left no trace in history. Their substance is preserved in this queue and in the referenced handoffs; nothing appears to be lost, but untracked dispatch files have no durability across concurrent sessions on a shared working tree. Recommend committing a dispatch in the same commit as the work it announces (as Noah's `1e13877` just did) rather than leaving it untracked. | — |
| 23:44 | Atlas | Per DEC-013 (per-surface, not full-team freeze) + list_sessions: Sentinel and Noah both show live activity within the last minute — correctly running the current baton. Forge/Micah/Nehemiah/Video Intelligence all show ~5.3h dormant threads, but none holds a ticket that's next in the assembly-line order right now (Sentinel verify is in progress) — **no dispatch or send_message ping fired this checkpoint**, to avoid contradicting the serialization just ratified. | — |

---

## Coordinator log — 2026-07-31 10:35 CDT sweep (Nehemiah)

**HEAD:** `da1d8eb` · **Charter:** DEC-011 §Default-when-idle §1 (30-min sweep) · **Trigger:** Atlas dispatch "Friday overnight ship list" + market-open Founder-live conditions.

| Time (CDT) | Actor | Action | Reference |
|---|---|---|---|
| 10:35 | Nehemiah | Published overnight ship list (7 landings + Session-VP dispute + SEC blockers + housekeeping) so Founder can read the state in one glance. | `dispatches/2026-07-31/1035-nehemiah-friday-overnight-ship-list.md` |
| 10:35 | Nehemiah | Retired 2 satisfied Sentinel dispatches (order-revert + DEC-005 escalation) — both closed by `627be87` + Noah handoff. | `dispatches/2026-07-31/retired/{1005-…,2325-sentinel-dec005-…}.md` |
| 10:35 | Nehemiah | Filed **WM-CHART-P0-07** (Big Trades bubble collision, Founder-flagged morning defect #6) — Micah spec → Noah impl. See row below. | (this commit) |
| 10:35 | Nehemiah | Filed **WM-CHART-P0-05c** (water-style markers, from `da1d8eb` Micah spec) — Noah impl. See row below. | `handoffs/micah/2026-07-31-micah-wm-chart-p0-05c-water-markers.md` (referenced by `da1d8eb`) |
| 10:35 | Nehemiah | RISK-012→013 renumber: register already reconciled at `RISKS_AND_BLOCKERS.md:263–268` (append-only, both entries distinct); **no edit**. However, a NEW duplicate — two `RISK-011` entries (lines 327 Wyckoff CLOSED + 382 silent-provider OPEN) — routed to Sentinel (register owner). | `handoffs/nehemiah/2026-07-31-nehemiah-risk-011-duplication-flag.md` |
| 10:35 | Nehemiah | "44% DONE / 27 items" figure: Sentinel already applied RISK-007 discipline at `VERIFICATION_QUEUE.md:131` ("flagged rather than repeated"). Nothing to restate. Any Atlas Drive artifact still carrying it must re-derive per RISK-007 mitigation. | — |
| 10:35 | Nehemiah | Founder blockers WM-SEC-P0-01 (JWT_SECRET) + WM-SEC-P0-02 (RLS) — routed **only via Atlas**, per DEC-011. Nehemiah does not surface. | `dispatches/2026-07-31/0955-…`, `0956-…` |

### New tickets filed this sweep

| Ticket | P | Owner | Status | Objective | Never in scope |
|---|---|---|---|---|---|
| **WM-CHART-P0-07** | P0 (Founder morning defect) | Micah spec → Noah impl | BACKLOG | Big Trades bubbles collide / stack illegibly on dense tape. Micah authors a placement-collision spec (nudge / lane / density-scaled alpha, per WOW responsive standard); Noah implements against the spec. Adjacent to **WM-CHART-BUBBLE-DENSITY-01** (P1) — this ticket is the collision axis, that one is the density-and-legibility toolkit. | Redesigning the bubble semantics (that's `-DENSITY-01`). Fabricating merged orders. Server-side aggregation (client render layer only). |
| **WM-CHART-P0-05c** | P0 | Noah | CONTRACT READY (Micah spec dispatched at `da1d8eb`) | Water-style markers for Big Trades — implement per Micah's spec bundled in `da1d8eb`. Includes W-trigger 32px height correction (WM-BRAND-W-TRIGGER-01 refinement). | Retouching Delta Bubbles migration surface (WM-UX-P0-01 territory). Any bubble-collision work (that's the new WM-CHART-P0-07). |

**Critical path unchanged:** WM-VP-P0-01 (Noah, awaiting Sentinel clear of WM-UX-P0-01 + WM-SEC-VIOLATION-01 revert).

---
---

# BIBLE-DERIVED BACKLOG — filed 2026-08-02 (Atlas gap map)

**Source:** `docs/operations/handoffs/atlas/2026-08-02-atlas-bible-vision-vs-current-state.md`
**Trigger:** Founder ruling *"stop declaring done, so much more to build"*. Bible §51 Markov Pro DLA + §35 Alerts + §36 Risk + §32 Broker + §37 Perf + §"Journal" + §"Replay" + §"VP Worlds" + §29 Passport all lacked queue rows.

**Rule:** parallel work on independent tickets is authorized. Assembly-line only when files collide. Every ticket below has a Bible section anchor — if scope drifts, cite the section number in the RETURN.

## Markov Pro DLA integration (Bible §51 — CONFIRMED FOUNDER)
| Ticket | Priority | Owner chain | Files/scope |
|---|---|---|---|
| WM-DLA-P1-01 | P1 | Forge→Noah→Sentinel | Strategy Event JSON schema; TV→WM Pro payload; new `src/lib/strategyEvent.ts` |
| WM-DLA-P1-02 | P1 | Micah→Noah→Sentinel | DLA Morning Game Plan card (scenarios/conditions/invalidation/uncertainty/alternatives; NEVER framed as instruction) |
| WM-DLA-P1-03 | P1 | Micah→Noah→Sentinel | Guided pre-trade checklist (no-pressure copy) |
| WM-DLA-P1-04 | P1 | Forge→Noah→Sentinel | Prop Guardian panel (user rules, no auto orders) |
| WM-DLA-P1-05 | P1 | Forge→Noah→Sentinel | Advanced R Manager (current/protected/trail/runner) |
| WM-DLA-P1-06 | P1 | Forge→Noah→Sentinel | Stop Integrity monitor (planned vs actual, warn on widen) |
| WM-DLA-P1-07 | P1 | Forge→Noah→Sentinel | Setup Expiration engine |
| WM-DLA-P1-08 | P1 | Forge→Noah→Sentinel | Opportunity-Cost warning (< 4-5R clean room) |
| WM-DLA-P1-09 | P2 | Forge→Noah→Sentinel | Personal Edge Report (setup/session/confluence/mgmt) |
| WM-DLA-P1-10 | P1 | Forge→Sentinel | Shared formula/version registry (TV + WM Pro rule-set identifier) |

## Order Flow workspace (Bible §"Order Flow")
| Ticket | Priority | Owner chain | Files/scope |
|---|---|---|---|
| WM-OF-P0-06 | P0 | Forge→Micah→Noah→Sentinel | Order-flow master toggle UX: sub-tools inert while master OFF (or auto-enable) |
| WM-OF-P1-01 | P1 | Forge→Noah→Sentinel | Time-and-Sales panel (where feed available) |
| WM-OF-P1-02 | P1 | Forge→Noah→Sentinel | Auction labels (session-context tagging) |
| WM-OF-P1-03 | P1 | Forge→Noah→Sentinel | Inferred absorption (with honest-limitation label, NO MBO fabrication) |
| WM-OF-P1-04 | P1 | Forge→Noah→Sentinel | CVD chart + divergence markers |

## Risk Management (Bible §36 — "core, not premium decoration")
| Ticket | Priority | Owner chain | Files/scope |
|---|---|---|---|
| WM-RISK-P1-01 | P1 | Forge→Noah→Sentinel | Position-size calc (tick-value aware for futures) |
| WM-RISK-P1-02 | P1 | Forge→Noah→Sentinel | Max daily loss / max trade loss / open-risk total |
| WM-RISK-P1-03 | P1 | Forge→Noah→Sentinel | Portfolio concentration + correlated exposure |
| WM-RISK-P1-04 | P2 | Micah→Noah→Sentinel | Daily lockout + cooldown (no shaming copy) |
| WM-RISK-P1-05 | P1 | Forge→Noah→Sentinel | R-multiple tracking against verified fills |

## Journal (Bible §"Journal" — both automatic AND reflective)
| Ticket | Priority | Owner chain | Files/scope |
|---|---|---|---|
| WM-JRN-P1-01 | P1 | Forge→Noah→Sentinel | Auto-capture: symbol/entry/exit/size/fees/chart-state/session/tf/screenshots/data-quality |
| WM-JRN-P1-02 | P1 | Micah→Noah→Sentinel | Reflection fields UI: thesis/trigger/invalidation/risk/emotion/execution-grade/rule-adherence/lessons |
| WM-JRN-P1-03 | P1 | Forge→Noah→Sentinel | Process-quality metric surface (not just profit) |

## Replay (Bible §"Replay")
| Ticket | Priority | Owner chain | Files/scope |
|---|---|---|---|
| WM-REPLAY-P1-01 | P1 | Forge→Noah→Sentinel | Event recorder (raw trades + candle formation) + storage |
| WM-REPLAY-P1-02 | P1 | Micah→Noah→Sentinel | Playback UI + scrubber |
| WM-REPLAY-P1-03 | P2 | Micah→Forge→Noah→Sentinel | Coach + Challenge modes (after core replay) |

## Alerts (Bible §35)
| Ticket | Priority | Owner chain | Files/scope |
|---|---|---|---|
| WM-ALERT-P1-01 | P1 | Forge→Noah→Sentinel | Alert schema + evaluator (client-side vs server-side shown) |
| WM-ALERT-P1-02 | P1 | Forge→Noah→Sentinel | Alert types (18 per Bible §35) |
| WM-ALERT-P1-03 | P2 | Forge→Noah→Sentinel | Webhook out (Discord/Telegram) opt-in + idempotency + rate limits |

## Verified Performance (Bible §37)
| Ticket | Priority | Owner chain | Files/scope |
|---|---|---|---|
| WM-PERF-P1-01 | P1 | Forge→Noah→Sentinel | Category labels: broker-verified / paper-verified / self-reported / simulation / backtest / unverified (never mixed) |
| WM-PERF-P1-02 | P1 | Forge→Noah→Sentinel | Metrics surface (12 per Bible §37) |

## Broker adapters (Bible §32)
| Ticket | Priority | Owner chain | Files/scope |
|---|---|---|---|
| WM-BROKER-P1-01 | P1 | Forge→Noah→Sentinel | IBKR adapter (OAuth if available; futures + equities + options) |
| WM-BROKER-P1-02 | P2 | Forge→Noah→Sentinel | Tradier adapter |
| WM-BROKER-P1-03 | P2 | Forge scope→Founder decide | Schwab adapter — evaluation ticket |
| WM-BROKER-P1-04 | P0 | Forge→Noah→Sentinel | Order state machine (15 states incl. Unknown/Reconcile per Bible §32) |

## Passport / Auth (Bible §29)
| Ticket | Priority | Owner chain | Files/scope |
|---|---|---|---|
| WM-PASSPORT-P0-01 | P0 | Forge→Noah→Sentinel | Passport identity across WM Pro + ecosystem |
| WM-SEC-P0-01 (open) | P0 | Founder | JWT_SECRET set in Vercel prod (confirm-only, no paste) |
| WM-SEC-P0-02 (open) | P0 | Founder scope→Forge→Noah | Supabase RLS per-user policies (backup window required) |

## VP Worlds (Bible §"VP Worlds" — Founding Principle 6)
| Ticket | Priority | Owner chain | Files/scope |
|---|---|---|---|
| WM-VPW-P1-01 | P1 (BLOCKED) | Founder source→Forge→Micah→Noah→Sentinel | Define VP Worlds. VI already found no DeepCharts precedent — this is a WM original feature needing Founder spec. |

## Coordinator note

None of these override the current **REOPENED WM-VP-P0-01** (crypto POC=0.00) — that's still the top P0 blocker for Gate 1 truthfulness. Bible backlog fires in parallel where files don't collide.


---

## WM-DATA-P0-01 — Live-quote regression (Founder-verified 2026-08-02 12:40 CDT)

| Field | Value |
|---|---|
| **Ticket ID** | WM-DATA-P0-01 |
| **Priority** | **P0 EMERGENCY** — Founder-visible, blocks Gate 1 (Data truth) and effectively Gate 2 (Chart stability) |
| **Owner (arch)** | Forge — dispatched at `dispatches/2026-08-02/1240-forge-wm-data-p0-01-quote-pipeline-audit.md` |
| **Owner (impl)** | Noah — after Forge's fix contract |
| **Verifier** | Sentinel — live-verify on futures during Sunday-open (17:00 CT Sunday+) AND weekday RTH |
| **Trigger** | Founder message 12:40 CDT Sun Aug 2: *"the market is live now and i see it moving on trading view but not my app why dont i see futures and whatever else is actually moving moving right now we have tasty trade connected and also finhub"* |
| **Live evidence (Atlas Chrome capture, same minute)** | 1. Every top-rail ticker (ES1/RTY1/YM1/GC1/CL1/AAPL/TSLA/NVDA/SPY) reads `+0.00 +0.00%`. 2. NQ1! chart header pill `YAHOO · DELAYED`; banner *"Real order-flow tape unavailable"*; `Market Closed` footer. 3. SPY chart shows `● ALPACA · LIVE` AND `FINNHUB · DELAYED` on the same surface — provenance contradiction (P0-05 defect class recurring). 4. No tastytrade badge / quote wiring in UI despite Founder saying tt is connected. |
| **Sub-defects the fix must close** | (a) whole ticker rail frozen → live-refresh path broken across providers, (b) futures show as delayed with no live tape even when Sunday-electronic session is open, (c) SPY same-surface provider contradiction — P0-05 truthfulness regression, (d) tastytrade provider not in the quote fallback chain despite connection. |
| **Hypothesis (Forge validates)** | An `isMarketClosed` gate suppresses ALL streaming updates Sat-Sun without distinguishing futures (24/6 electronic) from equities (Mon-Fri RTH). Provenance resolver has forked (per-surface resolvers producing inconsistent badges). Tastytrade adapter serves orders but not quotes. |
| **Acceptance for Noah's fix** | 1. When TradingView shows futures moving, WM Pro shows the same movement within 5s tick lag. 2. Single `isMarketOpen(assetClass, ts)` function with per-class hours. 3. Every same-surface, same-symbol, same-instant price + provenance readout agrees byte-identically across all UI locations. 4. Tastytrade wired as a quote provider OR explicitly labeled "orders only" in Connect Broker UI so users aren't misled. 5. Per-class provider matrix documented in the fix commit body. |
| **Sentinel verification requirements** | Live verify at Sunday-electronic open (17:00 CT Sun), Monday RTH open (08:30 CT Mon for /ES), and Monday equity open (09:30 ET). All ticker-rail symbols advancing != 0.00. All chart-header + tape + watchlist + HUD badges agree on provenance for the same symbol. |
| **Blockers** | Founder to confirm which broker(s) are connected and whether tastytrade streaming quotes are entitled on his tt subscription (2-min check, no credential paste). |
| **Filed by** | Atlas / main session, 2026-08-02 12:41 CDT. |

**2026-08-02 17:25 CDT update (Atlas checkpoint):** Forge shipped root-cause + fix contract —
`handoffs/forge/2026-08-02-forge-wm-data-p0-01-quote-pipeline-audit.md`. Root cause is a day-change
fallthrough (`useWebSocket.ts:114-118`, `prev` falls to `price` → `change=0`), NOT the weekend gate.
Fix contract (single `isMarketOpen(assetClass,ts)`, honest day-change, single provenance resolver)
handed to Noah — dispatched `dispatches/2026-08-02/1725-noah-wm-data-p0-01-fix-contract.md`. Status: 🔴 Noah impl (was 🔴 Forge RC).

---

## WM-BROKER-QUOTE-P0-01 — Tastytrade dxFeed streaming quotes into provider chain (filed from WM-DATA-P0-01 audit)

| Field | Value |
|---|---|
| **Ticket ID** | WM-BROKER-QUOTE-P0-01 |
| **Priority** | P1 — named gap, not blocking WM-DATA-P0-01's own acceptance (which only requires tastytrade be labeled "orders only" if unwired) |
| **Owner chain** | Forge (contract) → Noah (impl) → Sentinel (verify) |
| **Finding** | `tastytrade.ts:202-206` probes `/api-quote-tokens` and confirms dxFeed quote capability (`quotes: true`) on the connected account, but no consumer reads it — `useWebSocket`/tape pipeline have zero tastytrade quote wiring. Adapter serves accounts + order lifecycle only. |
| **Why it matters** | Futures currently have **no WS path at all** (Yahoo REST only per the WM-DATA-P0-01 provider matrix) — tastytrade/dxFeed would be the first live futures quote stream available. |
| **Scope** | Wire tastytrade dxFeed as a real provider in the quote fallback chain, Founder-gated read-only. Do not claim liveness until a verified quote timestamp proves it (`tastytrade.ts:211` doctrine). No order-placement code — DEC-005 boundary stays. |
| **Filed by** | Atlas checkpoint, 2026-08-02 17:25 CDT, from Forge's `WM-DATA-P0-01` audit §5/§7. |

---

## NEHEMIAH 2026-08-03 10:40 CDT sweep — Doctrine ingestion + Bible §46 gate-gap tickets + §45 Founder-only placeholders

**HEAD:** `e768558` · **Dispatch:** `dispatches/2026-08-03/1040-nehemiah-market-open-sweep-doctrine-cross-product-gate-4.md`
Filing compact rows so the whole open decision surface is visible in one glance. **Nehemiah does not scope, size, or pre-decide these** — Founder-only rows are 1-line placeholders per §48 evidence discipline; ops-gate-gap rows have owners assigned but stay P0 backlog until spec authored.

### Doctrine + DLA validation tickets

| Ticket | P | Owner | Status | Objective | Never in scope |
|---|---|---|---|---|---|
| **WM-OPS-P1-01** | P1 | Nehemiah tracks; Forge/Micah author per-ticket at next update; Sentinel gates future verdicts against §7 conformance | BACKLOG | ATH Universal Product Doctrine §7 field-ingestion sweep: every OPEN ticket gains the 10 §7 fields (core problem, resilience+recovery, studio+DoD, KISS+progressive-disclosure, JKD, WOW, truth+evidence, a11y/privacy/safety/agency, failure+rollback+continuity, metrics). Additive-only; does not rewrite shipped work. | Retro-editing shipped commits. Blocking in-flight tickets on §7 backfill. |
| **WM-DLA-P1-11** | P1 | Forge index → Nehemiah publish | BACKLOG | Cross-map every DLA ticket (`WM-DLA-P1-01..10`) to a specific Markov Pro DLA 100% Blueprint module + §16 validation gate. No DLA ticket ships without a module id. | Reordering DLA priorities. |

### Bible §46 gate-gap tickets (new coverage for gates 3/5/6/7)

| Ticket | P | Owner | Status | Objective | Never in scope |
|---|---|---|---|---|---|
| **WM-PAPER-P0-01** | P0 (Bible §46 Gate 3) | Forge contract → Noah impl → Sentinel verify | BACKLOG | Paper-trading lifecycle end-to-end: submit → fill → close → PnL → journal. Independent of live-broker; unblocks Trading-Safety gate. | Live order placement (DEC-005 boundary stays). Auto-fill against non-real quotes. |
| **WM-LEGAL-P0-01** | P0 (Bible §46 Gate 5 + §45 Founder-only) | **FOUNDER-ONLY** kickoff decision (engage counsel, define scope) | AWAITING FOUNDER | Legal review kickoff — jurisdiction(s), scope (broker/copy/token), counsel selection. | Any employee choosing counsel or scope. |
| **WM-MOBILE-P0-01** | P0 (Bible §46 Gate 6) | Micah lead → Sentinel iPhone+iPad screenshot verify | BACKLOG | Mobile-parity re-sweep at current HEAD: iPhone (360/390) + iPad (834). Bind to `WOW_RESPONSIVE_STANDARD.md`. | Redesign of surfaces already responsive; new features. |
| **WM-SUPPORT-P0-01** | P0 (Bible §46 Gate 7 + §45 Founder-only scope) | FOUNDER-ONLY scope decision → Micah spec → Noah impl | AWAITING FOUNDER | Support-surface bootstrap: in-app bug report + status page + refund flow — scope defined by Founder, then designed + built. | Employees choosing what support surface exists. |

### §45 Founder-only decision placeholders (delta over Atlas's 8-item list — 10 rows, 1 line each per §48 evidence discipline)

| Ticket | Bible ref | Item | Status |
|---|---|---|---|
| **WM-COPY-JURIS-01** | §38 | Copy-trading launch timing + jurisdiction | AWAITING FOUNDER |
| **WM-PERF-DEFAULTS-01** | §37 | Public performance defaults (Verified Performance) | AWAITING FOUNDER |
| **WM-TIER-STRUCTURE-01** | §39 | Subscription tier structure + pricing | AWAITING FOUNDER |
| **WM-TOKEN-SUPPLY-01** | §45 | WM$ / token supply + allocations | AWAITING FOUNDER |
| **WM-FUTURES-SCOPE-01** | §45 | Futures/options launch scope (distinct from `WM-BROKER-QUOTE-P0-01` wiring — this is *what launches* not *how quotes wire*) | AWAITING FOUNDER |
| **WM-LOUNGE-ALGO-01** | §Lounge | Lounge feed algorithm (chronological? engagement? both?) | AWAITING FOUNDER |
| **WM-NODE-RULES-01** | §45 | Gold / Platinum / Diamond node rules | AWAITING FOUNDER |
| **WM-BRAND-NAMING-01** | §45 | Entity + brand naming (WM Pro vs WealthyMindsets vs …) | AWAITING FOUNDER |
| **WM-VPW-METRIC-01** | §45 | VP Worlds default metric — **blocked-on** `WM-VP-WORLDS-DEF-01` (definition source) | BLOCKED |
| **WM-COMPLIANCE-ROADMAP-01** | §45 | Compliance roadmap (KYC/AML/best-execution touchpoints) | AWAITING FOUNDER |

All FOUNDER-ONLY rows are surfaced to Atlas for Drive publishing per §48 evidence discipline. No employee proceeds on these without a Founder ruling recorded in `DECISIONS.md`.

### Gate-rule corrections landed this sweep (from Sentinel V-012/V-013, `818bfee`)

- **Gate 2.4** (`WM-DRAW-P0-01`): static PASS ≠ GREEN. Runtime evidence (<150ms, 60fps, Esc-cancel, touch-drag) required from Sentinel on Founder-authenticated Chrome (blocked by RISK-001 / Gate 5).
- **Gate 4.2** (`WM-SEC-P0-02`): CROSS-PRODUCT with Dreamboard (shared Supabase `zrzaifaxecwgpfrqctkp`). Binding preconditions: backup exists · `DB-SEC-P1-01` LIVE-policy enumeration · named Dreamboard-side reviewer signs off. Condition #3 currently has nobody assigned (`DB-RISK-007`).

---

## Coordinator log — 2026-08-06 ~23:00 CDT checkpoint (Atlas)

- **Context:** the scheduled-checkpoint task itself appears to have gone dormant for ~3 days
  (no checkpoint session activity 2026-08-02 22:36 → 2026-08-07 03:09 CDT/UTC per session
  history) — the whole team's `EMPLOYEE_STATUS.md` rows were stale by days, not the usual
  ~90 min. Git activity shows the same gap: last commit before this run's start was
  `bc1404a` (2026-08-03 16:46), then one relay commit (`4add406`, 2026-08-06 22:55, from
  presumably the checkpoint session that just resumed).
- **Live collision handled carefully:** Noah's session (`NOAH-WM Pro`) was **actively running**
  during this checkpoint (`isRunning: true`, editing scanner-cache reconciliation files in the
  same shared working directory). Mid-checkpoint, local `main` briefly carried 3 unpushed
  commits (`f2574e1`, `513bdce`, `09d5b4a`) from an earlier direct-on-`main` pass at the same
  work, before Noah branched to `noah/scanner-cache-reconciled`. Atlas left git state untouched
  (no reset, no push) rather than risk colliding with an active session's uncommitted WIP —
  Noah's own session cleaned it up before Atlas needed to act (`87738e8` now sits cleanly on
  `origin/main`, matching local `main`). No `src/` was read-modified-or-pushed by Atlas.
- **Ticket-ID collision found (unfixed, flagged to Nehemiah):** two unrelated tickets both
  named `WM-DATA-P0-01` — "Cross-tab tape dedupe" (line ~341, BACKLOG, unowned) and
  "Live-quote regression" (line ~1000, the Founder-verified emergency, owner Noah). Needs a
  rename, not resolved this checkpoint (docs-only edit, deferred to Nehemiah's sweep to avoid
  editing the same file mid-collision-risk window).
- **Undocumented ticket found:** Micah shipped `WM-COLOR-P0-01` (green semantic overload,
  `b6fdb2a`) with no queue ticket body / owner chain — flagged to Nehemiah to file properly.
- **Dispatched (bus files, `dispatches/2026-08-06/`):** Sentinel (WM-UX-P0-01 + WM-DRAW-P0-01
  runtime evidence, both still outstanding since 08-02), Forge (pick next Bible-backlog P0 —
  `WM-BROKER-P1-04` order state machine, now that `WM-BROKER-QUOTE-P0-01` contract is fully
  relayed), Nehemiah (re-sweep after the 3-day gap + the two queue-hygiene defects above),
  Micah (WM-OF-P0-06 design pick still outstanding since 08-02), Video Intelligence (repeat:
  competitor-matrix-row default-idle action, `VI-WM-P0-03` itself stays Founder-blocked).
- **Skipped:** Noah — active session, no ping needed; self-dispatched Sentinel already
  (`dispatches/2026-08-05/2320-noah-to-sentinel-m1-scanner-reconcile.md`).
- **Pinged live (`send_message`, cap 3):** Sentinel, Forge, Nehemiah — highest-leverage:
  verification bottleneck, next architecture seat, and queue hygiene after the multi-day gap.
- **No `src/` touched by Mission Control this checkpoint.** No new role violations found.
- **Next action:** next checkpoint confirms Sentinel's WM-UX-P0-01 + WM-DRAW-P0-01 verdicts
  and the scanner-cache re-verify landed; confirms Nehemiah filed WM-COLOR-P0-01 and fixed the
  WM-DATA-P0-01 ID collision; escalate whichever is still missing after 90 min.

---

## WM-CHART-PROV-EMERG-01 — Strip provider-vendor names from user-visible labels

| Field | Value |
|---|---|
| **Ticket ID** | WM-CHART-PROV-EMERG-01 |
| **Product** | WM Pro |
| **Priority** | P0 — Founder-reported live, verbatim: *"stop exposing where our api keys are from"* |
| **Owner** | — (READY FOR NOAH) |
| **Status** | **Sentinel pre-verified 2026-08-07 — premise CONFIRMED current, not yet fixed** |
| **Objective** | No user-visible chrome names a data vendor (Finnhub/Yahoo/Alpaca/Polygon/Tradier/Alphavantage). Status ("DELAYED"/"LIVE") stays truthful; provenance detail moves to dev-only (`console.debug` / `window.__WM_DATA_PROVENANCE__`). |
| **Evidence source** | Drive: "WM Pro — EMERGENCY TICKETS — Provider-Name Exposure + Tastytrade Futures Stall" (2026-08-06 23:35 CDT), filed by Atlas |
| **Sentinel independent verification (source, 2026-08-07)** | Grep across the 6 named files found real, rendered violations — not just comments/identifiers: `StockInfoPanel.tsx:237` — `{realOHLC ? "Live data via Finnhub" : "Loading market data..."}`, rendered unconditionally when `realOHLC` is true. `ChartToolbar.tsx:724` — `"Searching Finnhub global database…"`, rendered in the symbol-search empty-state. `ChartToolbar.tsx:735` — `"Global results (Finnhub)"`, rendered as a live section header. All three are genuine user-facing JSX text, confirmed by reading surrounding render context, not inferred from the grep hit alone. The remaining grep hits across `DOMPanel.tsx`/`WatchlistPanel.tsx`/`MainChart.tsx` are comments, internal variable/prop names (`src: "finnhub"`), or provider-selection logic — not rendered. **Live-browser confirmation not obtained this pass** — Chrome connector unreachable at verification time; flagged, not silently skipped. |
| **Files / subsystems** | `StockInfoPanel.tsx:237`, `ChartToolbar.tsx:724,735` confirmed; `DOMPanel.tsx`, `WMSessionVP.tsx`, `WatchlistPanel.tsx`, `MainChart.tsx` need a fresh grep pass after the above three are fixed, since a first-pass grep can miss conditionally-rendered strings. |
| **Acceptance criteria** | Per Drive ticket: 1) vendor-agnostic user labels. 2) provenance preserved in dev/logs only. 3) status labeling stays truthful. 4) verified at 360×800/390×844/834×1194/desktop. 5) Sentinel grep returns zero user-facing vendor strings under `src/`. |
| **Ownership** | Micah: label copy. Noah: implementation. Sentinel: grep re-audit + live-verify once shipped. |
| **Next action** | Ready for Noah. Sentinel re-verifies (grep + live) on submission — do not self-close on grep alone per house standard. |

---

## WM-BROKER-TASTY-ESC-01 — tastytrade futures wiring, stalled 8+ days

| Field | Value |
|---|---|
| **Ticket ID** | WM-BROKER-TASTY-ESC-01 |
| **Product** | WM Pro |
| **Priority** | P0 — Founder escalation, verbatim: *"Why don't I see tastytrade activated to the futures I've said many times to have it wired up"* |
| **Owner** | — (READY FOR NOAH — spec already exists, no new contract needed) |
| **Status** | **Sentinel pre-verified 2026-08-07 — core claim CONFIRMED current; one sub-detail stale** |
| **Objective** | `/ES` `/NQ` `/GC` `/CL` render live through the tastytrade adapter with correct tick/point values, per Bible §33. |
| **Evidence source** | Forge contract `docs/operations/handoffs/forge/2026-07-31-forge-wm-broker-p0-01-tastytrade-futures.md` (spec, unimplemented for 8 days); Drive emergency doc above. |
| **Sentinel independent verification (source, 2026-08-07)** | **Core claim CONFIRMED:** zero tastytrade futures streaming/instrument function exists anywhere in `src/lib/tastytrade.ts`; zero files under `src/components/chart/` or `src/app/charts/` reference tastytrade at all. Futures are still 100% sourced from Yahoo — `WatchlistPanel.tsx:73` (`// Futures → Yahoo only`) and `MainChart.tsx:2310` (`Futures use Yahoo ES=F`) confirm this directly, unchanged. `isFuturesApproved` (`tastytrade.ts:159`) is computed from real account data but has **zero consumers anywhere in `src/`** — confirmed by repo-wide grep, matches the contract's "computed but unused" claim exactly. **One correction to the ticket as worded:** it states `supportedAssetClasses` "hardcodes without a 'future' enum" — that's now stale. `tastytrade.ts:201` already sets `supportedAssetClasses = ["equity", "option", "future"]` unconditionally on successful connection. The string is present; nothing routes on it. Don't let a reader "fix" the string and believe the ticket is closed — the actual gap is the missing instrument/streamer-symbol path and the unused `isFuturesApproved` gate, not the enum list. |
| **Files / subsystems** | `src/lib/tastytrade.ts` (add futures instrument + streamer-symbol path, wire `isFuturesApproved`), chart/watchlist data-source routing (currently Yahoo-only for futures). |
| **Acceptance criteria** | Per Forge contract: 1) asset-class capability drives behavior, not just a label. 2) `isFuturesApproved` actually gates the futures path. 3) streamer-symbol path exists. 4) `/ES /NQ /GC /CL` render live with correct tick/point values. 5) continuous-vs-specific contract distinction preserved (Bible §33). |
| **Ownership** | Noah: implementation per existing Forge contract. Sentinel: live-test when futures market next opens. |
| **Next action** | Ready for Noah — no new spec needed. Sentinel live-verify blocked until futures market hours + a working Chrome/session path. |

---

## Coordinator log — 2026-08-22 07:xx CDT checkpoint (Atlas) — multi-role bus confirmed obsolete, dispatch/ping skipped

- **Finding, not a new decision — restating what `handoffs/2026-08-08-one-thread-supersede.md`
  already ratified:** the six role-thread sessions this checkpoint is built to dispatch/ping
  (`Sentinel WM Pro`, `FORGE WM Pro`, `NOAH-WM Pro`, `MICAH WM Pro app`, `Nehemiah WM Pro app`,
  `ATH video intelligence`) all went dormant on/before 2026-08-08 and never resumed
  (`list_sessions` confirms last activity 2026-08-02 → 2026-08-08 across all six, nothing since).
  `EMPLOYEE_STATUS.md` hasn't moved since 2026-07-30. No Coordinator log entry landed between
  2026-08-06/07 and today — this checkpoint effectively stopped doing useful work at the
  supersede boundary and kept re-running its old playbook against an empty bus.
- **What's actually happening:** all WM Pro engineering since 2026-08-08 is one continuously
  active thread ("ATH unified engineering directive", `isRunning: true` as of this checkpoint)
  operating under canon §20's 3-hour ATH/WOW strong-shift law, tracked via
  `docs/operations/CLAUDE_SESSION_*_SHIFT*_BATON.md` — 8 commits landed today alone
  (`991e350`..`75158ab`), latest baton `CLAUDE_SESSION_2026-08-22_SHIFTG_BATON.md`. tsc clean,
  suite green per that baton.
- **Action taken this checkpoint:** sync + audit only (§1–2). Skipped §3 (dispatch/ping — no
  live recipient exists; filing tickets into `dispatches/` or paging six dormant sessions
  would be pure noise and an unjustified `send_message` approval prompt) and §5 (Nehemiah
  snapshot — role thread defunct). No `src/` touched, matches the 6 preserved-dirty-file set
  the shift baton already accounts for (untouched, byte-identical) — not new WIP, not mine.
- **Recommendation:** this scheduled task (`wm-pro-operations-checkpoint`, fires every 30 min
  07:00–22:00 CDT) should be paused or repurposed — its dispatch/ping mechanism has had no
  live target for two weeks. If continued checkpoint coverage is wanted, point it at auditing
  the shift-baton cadence instead (e.g. flag if no new `SHIFT*_BATON.md` lands within an
  expected window), not the pre-2026-08-08 role bus.
- **Next action:** none required from this mechanism until the scheduled task itself is
  updated or retired by the Founder.

---

## Coordinator log — 2026-08-22 07:46 CDT checkpoint (Atlas) — one-thread status reconfirmed, no action taken

- **No new information since the 07:44 checkpoint** (`2dfb401`) two minutes prior — this entry
  exists only to avoid a silent gap in the log, not because anything changed.
- **One additional commit landed in the interim:** `cafc10b` (07:45:40, H-Bkt 8 Orkin nest
  closure) — landed inside the same active shift-baton thread the last checkpoint identified,
  confirming that thread is live and self-sufficient without coordinator dispatch.
- **Uncommitted `src/` working tree (5 modified + 6 untracked)** matches in-progress work from
  that same active thread per `CLAUDE_SESSION_2026-08-22_SHIFTG_BATON.md` — not touched, not
  mine, no violation.
- **Dispatch/ping (§3) skipped again** — same reasoning as 07:44: all six role-thread sessions
  (Sentinel/Forge/Noah/Micah/Nehemiah/Video Intelligence) remain dormant since on/before
  2026-08-08 per `handoffs/2026-08-08-one-thread-supersede.md`; paging them would be noise.
- **Next action:** unchanged — this scheduled task should be repurposed to audit shift-baton
  cadence (flag if no new `SHIFT*_BATON.md` lands within an expected window) rather than the
  pre-2026-08-08 role bus, or paused pending Founder decision.

---

## Coordinator log — 2026-08-22 22:29 CDT checkpoint (Atlas) — one-thread status reconfirmed, no action taken

- **Same finding as the 07:44/07:46 checkpoints, still holding 15 hours later:** all six
  role-thread sessions (Sentinel/Forge/Noah/Micah/Nehemiah/Video Intelligence) remain dormant
  since on/before 2026-08-08. Dispatch/ping (§3) skipped again — no live recipient, paging
  them would be noise.
- **Shift-baton thread is highly active, not stalled:** HEAD `0fd6ab0` (I-Bkt 12, 22:29:45
  CDT) landed literally during this checkpoint's audit — 12 "I-Bkt" commits since 21:25 CDT
  alone (journal exporter, broker certification harness + `/api/broker/status` +
  `/api/broker/certification` endpoints), following an earlier "H-Bkt" run this morning
  (`CLAUDE_SESSION_2026-08-22_SHIFTH_BATON.md`, written 07:51, 862/862 vitest, tsc clean).
  All commits authored `spaidsnipes` — no Atlas/Claude-role commits under `src/`, no DEC-012
  violation.
- **Uncommitted working tree:** the same 5 preserved-dirty files (byte-identical, matches
  shift baton's invariant) plus in-flight WIP (`heroTruthChronology.ts`/test, a
  heatmap-a11y test) not yet committed by the active thread — not touched by Mission Control,
  not a violation.
- **No `src/` touched by Mission Control this checkpoint. No new role violations found.**
- **Recommendation unchanged from 07:44/07:46:** this scheduled task's dispatch/ping
  mechanism still has no live target two weeks running. Repurpose to audit shift-baton
  cadence (flag only if no new commit/baton lands within an expected window) or pause,
  pending Founder decision. Continuing to log identical "no action" checkpoints every 30
  min is low-value; will keep doing so until repurposed or paused.
- **Next action:** none required from this mechanism until the scheduled task itself is
  updated or retired by the Founder.
