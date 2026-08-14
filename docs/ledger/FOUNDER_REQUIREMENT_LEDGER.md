# Founder Requirement Ledger — WM Pro × ATHOS

Durable artifact of Founder-stated product requirements distilled from thread
archaeology. Query this before starting new work; update this after landing
each requirement. Never rewrite historical entries — supersede via new rows.

Legend:
`CANONICAL` current Founder canon · `ACTIVE` in-progress · `EXPERIMENTAL` hypothesis ·
`RESEARCH` observation only · `SUPERSEDED` replaced · `CONFLICTING` needs resolution ·
`IMPLEMENTED` shipped in code · `PARTIAL` half-shipped · `BROKEN` regressed ·
`MISSING` not started · `VERIFIED` visually confirmed.

---

## §A — Foundational doctrines (never invented, sourced from Founder text)

| ID | Founder statement | Interpreted requirement | Status | Evidence |
|---|---|---|---|---|
| A01 | "UI is part of the machine" | UI = operational architecture, not decoration | `CANONICAL` | Aug 13 super-directive final UI law |
| A02 | "Observation ≠ Classification" | UNKNOWN aggressor observations MUST reach Nectar; skip only signed downstream | `CANONICAL` `IMPLEMENTED` | commits 7ad6b2a + 5696bbd (F2 in tryAlpacaRelay) |
| A03 | "Transport ≠ Symbol observation ≠ Classification ≠ Persistence" | 4 truth layers renderable independently | `CANONICAL` `PARTIAL` | DataHealth.tsx primitives shipped (commit 9a238cd); not yet consumed by MainChart/BottomIndexBar |
| A04 | "Number without coverage is not full truth" | Every aggregate metric carries provenance | `CANONICAL` `MISSING` | ProvenanceEnvelope drafted in P0 doc; not applied to real MainChart metrics yet |
| A05 | "Never fabricate the missing side" | Delta/CVD MUST skip UNKNOWN aggressor; volume/profile MUST include it | `CANONICAL` `IMPLEMENTED` | tryAlpacaRelay onTick wrapper (useWebSocket.ts current) |
| A06 | "Silence is a feature" (ATHOS) | ATHOS may not nag; interventions only at useful moments | `CANONICAL` `MISSING` | No ATHOS intervention framework exists yet |
| A07 | "The trader is responsible" | No permission gate — WM informs, human decides | `CANONICAL` `IMPLEMENTED` | Steward/OpeningBell selectors emit `advisory` not gate booleans |
| A08 | "Different room. Same house." | WM/TV/Radio/Lounge/Shop share Passport + graph + payments + notifications | `CANONICAL` `RESEARCH` | Passport bridge design deferred |
| A09 | "Familiar in 5s, powerful in 30s, unlike anything else after 5min" | 1/3/1 rule for hero truth → supporting evidence → deep drilldown | `CANONICAL` `MISSING` | No consumer surface yet respects this timing law |
| A10 | "Innovation appears at useful moment, not all the time" | Progressive disclosure; hide until needed | `CANONICAL` `PARTIAL` | Panel/Ribbon primitives support it; consumers not yet built |
| A11 | "The deeper the engine, the calmer the surface" | Reject dashboard-of-everything patterns | `CANONICAL` `MISSING` | Current /charts is 43K-line panel-stack |
| A12 | "Determinism / Time Engine" | Evidence selectors take injected time; Replay reproduces exactly | `CANONICAL` `IMPLEMENTED` | Mirror/OpeningBell nowMs now required (commit bc46de0) |

## §B — P0 defects the Founder explicitly called out

