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
| **Status** | **FORGE ACTIVE** |
| **Objective** | One canonical timeframe module that separates candle interval, visible historical range, provider-specific interval value, and display label. Eliminate the three incompatible literals. |
| **Dependencies** | None |
| **Evidence source** | `docs/WM_CHART_ARCHITECTURE_2026-07-28.md` §C1, §D1, §E — **independently re-verified by Sentinel 2026-07-28** |
| **Files / subsystems** | New `src/lib/timeframes.ts`; `src/components/chart/ChartToolbar.tsx:433`; `src/app/heatmaps/page.tsx:251`; `src/app/backtesting/page.tsx:27` |
| **Acceptance criteria** | 1. Exactly one `TFId` definition repo-wide. 2. `grep -rn "TIMEFRAMES" src/` returns only the canonical module and its importers — zero local literals. 3. `"D"/"W"/"M"` unified with `"1D"/"1W"/"1M"`. 4. Every interval labelled `native` / `aggregated` / `unsupported` from **measured provider probes, not assumption**. 5. Aggregation permitted only from an exact integer divisor. 6. Unsupported intervals render disabled with an honest reason — **never silently substituted**. 7. No state-model change and no UI restyle in this ticket. |
| **Verification requirements** | Unit: aggregation rejects non-integer divisors; `TFId` round-trips chart↔heatmap; unsupported never returns candles. Automated: `tsc --noEmit` 0 errors, `npm test` green, `npm run build` 69/69. Manual: click all supported intervals in sequence, no crash, honest disabled states. Sentinel re-runs the `grep` and inspects the provider-probe evidence. |
| **Claimed by** | Forge — claimed under DEC-008 (Founder ruled "Forge codes" on the DEC-004 role conflict) |
| **Claim timestamp** | 2026-07-28 |
| **Latest commit** | *(none)* |
| **Handoff location** | `docs/operations/handoffs/noah/` |
| **Blockers** | Provider limits (Alpaca free-tier intraday depth, Yahoo intraday range caps) are **UNVERIFIED**. Noah must probe and record before finalising the matrix. Do not guess. |
| **Next action** | Noah: read the four required documents, confirm the ticket boundary, claim the ticket, then probe provider support **before** writing the matrix. |

---

## WM-CHART-P0-02 — Chart Context + Stale-Request Protection

| Field | Value |
|---|---|
| **Ticket ID** | WM-CHART-P0-02 |
| **Product** | WM Pro |
| **Priority** | P0 |
| **Owner** | — |
| **Status** | BACKLOG |
| **Objective** | A response from a previous symbol/timeframe must never overwrite the active view. Implement `ChartContext` + monotonic `dataVersion` guard. |
| **Dependencies** | WM-CHART-P0-01 |
| **Evidence source** | Architecture report §D2 |
| **Files / subsystems** | Chart data-fetch paths; `ChartsDashboard.tsx`; new context module |
| **Acceptance criteria** | A forced-slow 1m response arriving after switching to 4h is **discarded, never rendered**. No stale candles persist across symbol change. Every async result carries the `dataVersion` it was requested under. `AbortController` fires on supersede. |
| **Verification requirements** | Unit: stale `dataVersion` rejected. Manual: 6 rapid timeframe changes in 3 s; final render must match final selection. |
| **Claimed by** | — | 
| **Claim timestamp** | — |
| **Latest commit** | — |
| **Handoff location** | `docs/operations/handoffs/noah/` |
| **Blockers** | Blocked until P0-01 lands |
| **Next action** | Hold. Do not start in parallel with P0-01 — it rewrites the same call sites. |

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
| DB-OPS-P1-01 | P1 | — | BACKLOG | **Dreamboard**: 164 lines of untracked WIP on `feature/project-memory-health`, unpushed 5 days | Different product/repo | Commit and push, or record why it is parked |
