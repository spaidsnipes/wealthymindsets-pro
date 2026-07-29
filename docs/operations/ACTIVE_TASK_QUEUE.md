# ACTIVE TASK QUEUE

**Owner:** Sentinel · **Last updated:** 2026-07-28 10:50 CDT
**Product in this block:** WM Pro · **Base commit:** `fb063d0`

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
| **Status** | **READY FOR NOAH — APPROVED, unblocked** |
| **Objective** | No provider may return a bar size other than the one requested without the request being rejected. Every interval map becomes fail-closed: exact native match, exact integer aggregation, or an honest `unavailable` — never a silent substitution. |
| **Dependencies** | WM-CHART-P0-01 (**satisfied**, `d2ea511`) |
| **Evidence source** | Sentinel verification handoff §4, `docs/operations/handoffs/sentinel/2026-07-28-sentinel-wm-chart-p0-01-verification.md`. **CONFIRMED in source, four independent maps.** |
| **Confirmed defect** | Four provider maps disagree and three substitute silently:<br>• `src/app/api/finnhub/route.ts:39` — `"2m": "1"` → **1-minute bars labelled 2m**; `"3m":"5"`, `"10m":"15"`, `"2h":"60"`, `"4h":"60"`<br>• `src/components/chart/MainChart.tsx:216` — `"2m":"5"` → **5-minute bars labelled 2m**; same `3m`/`10m`/`2h`/`4h` substitutions<br>• `src/app/api/alpaca/route.ts:50` (`2Min`) and `src/app/api/yahoo/route.ts:70` (`2m`) are **correct**<br>• `MainChart.tsx:110` `getIntervalSec()` ends `?? 60` — **fail-open**: an unrecognised timeframe silently becomes 1 minute |
| **Blast radius** | **`2m` is live today** — it is one of the nine ids in `CHART_TF_SHIPPED`. Fallback order (`MainChart.tsx:1568-1572`) is `exchangeData → alpaca → finnhubDirect → yahoo → finnhubClient → polygon`; `/api/finnhub` runs **ahead of Yahoo**, so whenever Alpaca returns `null` the user is served 1-minute bars labelled `2m`. The same click can yield 1-, 2-, or 5-minute candles depending on which provider answers — **non-deterministic mislabelling with no user-visible indication.** `3m`/`10m`/`2h`/`4h` are latent (withheld by `CHART_TF_SHIPPED`) and go live the moment P0-01b widens the toolbar. |
| **Files / subsystems** | `src/app/api/finnhub/route.ts`; `src/components/chart/MainChart.tsx` (`resMap`, `getIntervalSec`); `src/app/api/alpaca/route.ts`; `src/app/api/yahoo/route.ts` |
| **Acceptance criteria** | 1. Every provider map is derived from `src/lib/timeframes.ts` — no hand-written interval literal survives in any route or fetch helper. 2. A provider that cannot serve the exact requested interval returns `null`/`unavailable`; it **never** returns a different bar size. 3. `assertGranularity()` is wired into every path that returns candles — currently it has **zero importers**. 4. `getIntervalSec()` throws or returns `null` on an unknown timeframe instead of defaulting to 60. 5. Where an exact integer divisor exists, `aggregateCandles()` may be used; otherwise unavailable. 6. When all providers decline, the chart renders an honest empty/unavailable state — **never a substituted or fabricated series.** |
| **Verification requirements** | Unit: each provider map rejects a non-exact interval; `assertGranularity` throws on mismatch; `getIntervalSec` fail-closed on unknown input; a `2m` request never yields a 1- or 5-minute series. Automated: `tsc --noEmit` 0 errors, `vitest` green, `npm run build` 69/69. Sentinel: re-grep for surviving literals and confirm `assertGranularity` has real importers. |
| **Claimed by** | — (Noah to claim) |
| **Claim timestamp** | — |
| **Latest commit** | — |
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
| **Status** | **COMPLETE — AWAITING SENTINEL VERIFICATION** |
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
| **Blockers** | Manual verification (6 rapid timeframe changes) still needs an authenticated `/charts` session — **blocked by RISK-001**, same as P0-01. `buildId`/`disposed` (pre-existing) and the new `DataVersionGuard` are currently redundant, not unified — both must agree before data applies; full consolidation is safe optional follow-up, not required for closure. **`MainChart.tsx` is now clear for WM-CHART-P0-03 (Noah)** — P0-02's edits are committed and pushed. |
| **Next action** | Sentinel: verify per handoff §3-§4 (grep confirms prior AbortController absence, unit test models the exact ticket scenario) and rule on whether the redundant-guard approach closes the ticket. |

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
| **Owner** | — |
| **Status** | BACKLOG |
| **Objective** | Market state must depend on the selected timeframe. Move `computeMarkovState` out of the heatmap page into `src/lib/marketState.ts` and change its input from a scalar percentage to a candle series + `TFId`. |
| **Dependencies** | WM-CHART-P0-01, WM-CHART-P0-02 |
| **Evidence source** | Architecture report §C3 — **Sentinel re-verified**: `computeMarkovState(sym, periodReturn)` is defined page-locally at `src/app/heatmaps/page.tsx:280` and takes a single scalar. A scalar cannot encode a timeframe. |
| **Files / subsystems** | `src/app/heatmaps/page.tsx`; `ChartsDashboard.tsx` regime HUD; new `src/lib/marketState.ts` |
| **Acceptance criteria** | Switching 15m→4h **provably changes the computed inputs**. Displayed state's `calculatedFor` always equals the active symbol + timeframe. Insufficient history renders `unavailable`, never a guess. `minBarsForState` enforced. |
| **Verification requirements** | Unit: same symbol at different intervals produces different state; fixture-based classification; `minBarsForState` gate. Manual: cycle all supported intervals and confirm the HUD tracks. **Thresholds must be validated against real data, not invented.** |
| **Claimed by** | — |
| **Claim timestamp** | — |
| **Latest commit** | — |
| **Handoff location** | `docs/operations/handoffs/noah/` |
| **Blockers** | This is **new modelling**, not rewiring. Sentinel's position: better to ship it late and validated than on Friday and fabricated. |
| **Next action** | Hold. Founder should acknowledge the Friday risk. |

---

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
| **Owner** | **Founder** |
| **Status** | **BLOCKED — Founder action required** |
| **Objective** | Confirm the env var is set in production, then make the fallback fail fast on boot in production instead of silently degrading. |
| **Dependencies** | Founder access to Vercel |
| **Evidence source** | `src/lib/auth.ts:12` — **Sentinel re-verified**: `process.env.JWT_SECRET ?? "<committed fallback>"`. If the var is unset in production, session-signing integrity rests on a value visible to anyone with repo read access. |
| **Files / subsystems** | `src/lib/auth.ts` |
| **Acceptance criteria** | Founder confirms the var is set (**do not paste the value into any document, commit, or chat**). Then a hardening commit makes an unset `JWT_SECRET` throw on boot when `NODE_ENV === 'production'`. |
| **Verification requirements** | Sentinel confirms the hardening commit and that no document contains the literal secret. |
| **Claimed by** | — |
| **Claim timestamp** | — |
| **Latest commit** | — |
| **Handoff location** | `docs/operations/handoffs/sentinel/` |
| **Blockers** | Founder |
| **Next action** | **Founder: confirm yes/no in `DECISIONS.md`.** The hardening commit can be written before the answer arrives. |

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

## WM-DATA-P0-01 — Cross-tab tape dedupe

| Field | Value |
|---|---|
| **Ticket ID** | WM-DATA-P0-01 (previously cited as "issue #78" — **that issue does not exist**, see RISK-005) |
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