| ID | Founder statement | Interpreted requirement | Status | Evidence |
|---|---|---|---|---|
| B01 | "9 sockets on /charts, equity bypasses TapeHub" | Route Alpaca relay through joinTape | `CANONICAL` `IMPLEMENTED` | commit 5696bbd — tryAlpacaRelay factory + joinTape wiring |
| B02 | "Duplicate /scanner/heatmap route" | Retire; /heatmaps is canonical | `CANONICAL` `IMPLEMENTED` | commit a772167 — route + component deleted |
| B03 | "MarketHeatmap.tsx format callback never wired" | Delete + false comment | `CANONICAL` `IMPLEMENTED` | commit a772167 — component deleted |
| B04 | "/heatmaps controls <44px + no aria-pressed" | 44×44 hit targets, aria-pressed, non-color state cue | `CANONICAL` `IMPLEMENTED` | commit 3053a77 — VIEW/TF buttons corrected |
| B05 | "Mirror/OpeningBell silently call Date.now()" | Require nowMs; typecheck enforces | `CANONICAL` `IMPLEMENTED` | commit bc46de0 — nowMs required |
| B06 | "Process Landscape claimed shipped, actually decisions=[]" | Do not label scaffolding "shipped" | `CANONICAL` `PARTIAL` | /profile/process route is scaffold; needs Decision Memory store subscription |
| B07 | "'LIVE' badge lies (means !paused)" | Bind quality badge to real MarketQualityState | `CANONICAL` `PARTIAL` | QualityBadge primitive shipped; not yet consumed by MainChart |
| B08 | "'Saved N' overclaims persistence" | Bind persistence badge to real server ack | `CANONICAL` `PARTIAL` | PersistenceBadge primitive shipped; PR#24 review comment posted (external) |

## §C — Trading intelligence system (Founder trading process)

| ID | Founder statement | Interpreted requirement | Status | Evidence |
|---|---|---|---|---|
| C01 | "Direction × Location × Aggression × Response" | DLAR selector; feeds Story/CLC/Trade Expectation | `CANONICAL` `IMPLEMENTED` | selectDLAR.ts (commit bc46de0) |
| C02 | "CLC = Context + Location + Confirmation (NOT Confluence + Alignment + Catalyst)" | Correct selector semantics + retract earlier invented definition | `CANONICAL` `IMPLEMENTED` | selectCLC.ts (commit bc46de0) — LONG/SHORT/WAIT/INVALID/UNKNOWN |
| C03 | "HTF context → MID destination → LTF location → V-LTF response" | Timeframe Role Engine | `CANONICAL` `IMPLEMENTED` | timeframeRoles.ts (commit bc46de0) |
| C04 | "Available R = structural risk vs realistic reward" | Never shrink stop for prettier R; UNKNOWN when unknown | `CANONICAL` `IMPLEMENTED` | selectAvailableR.ts (commit bc46de0) |
| C05 | "External structure controls the larger story; internal OB does not automatic reverse" | External vs internal structure distinction | `CANONICAL` `PARTIAL` | Doctrine embedded in reasoning graph docs; not yet in UI |
| C06 | "Regime → Direction → Location → Auction → Aggression → CLC → Risk → Permission → Management" | Full decision chain (extends DLAR) | `CANONICAL` `PARTIAL` | Missing: Regime selector, Auction State selector, Permission engine |
| C07 | "Aggression without response can matter more than aggression alone" | Absorption verdict from DLAR when high agg + low displacement | `CANONICAL` `IMPLEMENTED` | selectDLAR.ts ResponseVerdict = "ABSORBED" when displacementRatio < 0.2 × ATR |
| C08 | "Never use absolute price delta" | ATR-normalized (dimensionless) | `CANONICAL` `IMPLEMENTED` | selectDLAR + Story engine both use ATR ratio |

## §D — Trader-development / behavioral (from live TSLA case + prior context)

