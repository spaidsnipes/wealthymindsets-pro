# WM Pro UI Contracts + Contradiction Audit + Selector Spec — 2026-08-12

Cycle 4 deliverable. Executes §27 (UI Contradiction Audit) + §40 (Module Contracts) + §41 (Design-token/primitive spec deferred) + §12 (Functional lenses) of the Ultimate Reconstruction directive. Read-only spec — no source, test, schema, DB, or deploy mutation. WM Pro remains NO-GO under STOP_REQUIRED.

## 0. Corrected repository truth (via `gh` real-state check)

25 PRs since 2026-08-09. All 1-23 MERGED. PR#24 OPEN. PR#25 DRAFT. Local `~/wealthymindsets-pro@55c869c` is missing merged production work from PR#10-#17 (canonical market state store/publisher, market memory foundation, quote-truth exposure). **Correction seat at `/private/tmp/wm-pr23-adoption-correction` is the canonical clone.**

- **PR#23 MERGED @ `61b20a2d…`** — fix(nectar): preserve append-only coverage memory (Vercel `dpl_91gtDvb8…` READY)
- **PR#24 OPEN @ `baa297a4…`** — fix(nectar): surface saved history when live tape is unavailable. 5 files: coverage/route.ts (+20/-2), globals.css (+9/-0), MainChart.tsx (+77/-9), sessionNectar.test.ts (+40/-0), and migration `20260811103000_wm_append_only_coverage_receipts.sql` (+137/-0). MERGEABLE, UNSTABLE state. **NOT in Drive doc chronology read to date — Sentinel-review pending.**
- **PR#25 DRAFT @ `8d49e4f8…`** — fix(data): contain provider request storms. 21 files (matches Drive P00340). MERGEABLE, UNSTABLE. Sentinel DECISION P00325 = RETURN pending 6 conditions.

## 1. Truth-state vocabulary — what already exists at the type layer

Prior cycles missed these. The vocabulary IS present; the adoption is not.

### From `src/lib/marketData/coverageMap.ts` (existing)
- `CoverageState = "CONNECTING" | "COLLECTING" | "GAPPED" | "STALE" | "UNAVAILABLE" | "REPLAY"`
- `MemoryState = "NO_MEMORY" | "SESSION_ONLY" | "SUMMARY_ONLY" | "RETAINED"`
- `MarketChannelCoverage` fields: `providerPath`, `coverageState`, `memoryState`, `persistenceRight`, `rightsPolicyId`, `observedFrom`, `observedThrough`, `lastEventAt`, `observedEventCount`, `gapCount`, `lastGapAt`, `fidelity`, `collectionScope`, `detail`

### From `src/lib/marketData/canonicalMarketState.ts` (existing)
- `MarketQualityState = "LIVE" | "DELAYED" | "STALE" | "PARTIAL" | "PROXY" | "REPLAY" | "UNAVAILABLE"`
- `MarketStateResolution = "RESOLVED" | "PARTIAL" | "UNKNOWN"`
- `MarketStateDimension = { resolution, value, confidence(0-1), evidence[], contradictions[], unknowns[] }`
- `CanonicalMarketState` dimensions: `direction`, `location`, `aggression`, `regime`, `structure`, `volatility`, `profile`, `orderFlow`
- Identity fields present: `instrumentId`, `normalizedSymbol`, `executableIdentity`, `assetClass`, `exchange`, `session`, `timeframeContext[]`
- Snapshot metadata: `snapshotId`, `capturedAt`, `availableAt` — enables freshness checks
- `sealed: true` + `deepFreeze` — immutable state

### What's MISSING at the type layer
- `PersistenceAckState = "NOT_REQUESTED" | "PENDING" | "ACKNOWLEDGED" | "FAILED" | "OFFRLINE_QUEUED" | "UNKNOWN"` (§7)
- `TruthClass = "OBSERVED" | "DERIVED" | "INFERRED" | "RECONSTRUCTED" | "STALE" | "MISSING" | "UNKNOWN"` (§8)
- Session-scoped owner identity (§6) — `MarketChannelCoverage` has `providerPath` but no `userId + sessionIdentity` yet (P00287 P0 IDENTITY CONTRACT GAP)
- `MarketStateDimension` should carry `truthClass` field to unify §8 taxonomy with existing `resolution`

## 2. UI Contradiction Audit — evidence table

Direct grep of `src/**/*.tsx` at base `61b20a2d…` for user-facing truth labels.