| ID | Founder statement | Interpreted requirement | Status | Evidence |
|---|---|---|---|---|
| D01 | "Steward State — psychology across whole life, not per-app" | opt-in behavioral context layer, gentle | `CANONICAL` `PARTIAL` | selectSteward pure selector shipped (commit 38e7d38 prior); no UI |
| D02 | "Mirror asks: what does my behavior teach me?" | selectMirror emits patterns with evidence class | `CANONICAL` `IMPLEMENTED` | selectMirror.ts (commit bc46de0) — 5 detectors, no diagnosis |
| D03 | "Post-Exit Integrity — continuation ≠ exit was wrong" | Detect + intervention framing | `CANONICAL` `MISSING` | Not implemented anywhere |
| D04 | "Success-triggered rule bending" | Detect winner → oversized re-entry pattern | `CANONICAL` `MISSING` | Not implemented; today's TSLA case is the seed data |
| D05 | "Revenge against missed profit (not just against loss)" | Detect FOMO-after-win emotional dysregulation | `CANONICAL` `MISSING` | Not implemented; today's TSLA case is the seed data |
| D06 | "Rule hierarchy — one-and-done ≠ absolute; configurable" | Configurable trade-rule schema (max trades, max losses, cooldown, override log) | `CANONICAL` `MISSING` | Not implemented |
| D07 | "Capital scaling follows behavioral consistency, not P&L" | Scale by sample size + rule adherence, not raw earnings | `CANONICAL` `MISSING` | Not implemented; future architecture |
| D08 | "Two engines: TSLA options + futures/prop (never collapse)" | Independent tracking: eval/funded/payouts/personal | `CANONICAL` `MISSING` | Not implemented; account boundaries needed |
| D09 | "Morning Bootcamp — configurable per worldview" | Christ/Man/Mission/Execution for this founder, opt-in for others | `CANONICAL` `PARTIAL` | /morning-prep route exists (unaudited); OpeningBell selector shipped |
| D10 | "Personal Edge — real evidence, not vanity" | Track instrument/regime/setup/etc, gated by sample size | `CANONICAL` `MISSING` | ProcessLandscape selector is the substrate (commit 740f98d); no evidence yet |

## §E — Heatmap families

| ID | Founder statement | Interpreted requirement | Status | Evidence |
|---|---|---|---|---|
| E01 | Broad market / sector heat | Sector strength view | `CANONICAL` `IMPLEMENTED` | /heatmaps has S&P 500 + Markov + VP modes |
| E02 | Volume-profile / auction heat | HVN/LVN/POC visualization | `CANONICAL` `IMPLEMENTED` | /heatmaps includes VP mode |
| E03 | Order-flow heat (aggression, delta, CVD, absorption) | Signed classification only; UNKNOWN visible | `CANONICAL` `MISSING` | Not on /heatmaps |
| E04 | Liquidity heat (real DOM only) | Never fake L2; UNAVAILABLE badge | `CANONICAL` `MISSING` | Not on /heatmaps |
| E05 | Session heat | Time-of-day × behavior | `CANONICAL` `MISSING` | Not on /heatmaps |
| E06 | Playbook edge heat | Per-context edge, sample-gated | `CANONICAL` `PARTIAL` | selectProcessLandscape supports it; no consumer route |
| E07 | Trader process heat | Rule adherence × context, no diagnosis | `CANONICAL` `PARTIAL` | selectProcessLandscape supports it; no consumer route |
| E08 | Personal Edge heat | Where this trader specifically performs | `CANONICAL` `MISSING` | Depends on D10 |

## §F — Profile surface (Founder's list)

| ID | Founder statement | Interpreted requirement | Status | Evidence |
|---|---|---|---|---|
| F01 | Identity: avatar, name, handle, bio, Passport | Present + minimal | `CANONICAL` `PARTIAL` | /profile/page.tsx 778 lines — has identity but no Passport |
| F02 | Trader operating style | Preferred markets, sessions, timeframes, playbooks | `CANONICAL` `MISSING` | Not surfaced |
| F03 | Process (adherence, prep, discipline) | Panel with real evidence | `CANONICAL` `MISSING` | Not surfaced |
| F04 | Decision Quality Split (opportunity/match/risk/execution/adherence) | Rendered separately from outcome | `CANONICAL` `MISSING` | Types shipped in decisionMemory.ts (commit c4614d0); no UI |
| F05 | Playbook DNA | Version, maturity, contexts, failure signatures | `CANONICAL` `MISSING` | No playbook data model shipped |
| F06 | Learning (drills, puzzles, teach-back, mastery) | Academy progress panel | `CANONICAL` `MISSING` | No academy data |
| F07 | Decision Memory timeline | Not raw P&L bragging | `CANONICAL` `MISSING` | Types shipped; no timeline UI |
| F08 | Personal Best, Expected Range, Process Standard | Contextual capacity + variability | `CANONICAL` `MISSING` | Not shipped |
| F09 | Community / Creator identities | Rooms, tribes, academies, mentorship | `CANONICAL` `MISSING` | Not shipped |
| F10 | Privacy (PRIVATE / SELECTED / GROUP / PUBLIC / UNKNOWN per domain) | Per-field privacy controls | `CANONICAL` `MISSING` | No privacy layer |
| F11 | Passport (identity, permissions, mastery, WOW future) | Cross-product identity spine | `CANONICAL` `RESEARCH` | Deferred |

## §G — SHIPPED (post-Aug-13 continuation cycle)

| ID | What | Where | Commit |
|---|---|---|---|
| VS-1 | `MarketDataHealth` wired into `/heatmaps` header | `src/app/heatmaps/page.tsx` | `543f3f4` |
| VS-2 | `Growth` tab on `/profile` composing IdentityChip + Permission + ATHOS + ProcessLandscape + PersonalEdge + Command Deck link | `src/app/profile/page.tsx` | `670985b`, `9aef63b`, `476cfdc`, `d980a4e` |
| VS-3 | ATHOS silent-mode: `selectATHOSIntervention` + `ATHOSInterventionPanel` (7 detectors, CAUTION verdict ceiling) | `src/lib/traderMemory/viewModels/selectATHOSIntervention.ts`, `src/components/athos/` | `0723adb` |
| VS-4 | Regime + Auction State + composed Decision Chain selectors | `src/lib/marketData/viewModels/select{Regime,AuctionState,DecisionChain}.ts` | `99cdd3a`, `685eef4` |
| VS-4-UI | `DecisionChainPanel` — pure display for the 9-node chain | `src/components/chart/DecisionChainPanel.tsx` | `7b9f298` |
| VS-4-Route | `/command-deck` route composing DecisionChain + StoryRibbon + Permission + ATHOS + OpeningBell + Mirror | `src/app/command-deck/page.tsx` | `3f9dec0`, `210d369` |
| VS-5-Mirror | Mirror behavioral detectors: post-exit quick-reentry, success-triggered rule bending, rushing | `src/lib/traderMemory/viewModels/selectMirror.ts` | `f139bc1`, `f15a785`, `97565f9` |
| VS-6-Bridge | Journal → DecisionMemorySnapshot adapter + wired into `/journal` MirrorPanel + `/profile` Growth merged data | `src/lib/traderMemory/adapters/*` + `src/app/{journal,profile}/page.tsx` | `4727ca4` |
| VS-7-Nav | `/command-deck` added to main nav | `src/components/layout/MainLayout.tsx` | `a9afd94` |
| VS-8-Prep | `/morning-prep` gets OpeningBellPanel above the feed | `src/app/morning-prep/page.tsx` | `74ad348` |
| A03 | 4-layer truth vocabulary primitives (QualityBadge, PersistenceBadge, NectarHeartbeat, MarketDataHealth) | `src/components/ui/DataHealth.tsx` | `9a238cd` (pre-cycle) |
| A12 | Determinism doctrine: `nowMs` REQUIRED on Mirror + OpeningBell selectors | `src/lib/traderMemory/viewModels/select{Mirror,OpeningBell}.ts` | `bc46de0` |
| B01 | 9-socket equity defect fixed via `joinTape('alpaca-relay:SYM')` shared TapeHub | `src/hooks/useWebSocket.ts` | `5696bbd` |
| B04 | `/heatmaps` a11y — 44px hit targets + aria-pressed + non-color state cue | `src/app/heatmaps/page.tsx` | `3053a77` |
| B05 | Determinism fix (see A12) | | `bc46de0` |
| B02/B03 | Retire duplicate `/scanner/heatmap` + broken `MarketHeatmap.tsx` | | `a772167` |
| C01 | DIRECTION × LOCATION × AGGRESSION × RESPONSE — `selectDLAR` | `src/lib/marketData/viewModels/selectDLAR.ts` | `bc46de0` |
| C02 | CLC = Context + Location + Confirmation — `selectCLC` | `src/lib/marketData/viewModels/selectCLC.ts` | `bc46de0` |
| C03 | Timeframe Role Engine — `timeframeRoles.ts` | `src/lib/marketData/viewModels/timeframeRoles.ts` | `bc46de0` |
| C04 | Available R — `selectAvailableR` (never shrinks stop, UNKNOWN when unknown) | `src/lib/traderMemory/viewModels/selectAvailableR.ts` | `bc46de0` |
| C06 | Full chain closed: Regime + Auction State (Direction/Location/Aggression/CLC already existed) | | `99cdd3a`, `685eef4` |
| D01 | Steward selector (existing selector `selectSteward`) | | `38e7d38` (pre-cycle) |
| D02 | Mirror selector `selectMirror` with 5 detectors + 3 new behavioral | | `bc46de0`, `f139bc1`, `f15a785`, `97565f9` |
| D03 | Post-Exit Integrity — surfaces via ATHOS (moment) + Mirror (retrospective) | | `0723adb`, `f139bc1` |
| D04 | Success-Triggered Rule Bending — same dual surface | | `0723adb`, `f139bc1` |
| D05 | Missed-Profit-Revenge — ATHOS `detectPreReentryMissedProfitRevenge` | | `0723adb` |
| D10 | Personal Edge — `selectPersonalEdge` + `PersonalEdgePanel` (sample-gated, never fabricates) | | `476cfdc`, `d980a4e` |
| F01/F02/F03/F04 (partial) | Profile Growth tab surfaces Identity + Process + Playbook context via ProcessLandscape + PersonalEdge | | `9aef63b`, `476cfdc` |