| # | File:line | Rendered | Bound to | Verdict | Fix direction |
|---|---|---|---|---|---|
| C1 | `src/components/chart/FootprintControls.tsx:259` | `{paused ? "PAUSED" : "LIVE"}` | Local `paused` toggle | **VIOLATION** — "LIVE" derives from pause toggle, not from `CanonicalMarketState.qualityState` or `coverage.lastEventAt` freshness | Replace with a truthful `<QualityBadge state={quality} paused={paused} />` primitive that renders `LIVE` only when `qualityState==='LIVE' && !paused`, else `PAUSED / DELAYED / STALE / UNAVAILABLE` per the actual signal. |
| C2 | `src/components/chart/MainChart.tsx:7092` | aria-label: `"...${coverageEvents} durably saved coverage observations..."` | `nectar.retentionState`, coverage count | **VIOLATION per P00286** — "durably saved" claim not gated on server ack. Text asserts durability from `observedEventCount`. | Split label into `observed` (browser side) vs `acknowledged` (server-receipt confirmed). Show "Saved N" only when `PersistenceAckState === 'ACKNOWLEDGED'`. Show "Pending" or "Local only" otherwise. |
| C3 | `src/components/chart/MainChart.tsx:7147` | `<span>Saved </span>` next to `coverageEvents` numeric | Same as C2 | **VIOLATION per P00286** | Same fix as C2. |
| C4 | `src/app/heatmaps/page.tsx:820` | `{qualityState === "DELAYED" ? "◐ DELAYED" : qualityState === "STALE" ? "! STALE" : "— UNAVAILABLE"}` | API `json.qualityState` | **HONEST** — label traces to actual API-provided quality signal. Reference implementation. | Adopt this pattern (`{qualityBadge(state)}` helper) across chart tiles. |
| C5 | `src/app/scanner/page.tsx:679` | Row-level `quoteQuality === "DELAYED"` styling | Per-row scanner quote quality (from PR#17 truthfulness pass) | **HONEST** — verified by PR#17 "expose per-row delayed and stale quote truth" | Adopt pattern. |
| C6 | `src/app/morning-prep/page.tsx:197` | `color: growthMessage.startsWith("Saved") ? "#6EE7C5" : "#FBBF24"` | Local `growthMessage` string | **LOW-RISK** — cosmetic branch on message prefix, not a truth claim | No change unless C2/C3 fix changes the message vocabulary. |

### Cross-cutting finding
- 25 files reference `LIVE` (case-insensitive). Only 1 verified violation so far. **Full sweep required**: each of the 25 hits must be classified against `CanonicalMarketState.qualityState` — this is a Cycle 5 evidence task.
- 46 files reference `Unavailable` / `unavailable` — very high hit rate. Likely mostly legit fallback text, but sample audit required.

## 3. Canonical State adoption gap (P00290 confirmed)

Consumers of `chartMarketStatePublisher` / `canonicalMarketStateStore` at base:

| Path | Role |
|---|---|
| `src/components/chart/ChartsDashboard.tsx` | **PRODUCER** — publishes state |
| `src/lib/marketData/canonicalMarketStateStore.ts` | Store impl |
| `src/lib/marketData/canonicalMarketStateStore.test.ts` | Test |
| `src/lib/marketData/publishCanonicalMarketState.ts` | Publish helper |
| `src/lib/marketData/publishCanonicalMarketState.test.ts` | Test |
| `src/lib/marketData/chartMarketStatePublisher.test.ts` | Test |

**Zero non-test UI READ consumers.** MainChart, StockInfoPanel, DOMPanel, WMSessionVP, WatchlistPanel, TickerTape all subscribe to `useWebSocket` directly and construct their own view state. Per §5, the actual product must consume Canonical Market State. This is the **single highest-leverage UI transformation** — every subsequent module contract below points to this store as its data source.

## 4. Module Contracts (§40 — 13-question template)

Each answers: PURPOSE / USER QUESTION / DATA SOURCE / TRUTH CLASS / CANONICAL STATE DEPENDENCY / USER INPUT / INTERACTION / DEGRADED STATE / MOBILE / ACCESSIBILITY / PERFORMANCE / EVIDENCE / TESTS.

### 4.1 MIRROR (Process Score)

- **Purpose**: reflect trader process quality across dimensions independent of P&L.
- **User question**: "Am I operating with discipline right now, and where am I drifting?"
- **Data source**: journal entries (existing `src/app/journal/`), decision-memory ledger (deferred), rule-adherence checklist state (client), self-reported emotional state (client input).
- **Truth class**: DERIVED (from journal + adherence inputs); INFERRED for aggregate score. Sub-scores each carry their own class.
- **Canonical State dependency**: reads `session` for scoping only. Does NOT depend on live market data.
- **User input**: rule-adherence toggles per trade close, emotional state self-report (0-10 scales).
- **Interaction**: hover a sub-score → evidence rows for last N trades; click → jump to journal.
- **Degraded state**: if <5 trades in window → `UNKNOWN` with "Not enough evidence yet." Not "0/100."
- **Mobile**: hero ring collapses to a horizontal 4-bar sub-score row; single tap opens sub-score sheet.
- **Accessibility**: `role="meter"` on ring with `aria-valuenow / aria-valuemin / aria-valuemax`. Sub-scores keyboard-reachable in order.
- **Performance**: pure client compute over persisted journal rows. Debounce recompute to 250ms on rule-adherence input.
- **Evidence**: ring value + timestamp of last journal entry + N trades in window. On-demand evidence sheet lists per-trade contribution.
- **Tests**: score-compute pure fn tests; empty-window UNKNOWN test; sub-score ordering; a11y meter tests.

### 4.2 OPENING BELL (Preparation)

- **Purpose**: present pre-market evidence so the trader chooses readiness — do not command readiness.
- **User question**: "What's the market about to do, what's my capacity, and am I actually prepared?"
- **Data source**: economic calendar (existing `src/app/api/news-rss/`), overnight session `CanonicalMarketState`, Available R (§4.5), Steward State (§4.4), user checklist state.
- **Truth class**: mix — OBSERVED (calendar events, overnight print), DERIVED (readiness composite), INFERRED (session context).
- **Canonical State dependency**: subscribes to `CanonicalMarketState.session`, `structure`, `volatility` dimensions for overnight-print context.
- **User input**: 5-item checklist (Alignment, Risk lock, Capital plan, Emotional neutrality, Market structure) — each explicit user acknowledgement; countdown to session open.
- **Interaction**: check items → gold hairline lights; "I'm Ready" button emits a session-preparedness event to the journal, not a start-trading enable.
- **Degraded state**: if any Canonical State dimension is `UNKNOWN` → readiness surface shows "Cannot confirm — data incomplete." No "READY" green light.
- **Mobile**: vertical checklist + hero clock + I'm Ready button; no chart preview.
- **Accessibility**: each checklist item is a real `<button role="checkbox" aria-checked>`.
- **Performance**: no live data — RSS + one snapshot subscribe.
- **Evidence**: each check timestamps to the journal; readiness composite links to inputs.
- **Tests**: composite UNKNOWN when any input UNKNOWN; a11y checkbox pattern; keyboard traversal.

### 4.3 STORY RIBBON

- **Purpose**: narrate evidence-backed market progression across nested market phases (§15).
- **User question**: "Where is the market in its own story right now, and what evidence supports that reading?"
- **Data source**: **`CanonicalMarketState`** (all 8 dimensions) + rolling window of last N snapshots for chapter-transition detection.
- **Truth class**: each chapter carries its own class. Active chapter = `INFERRED` (from evidence). Prior chapters = `DERIVED` (deterministic reduction of past snapshots).
- **Canonical State dependency**: **critical** — the Story Ribbon becomes the first real UI consumer of the store, resolving P00290. It reads `direction`, `location`, `aggression`, `regime`, `structure` dimensions.
- **User input**: click a chapter icon → expand chapter evidence.
- **Interaction**: sequential glow left→right as evidence accumulates; hover → tooltip with `evidence[]` refs; click → evidence inspector.
- **Degraded state**: if any consumed dimension `resolution === 'UNKNOWN'` → active chapter shown as `UNKNOWN` glyph, not skipped or fabricated.
- **Mobile**: horizontally-scrolling chapter strip with snap; active chapter is centered on load.
- **Accessibility**: `role="tablist"` for chapters, active chapter is `aria-current="step"`, tooltip becomes a bottom-sheet on touch.
- **Performance**: subscribe to store, memoize chapter derivation per snapshot ID.
- **Evidence**: each chapter cites the specific `MarketStateEvidenceRef[]` that put it in that state.
- **Tests**: chapter-derivation pure fn tests; UNKNOWN preserved through unknown-dimension inputs; evidence-ref click opens inspector.

### 4.4 STEWARD STATE

- **Purpose**: answer "is the trader operating inside the plan?" using observable behavior + self-report (§18).
- **User question**: "Am I on the plan or drifting? What are the leading indicators?"
- **Data source**: session's realized R vs budget, rule-adherence stream (§4.1), time-since-last-loss, self-reported urgency (input).
- **Truth class**: DERIVED (composite %). Sub-signals: OBSERVED (R spent, rule violations), DERIVED (drift score).
- **Canonical State dependency**: reads `CanonicalMarketState.session` for scoping.
- **User input**: none required for base display; optional urgency 0-10.
- **Interaction**: click a sub-metric → drill to journal/position that contributed.
- **Degraded state**: no completed trades → `UNKNOWN` with "Pending first close." Do not display 100% "OPTIMAL" by default.
- **Mobile**: compact 2-row card; sub-metrics collapse behind chevron.
- **Accessibility**: composite % is `role="meter"`; status pill uses `aria-label` with reason.
- **Performance**: recompute on trade close event only.
- **Evidence**: last 3 rule violations + last 3 wins/losses timestamped.
- **Tests**: UNKNOWN when zero trades; composite math (weighted); status pill boundary (Optimal ≥85, Aligned ≥70, Drifting ≥50, Off-plan <50).

### 4.5 AVAILABLE R

- **Purpose**: expose legitimate structural risk capacity (§19) — sequence: THESIS → STRUCTURAL INVALIDATION → STOP DISTANCE → REALISTIC CLEAN REWARD SPACE → COST / LIQUIDITY / SPREAD → AVAILABLE R.
- **User question**: "How much R can I actually make on this thesis without shrinking my stop?"
- **Data source**: user's active thesis (input), `CanonicalMarketState.structure` (invalidation levels), `location` (nearest clean reward level), `orderFlow` (spread/liquidity cost), account equity + risk-per-trade setting.
- **Truth class**: DERIVED when all inputs resolved; INFERRED when reward space is model-guessed; **UNKNOWN when any input UNKNOWN** — do NOT display a false R number.
- **Canonical State dependency**: reads `structure`, `location`, `orderFlow`, `volatility` dimensions + coverage freshness.
- **User input**: thesis direction (Long/Short), optional manual invalidation override, risk-per-trade %.
- **Interaction**: hover R gauge → breakdown (stop distance, reward space, cost); adjust risk-per-trade → gauge updates.
- **Degraded state**: if any input UNKNOWN → gauge shows `?` glyph + text "Cannot compute — <dimension> unknown"; NEVER a default number.
- **Mobile**: gauge + one-line explanation; breakdown behind tap.
- **Accessibility**: `role="meter"` with min=0, max=maxR; unknown state announces "R unavailable, <reason>."
- **Performance**: recompute on Canonical State snapshot change or input change; debounce to 100ms.
- **Evidence**: each breakdown line cites its `MarketStateEvidenceRef` or user input.
- **Tests**: UNKNOWN propagation; refuses to shrink stop; cost/spread inclusion.

### 4.6 CLC (Confluence · Alignment · Catalyst)

- **Purpose**: probability signal composed from three orthogonal evidence axes.
- **User question**: "Do multiple lenses of evidence agree, and is there a live catalyst?"
- **Data source**: `CanonicalMarketState` dimensions — Confluence (count of `resolution==='RESOLVED'` dimensions), Alignment (agreement direction of resolved dimensions), Catalyst (recent `MarketStateEvidenceRef` count above threshold).
- **Truth class**: DERIVED (composite %); each axis derived from evidence counts.
- **Canonical State dependency**: reads all 8 dimensions.
- **User input**: none.
- **Interaction**: hover axis pill → list of resolved/unknown dimensions contributing.
- **Degraded state**: if <3 dimensions RESOLVED → CLC = UNKNOWN + "Insufficient dimensions."
- **Mobile**: 3 stacked axis pills + composite %.
- **Accessibility**: each axis has independent status pill with aria-label.
- **Performance**: pure derivation over snapshot; memoize.
- **Evidence**: hover each axis shows which dimensions counted.
- **Tests**: axis math; UNKNOWN threshold; contradictions[] surfaces as an axis penalty.

## 5. Selector / View-Model Spec (Gate 2)

Each module contract above consumes ONE dedicated read-only selector over `CanonicalMarketState`. Selectors are pure functions in `src/lib/marketData/viewModels/`. **Zero component may `useWebSocket` directly** — subscribe via selector.

```
selectMirrorInputs(journal, adherence) → MirrorInputs      // no market state
selectOpeningBellReadiness(state, checklist) → OpeningBellVM
selectStoryChapters(stateHistory[], lastN) → StoryVM       // FIRST canonical consumer
selectStewardState(session, trades, urgency?) → StewardVM
selectAvailableR(state, thesis, riskPct) → AvailableRVM    // UNKNOWN-propagating
selectCLC(state) → CLCVM                                    // pure derivation
```

Each VM's shape includes `{ resolution: 'RESOLVED'|'PARTIAL'|'UNKNOWN', ...values, evidence: MarketStateEvidenceRef[], reason?: string }` — so components can render UNKNOWN honestly without inventing values.

Selector implementation notes:
- **Pure** — no I/O, no side effects, testable in isolation.
- Bind identity via passed-in `{ userId, sessionIdentity }` — never global.
- Return **frozen** objects.
- Any input `null / undefined / UNKNOWN` → output `resolution: 'UNKNOWN'` with `reason` string. No default zeros.

## 6. Primitive Contracts (Gate 2 — deferred implementation)

Design tokens + primitives from Cycle 3's ledger, now specified with data contracts (not just visual):

| Primitive | Props (data-first) | Renders |
|---|---|---|
| `<Panel>` | `label, sublabel?, halo? = false` | Standard obsidian glass surface with gold hairline |
| `<HeroNumber>` | `value: number \| 'UNKNOWN', unit?, gradient? = false` | Renders `?` glyph when UNKNOWN |
| `<Ring value, max, resolution, ariaLabel />` | Ring gauge; unknown-state rendering when resolution=UNKNOWN |
| `<Ribbon chapters[], activeIndex, evidence[] />` | Story Ribbon strip; each chapter is a real element |
| `<Pill state, label, ariaLabel? />` | `state: 'confirmed'\|'aligned'\|'warn'\|'unknown'\|'degraded'` |
| `<TruthBadge truthClass, freshnessMs? />` | Renders §8 taxonomy label + freshness age |
| `<PersistenceBadge ackState, count? />` | Renders §7 PersistenceAckState label; "Saved N" ONLY when ACKNOWLEDGED |
| `<EvidenceRow evidence: MarketStateEvidenceRef />` | Time · source · fidelity · basis one-liner |
| `<DegradedState reason, dimension? />` | Standardized rendering for UNKNOWN / GAPPED / STALE with reason |
| `<QualityBadge state: MarketQualityState />` | Wraps LIVE/DELAYED/STALE/PARTIAL/PROXY/REPLAY/UNAVAILABLE with the coverageMap.ts vocabulary |
| `<Metric label, value, unit?, resolution />` | Data-cell for tables/rows; UNKNOWN-safe |
| `<Inspector title, sections[] />` | Bottom-sheet or right-rail for evidence drill-down |
| `<BottomSheet />`, `<Dock />` | Responsive containers |

Notes:
- Every primitive MUST accept a `resolution` or `state` prop with an explicit UNKNOWN branch. **No primitive may render a number without knowing it's real.**
- No primitive hard-codes content — all data flows from selectors.

## 7. Exact next-owner sequence (chain, do not stop)

Executing §32 anti-stall + §49 loop:

- **Next now** (this session, remaining safe read-only work under STOP_REQUIRED): sweep the remaining 24 `LIVE`-token file hits (audit Cycle 5a); classify each against `CanonicalMarketState.qualityState` or `!paused` derivation; produce a per-file contradiction receipt.
- **After 5a**: draft `PersistenceAckState` + `TruthClass` type additions in a spec doc (not source) so PR#26 has a manifest waiting.
- **After spec**: reconcile PR#24 vs PR#25 vs correction seat's V2 manifest — three-way overlap map; Sentinel needs this before any adoption.
- **Founder-gated**: capacity ≥ 2 GiB unblocks PR authoring; Chrome MCP pairing unblocks visual verification of the artifact + any built primitives.

## 8. Baton addendum

- Repo truth: correction seat (canonical clone), 25 PRs merged/open/draft, PR#24 newly discovered.
- Truth vocabulary types EXIST in `coverageMap.ts` and `canonicalMarketState.ts`; UI adoption is the gap.
- Capacity: 484 MiB (deepening). STOP_REQUIRED. `gh` CLI functional.
- Founder BTC tab / Nectar / user work / worktrees / quarantine `2f03f965` all preserved.

**MISSION STATUS = ACTIVE / CONTINUATION REQUIRED / WM NO-GO.**

---

## 9. Cycle 5a completion — LIVE label sweep (append-only)

Traced all 6 unique JSX `LIVE` label sites at base `61b20a2d…`. Prior "25 file hits" was a file-count artifact; actual user-facing render sites = 6.

| # | File:line | Rendered when | Verdict |
|---|---|---|---|
| L1 | `src/components/chart/FootprintControls.tsx:259` | `!paused` | **VIOLATION** (already logged as C1) |
| L2 | `src/components/chart/MainChart.tsx:6928` | `status.live === true` | **HONEST — reference-correct**. Adjacent title attribute: `"...live ticks flowing" : " · no real-time candle claim"`. Adjacent branches: NO FEED (red) when `noFeed`, amber `{status.label} · LAST {lastStr}` when has data but not live. Adopt this pattern. |
| L3 | `src/components/chart/OptionsChain.tsx:173` | `dataSource === "fmp"` | **VIOLATION (new, C7)** — provider identity used as freshness proxy. FMP can be rate-limited or stale but label reads LIVE. Fix: gate on freshness signal from the same layer that `heatmaps/page.tsx` uses. |
| L4 | `src/app/radio/page.tsx:264` | `station.live` | **HONEST** — station-level truth signal. |
| L5 | `src/app/radio/page.tsx:553` | `playing && now.type === "station"` | **HONEST** — playing AND streaming a live station. |
| L6 | `src/components/lounge/LiveRoom.tsx:506` | *(always renders)* | **MINOR VIOLATION (new, C8)** — LIVE badge renders whenever room exists, but adjacent comment says "Share is available … even before/while going live." Fix: gate on actual broadcast/participant state, or rename to `ROOM` until first stream starts. |

Additionally: `src/app/tv/page.tsx` uses `kind === "live"` internally but its user-facing label reads `READY` (line 257) with an explicit comment "no fake 'live' until someone goes on air" (line 360) — **team already has the discipline pattern**.

**Real UI contradiction inventory (final)**: 4 violations (C1, C2, C3, C7) + 1 minor (C8) + 3 reference-correct implementations to promote to a shared `<QualityBadge>` primitive.

## 10. Cycle 5b — PR#24 / PR#25 / correction three-way overlap (via `gh api`)

PR#24 (`baa297a4`, 5 files) × PR#25 (`8d49e4f8`, 21 files) × correction seat (`5158994`, 5 files) — all three based on `61b20a2d…`.

| Path | PR#24 | PR#25 | Correction |
|---|---|---|---|
| `src/app/api/market-memory/coverage/route.ts` | MOD +20/-2 | — | — |
| `src/app/globals.css` | MOD +9/-0 | — | — |
| `src/components/chart/MainChart.tsx` | MOD +77/-9 | MOD +4/-4 | — |
| `src/lib/marketData/sessionNectar.test.ts` | MOD +40/-0 | MOD +27/-0 | — |
| `supabase/migrations/20260811103000_wm_append_only_coverage_receipts.sql` | ADD +137/-0 | — | — |
| `src/app/api/alpaca/route.ts` | — | MOD +115/-23 | — |
| `src/app/api/market-memory/gaps/route.ts` | — | ADD +61/-0 | — |
| `src/components/chart/WatchlistPanel.tsx` | — | MOD +23/-9 | — |
| `src/components/layout/TickerTape.tsx` | — | MOD +25/-10 | — |
| `src/hooks/useWebSocket.ts` | — | MOD +14/-4 | — |
| `src/lib/marketData/alpacaClient.{ts,test.ts}` | — | ADD +105 / +40 | — |
| `src/lib/marketData/clientRequestCoalescer.{ts,test.ts}` | — | ADD +73 / +76 | — |
| `src/lib/marketData/coverageMap.ts` | — | MOD +19/-0 | — |
| `src/lib/marketData/operationalGapContract.{ts,test.ts}` | — | ADD +75 / +45 | — |
| `src/lib/marketData/operationalGapReporter.{ts,test.ts}` | — | ADD +124 / +52 | — |
| `src/lib/marketData/providerRequestGovernor.{ts,test.ts}` | — | ADD +163 / +126 | — |
| `src/lib/marketData/sessionNectar.ts` | — | MOD +83/-1 | — |
| `src/lib/marketTruthSurface.test.ts` | — | MOD +2/-2 | — |
| `supabase/migrations/20260811230000_wm_market_operational_gaps.sql` | — | ADD +156/-0 | — |
| `docs/operations/NECTAR_PR23_ADOPTION_CORRECTION.md` | — | — | ADD |
| `src/app/api/market-memory/coverage.route.test.ts` | — | — | ADD |
| `src/lib/marketData/coverageServerPersistence.test.ts` | — | — | ADD |
| `src/lib/marketData/metadataExport.test.ts` | — | — | ADD |
| `src/lib/marketData/observationPersistence.test.ts` | — | — | ADD |

### Collisions

- **PR#24 ∩ PR#25** = `src/components/chart/MainChart.tsx` (both modify) + `src/lib/marketData/sessionNectar.test.ts` (both modify). **2-file collision** — Sentinel must sequence: adopt PR#25 first (larger, foundational transport work), then reconcile PR#24's coverage-route + globals.css + MainChart.tsx additions manually against PR#25's MainChart.tsx edits, then run PR#24's migration (`20260811103000_...sql`).
- **PR#24 ∩ Correction** = ∅
- **PR#25 ∩ Correction** = ∅ literal (correction's 5 paths are all ADDs, PR#25 has zero of them). **However Drive P00371 warned of an "effective-lineage collision"** through stale-main inheritance of `observationPersistence.test.ts` — that concern applies when correction is compared through the stale local main `55c869c`, NOT when directly onto `61b20a2d…`. Since correction seat's base IS `61b20a2d…`, the effective-lineage collision does NOT apply here.

### Migration ordering (Sentinel gate)

Two additive migrations in flight: PR#24's `20260811103000_wm_append_only_coverage_receipts.sql` (137 lines) + PR#25's `20260811230000_wm_market_operational_gaps.sql` (156 lines). Timestamp ordering places `_receipts` before `_gaps`. Both are additive — no rollback of the other required. **However neither has been applied to Supabase** per Drive P00214/P00411. The append-only receipts table is what PR#23 shipped in-code but the migration was never run (per commit `52abce2`'s message "WM Pro migrations do not auto-apply"). If PR#24 lands, the receipts table finally materializes — and only THEN does PR#23's live behavior actually engage.

### Founder decision required

Sequence recommendation for post-capacity Sentinel APPROVE:
1. **Merge PR#25 first** (foundational transport containment, no schema dep beyond gap table).
2. **Apply migration `20260811230000_wm_market_operational_gaps.sql`** manually via `supabase db push`.
3. **Merge PR#24 next** — resolve MainChart.tsx + sessionNectar.test.ts collision by hand-reconciling against PR#25's already-landed diffs.
4. **Apply migration `20260811103000_wm_append_only_coverage_receipts.sql`** (its timestamp is earlier but ordering doesn't matter — both are additive; running _receipts second still works).
5. **Rebase correction seat** onto the new HEAD, run its 4 focused test files, then bring under a fresh Sentinel APPROVE for the smallest-possible correction contract (P00151 five gates).

### Cycle 5b receipt

- All PR states verified live via `gh pr view` (repo `spaidsnipes/wealthymindsets-pro`, account `spaidsnipes`, token scopes: repo/workflow/gist/read:org).
- No pushes, no merges, no branch cuts, no deploy, no DB mutation performed.
- Capacity at time of check: 484 MiB, deepening. STOP_REQUIRED holds.

**MISSION STATUS unchanged: ACTIVE / CONTINUATION REQUIRED / WM NO-GO.**

---

## 11. Cycle 5c — PR#24 diff reveals P00286 defect EXPANSION (append-only)

Cross-checked PR#24's MainChart.tsx diff (+77/-9) against my Cycle 4 C2/C3 findings. **PR#24 does not fix the "Saved" overclaim — it extends it.**

### Exact diff evidence

Chip label change:
```diff
-              {coverageEvents > s.tradeCount && (
+              {coverageEvents > 0 && (
                 <span>
-                  <span style={{ color: "#8B92AC", fontWeight: 600 }}>Seen </span>
+                  <span style={{ color: "#8B92AC", fontWeight: 600 }}>Saved </span>
                   <span style={{ color: "#D8DCEA", fontWeight: 850 }}>{coverageEvents}</span>
```

Aria-label change:
```diff
-              aria-label={`Current tab tape counters ... ${coverageEvents} coverage receipts. ${s.bigTradeCount} large trades. ${gapCount} gaps. ...`}
+              aria-label={`Nectar memory for ${normalizeSym(symbol)}. ... ${coverageEvents} durably saved coverage observations. ...`}
```

New second aria-label for saved-history overlay:
```diff
+              aria-label={`Nectar saved history for ${normalizeSym(symbol)}. ${savedCount} server-durable coverage observations from a prior ${priorFidelity.toLowerCase()} tape session. Current live tape is unavailable. Raw trade payloads were not retained, so historical footprints cannot be reconstructed.`}
```

### Sentinel disposition

- Chip renamed `"Seen"` → `"Saved"` and render gate widened from `> tradeCount` → `> 0`. Under `SESSION_ONLY_NO_RAW_PAYLOADS` retention (a real retention state defined at MainChart.tsx:7079), `coverageEvents` is NOT proven acknowledged by the server receipt ledger. Chip therefore over-claims durability. **This is the same defect Drive P00286 already returned as P0 TRUTH DEFECT — "SAVED" OVERCLAIM. PR#24 codifies it into the label vocabulary rather than fixing it.**
- Silver lining — PR#24 DOES introduce an acknowledgement signal at the coverage route: `checkpointSaved: true` and `appended` count are returned from the append-only RPC. So the data to gate the label EXISTS. The UI just doesn't consume it. Fix is small: thread `appended`/`checkpointSaved` back through the Nectar hook, gate the chip on `ack.status === 'ACKNOWLEDGED'`, otherwise render `"Local N"` or `"Pending N"`.
- New "Nectar saved history" overlay (lines 7092-region ADD) inherits the same defect — it says "server-durable coverage observations" but at render time the app only knows `savedCount` was hydrated from the API response, not that it reflects an acknowledged receipt of the *current* session's observations.

### Recommended Sentinel action

**Sentinel should RETURN PR#24 with one bounded correction ask**: gate every user-facing "Saved" / "durably saved" / "server-durable" label on the `checkpointSaved && appended === expectedCount` acknowledgement signal PR#24 already introduces at the coverage route. Every non-acknowledged coverage event renders as `"Local"` or `"Pending"` instead — same visible field, honest word. No new component required; ~10-15 lines around lines 7092/7147/new-overlay in MainChart.tsx.

## 12. Cycle 5c also — PR#25 canonical-state adoption check

`gh pr diff 25 | grep -c canonicalMarketState|chartMarketStatePublisher` = **0**. PR#25's 21 files are pure transport/coalescing/governor/gap-contract work; no file becomes a first UI consumer of `canonicalMarketStateStore`. **P00290 gap remains unresolved by either open PR.**

The Story Ribbon module contract in §4.3 above therefore remains the smallest, highest-leverage change that would close P00290 by making the Ribbon the first real UI consumer of the store.

## 13. Cycle 5c receipt

- Zero source/schema/test/deploy mutation.
- Founder BTC tab, all worktrees, quarantine `2f03f965`, credentials, PR objects — preserved.
- Capacity 478 MiB, deepening. STOP_REQUIRED holds.
- Real GitHub state re-verified this cycle: PRs #1-#25, no #26+ yet.

**MISSION STATUS = ACTIVE / CONTINUATION REQUIRED / WM NO-GO.**

---

## 14. Cycle 6 — Drive chronology P00431-P00566 reconciliation (append-only)

Unread section of the Nectar authority doc read this cycle. Multiple prior-Sentinel decisions found that CONFIRM or SUPERSEDE my earlier proposals.

### Confirmations
- **P00494** — exactly 10 useWebSocket consumers (matches Cycle 3+5a). A source comment claiming 11 was RETURNED as unsourced.
- **P00477** — Cycle 5b PR#25 × correction overlap is correct: `observationPersistence.test.ts` is correction's only base-existing modification, NOT in PR#25's 21-path diff. Zero literal collision.

### Corrections to my earlier proposals
- **P00495 DOMPanel** — owns a **separate direct Kraken WebSocket outside useWebSocket**. My Cycle 5a "10 useWebSocket consumers = complete provider surface" framing was incomplete. Real transport ledger = 10 useWebSocket + DOMPanel Kraken (1 separate) + alpaca-stream/route.ts (0 consumers, intentionally frozen). This is why DOMPanel is V2-FROZEN.
- **P00496** — `alpaca-stream/route.ts` intentionally FROZEN as "no consumer" but must be proven by static-reference receipt.
- **P00528** — PR#25 has **2 failing Vercel contexts**. My Cycle 5b treated mergeability=true as positive; Sentinel says "Mergeability metadata alone is not test or deployment PASS." My migration-sequencing proposal implicitly assumed PR#25 was greenlight-ready; it's not.

### Blocking DB architecture finding — SUPERSEDES my Cycle 5b migration ordering
- **P00548-P00566**: The `20260812030000_wm_market_coverage_identity_v2.sql` migration (ADD in V2 manifest) is NOT a simple additive column change. v1 PK = `(owner_id, instrument_id, channel, provider_path)`. V2 needs `(userId, canonicalSymbol, timeframe, providerPath, eventChannel, sessionIdentity)`. Sentinel enumerates the trilemma:
  1. Add columns, keep old PK → still collapses identities across timeframe/session (identity leakage remains)
  2. Replace/drop old PK → invalidates v1 RPC `ON CONFLICT` target; breaks clean code-only rollback
  3. Keep old unique constraint → prevents required v2 multiplicity
- **Correct pattern**: shadow-table additive (v2 identity in new table, v1 preserved as compatibility, dual-write, v1 read-only cutover) — NOT a single migration. My Cycle 5b "step 2/4 apply the migrations" was fine for the two truly-additive tables (`_receipts`, `_gaps`), but **v2-identity requires re-designing the migration itself before any execution attempt.**

### Sentinel-mandated test paths (P00500-P00507) all already in V2 61-entry manifest
- `src/hooks/useWebSocket.test.ts` — V2 P00736 ADD ✓
- `src/contexts/AuthContext.test.tsx` — V2 P00732 ADD ✓
- `src/contexts/SymbolContext.test.tsx` — V2 P00734 ADD ✓
- `tests/nectar-reconciliation-runtime.mjs` — V2 P00769 ADD ✓

Reinforces that V2 manifest is complete on the test-expansion axis.

### Cycle 6 receipt

- Zero source/schema/test/deploy mutation.
- Founder BTC tab and all preserved state untouched.
- `gh` API rate-limited (5000/hr); reads pivoted to already-in-flight Drive text.
- Capacity 475 MiB. STOP_REQUIRED holds.
- Drive doc read through ~line 1710 of 2408 — remaining P00567-P00798 (~700 lines) still unread for future cycles.
- Baton [ATHOS_BATON_2026-08-11.md](ATHOS_BATON_2026-08-11.md) has been supersede-appended twice this session (Cycle 2 + Cycle 4). If either supersession got clobbered by a duplicate-anchor edit, all controlling facts are still preserved across this audit doc + [TRUTH_STATE_TYPE_ADDITIONS_SPEC_2026-08-12.md](TRUTH_STATE_TYPE_ADDITIONS_SPEC_2026-08-12.md) + [UI_TRANSFORMATION_LEDGER_2026-08-12.md](UI_TRANSFORMATION_LEDGER_2026-08-12.md) + memory `wm-pro-nectar-v2-truth-2026-08-12.md`.

**MISSION STATUS = ACTIVE / CONTINUATION REQUIRED / WM NO-GO.**