## §G-Next — Vertical slice priorities (next lands)

Sorted by (Founder importance × truth readiness × human value × implementation cost inverted):

1. **VS-1** Wire `MarketDataHealth` composed row into `/heatmaps` header — replaces the raw "◐ DELAYED" span with the truthful 4-layer row. Adopts A03/B07/B08 on a surface I already touched.
2. **VS-2** Add `Growth` tab to `/profile/page.tsx` (additive, existing tabs untouched) rendering: Identity chip → ProcessLandscape → CLC/DLAR summary → Mirror patterns. Adopts F01-F04 partially without destroying current /profile.
3. **VS-3** ATHOS silent-mode framework: a pure `selectATHOSIntervention(state, session, trader, decisionMemory)` selector that returns `NONE | ADVISORY | CAUTION` with reason. UI consumer renders only when non-NONE.
4. **VS-4** Regime + Auction State selectors (closes C06 chain: Regime → Direction → Location → Auction → Aggression → CLC → Risk → Permission → Management).
5. **VS-5** Post-Exit Integrity + Success-Rule-Bending + Missed-Profit-Revenge detectors added to `selectMirror`. Founder's live TSLA case is the seed hypothesis, marked `RESEARCH` on emission not `OBSERVED`.

## §H — Cross-referenced conversation evidence anchors

- Aug 12 TSLA session commentary → D03/D04/D05
- Aug 13 super-directive P0 audit → B01-B08
- Aug 13 whole-thread archaeology directive → this ledger
- Aug 12 UI Transformation Ledger doc → F01-F11
- Aug 12 P0 Provider Live Trace → A02/A03/A05/B01/B07/B08
- Aug 12 UI Contracts and Contradictions doc → A03/A04/A09/A11
