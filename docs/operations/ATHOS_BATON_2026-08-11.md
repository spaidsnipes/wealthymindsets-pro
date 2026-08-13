# ATHOS SUPER-TEAM BATON — 2026-08-11

Compact, durable Execution State for the next continuation cycle.
Read this first. Do not redo full archaeology.

## MISSION STATUS
**ACTIVE / CONTINUATION REQUIRED.** WM Pro one-thread mode (per founder directive 2026-08-08). WM Pro remains **NO-GO / no push** until independent current-SHA closure per user memory.

## HARD ENVIRONMENT FACTS (measured this cycle, 2026-08-11 23:5x local)
- **Disk: ~630 MiB free** on `/System/Volumes/Data`. **STOP_REQUIRED tripped** (<1 GiB). Threshold to resume install/build/test/server/deploy: **fresh ≥2 GiB receipt + separate Sentinel approval.** Read-only architecture/Drive/GitHub/UI/contract/evidence/sequencing work is authorized.
- **Repo path:** `~/wealthymindsets-pro` (git). **Branch:** `main`. **HEAD:** `55c869c` (2026-08-10 22:08). **Working tree:** clean apart from `tsconfig.tsbuildinfo` (noise). **`origin/main..HEAD` = empty** — nothing unpushed.
- **Dreamboard:** `~/dreamboard`. Branch `feature/project-memory-health`, HEAD `f5f78ac` (2026-08-03). **6 untracked items** now: `app/memory.tsx`, `docs/DB-P0-002-CONTRACTS.md`, `docs/DB-P0-002B-IDENTITY-DECOUPLE.md`, `docs/research/`, `lib/creative-health.ts`, `supabase/dreamboard-project-memory.sql`. (Superseded finding from 2026-07-28 memory that said "4 untracked" — now 6.)
- **New folder tonight:** `~/wm-doc-bridge/wm-functional-ui-contract-prewrite/` (empty scaffold, not a git repo, created 2026-08-11 23:06 local).

## SENTINEL CORRECTION REQUIRED — mission-text assertions that do not verify
1. **Task `019ff368-8556-73c3-bb9a-2ef614e133ba` does not exist.** TaskGet → "Task not found". No prior baton in the task store. This baton file *is* the replacement.
2. **Prod SHA `61b20a2d54880ddf665c67d8d0f1778561f842bb` does not exist in the local repo.** `git log 61b20a2d…` → "fatal: bad object". Either it is a Vercel deployment identifier only (Vercel synthesizes its own SHAs for build artifacts) OR the mission text inherits stale prior-session state. **Do not treat as canonical WM Pro source SHA.** Verify against Vercel dashboard or `vercel inspect dpl_91gtDvb8NDii5hQvViMTaV2WFC73` before acting on it.
3. **V2 contract manifest (61 entries, SHA-256 `e5dc47a07924795e04b6e690fb7d5adec4ff8ff554283f757f0d23fc63b62ad8`) is not at any repo root.** `find ~/wealthymindsets-pro -maxdepth 4 -name '*contract-manifest*'` → 0 hits. May live in Drive (canonical Nectar authority doc `16D4tHgprUu…`) or in `wm-doc-bridge/wm-functional-ui-contract-prewrite/` (currently empty). Do not cite it as a repo artifact until located.
4. **Hive/Nectar/Market Memory research PDF is not readable in this session.** `/Users/dspaidnoosleep/Downloads/WM Pro Hive_Nectar_Market Memory Implementation Research Report.pdf` uses CID fonts / image glyphs. Raw stream text extraction yielded blank. Poppler not installed and STOP_REQUIRED blocks install. **Founder must supply extracted text, an .md/.docx export, or unblock disk for `brew install poppler`.**

## RECENT SUBSTANTIVE WORK ON `main` (last 12 commits, all 2026-08-10)
- `55c869c` docs(ops): late-evening session — observedFrom regression confirmed + first-seen defense shipped
- `52abce2` feat(nectar): **immutable first-seen ledger — observed_from never regresses** (INSERT-ONLY table `wm_market_coverage_first_seen`, populated by trigger on checkpoint INSERT/UPDATE; read path returns `LEAST(checkpoint.observed_from, first_seen.observed_from)`)
- `a8853c2` feat(dev): `/api/dev/coverage-inspect` diagnostic
- `9b67b6d` fix(chart): intraday timeframes fit full loaded session on load
- `422f556` feat(market-state): pure producer for CanonicalMarketState snapshots
- `fdcec8d` feat(rights): capability rights registry v2 — per-action fail-closed gate
- `b4691a4` fix(nectar): ingest equity/relay trades so TSLA/AAPL get Nectar coverage
- `8d0c59e` / `098a283` / `aa268e2` — three "stop fabricating" truthfulness fixes (fake day-change, fake 0.00 index quotes, fake header change)

Consistent with user memory "Truthfulness pass + restores" (2026-07-20) — team is actively removing fake data and re-wiring honest components.

## LOAD-BEARING BLOCKERS (in order)
1. **CAP-BLOCK-01 — Disk STOP_REQUIRED.** Cannot install, build, test, run server, or deploy. Any Track A (UI) or Track B (infra) work that touches the runtime is halted. **Owner: Founder** (authorize a read-only capacity-classification pass OR clear space). Safe read-only work continues in parallel.
2. **NECTAR-MIG-01 — first-seen ledger migration not applied.** Commit `52abce2` message: *"WM Pro migrations do not auto-apply. Founder must run `supabase db push` or apply via dashboard for the guard to activate. Until then, the GET route falls through to checkpoint-only values (unchanged behavior)."* Until applied, the observed_from regression defense is dormant. **Owner: Founder** (Supabase migration is founder-mutation gated).
3. **CONTRACT-MANIFEST-LOC — 61-entry V2 manifest location unverified.** Cannot check drift against `e5dc47a…` until the source file is located (Drive doc, wm-doc-bridge, or elsewhere). **Owner: Nehemiah** (Drive+repo search next cycle).
4. **PROD-SHA-RECONCILE — `61b20a2d…` unresolved.** Need Vercel deployment-inspect confirmation of what source SHA `dpl_91gtDvb8NDii5hQvViMTaV2WFC73` was actually built from. **Owner: Sentinel** (read-only Vercel check next cycle).
5. **HIVE-NECTAR-PDF unreadable in this environment.** **Owner: Founder** (supply text export OR authorize disk-freeing for poppler install).

## PRESERVATION LOCKS (NEVER violate)
- **Founder BTC Chrome tab: exact preservation.** No refresh, no symbol switch, no click, no storage inspection, no trade, no mutation. Post-fix visual checks use a *separate controlled tab only after Sentinel approval.*
- No delete/move/compress/mount/open of user files without exact founder authority.
- No push, no deploy, no DB mutation, no brokerage, no credentials, no auth/email, no provider mutation, no unknown-prompt acceptance without separate explicit authority.
- Quarantine `2f03f965` preserved. TSLA/BTC/Nectar evidence preserved. Repos/worktrees/Drive chronology preserved.

## NEXT HIGHEST-LEVERAGE SAFE ITEMS (in order)
Each is fully executable under current STOP_REQUIRED + no-push constraints.

1. **NEHEMIAH/SENTINEL — Locate the V2 contract manifest.** Search `wm-doc-bridge/wm-functional-ui-contract-prewrite/` (empty tonight — is founder pre-writing it there?), then Drive canonical Nectar authority doc `16D4tHgprUu_Dr_ACqFuingz7GSKHjKytrmNagpdyDB8`, then repo full tree beyond depth-4. Recompute SHA-256 when found. Reconcile against claimed `e5dc47a…`.
2. **NOAH — UI collision + duplication audit (read-only).** Per founder priority list: enumerate every place that (a) constructs its own Market State, (b) resolves Nectar independently, (c) polls providers independently, (d) computes observed/derived/inferred/stale/missing/unknown states. Produce a duplication ledger under `docs/architecture/UI_COLLISION_AUDIT_2026-08-11.md`. No code changes.
3. **MICAH — Progressive-disclosure + one-second-hero-truth inventory (read-only).** For each top-level route in `app/` (chart, watchlist, journal, tape, etc.): note the current dominant truth, the current secondary evidence layer, and where truth is currently obscured or fabricated. Produce `docs/experience/HERO_TRUTH_INVENTORY_2026-08-11.md`. No CSS/component changes.
4. **FORGE — Evidence-inspector / WHY-trail scaffold plan (paper only).** Design the data shape and mount points; do not write component code. Output to `docs/architecture/EVIDENCE_INSPECTOR_PLAN.md`.
5. **CALEB — Baseline capture.** Screenshot the current production surface via *separate controlled tab* (Chrome MCP is available; **not the founder's BTC tab**). Capture desktop 1280 / tablet 834 / mobile 390. Store in scratchpad. Required baseline for the "compare visually" gate.
6. **ATLAS — Same-day Drive publish** of this baton + any items above that complete. Per memory "Atlas owns Drive sync."

**All six are collision-safe with Track B (infra) since none of them mutate the runtime, DB, or CI.**

## EXACT NEXT ACTION (single-line handoff)
> **NEHEMIAH** → start next cycle by reading this baton, then executing item #1 (locate V2 contract manifest). If empty-handed after 5 minutes, jump to item #2 (Noah collision audit). Do **NOT** re-read the two founder attachments — this baton captures the material state; the Hive PDF remains unreadable pending founder unblock.

## CYCLE RECEIPT (this cycle, 2026-08-11)
- **Verified delta:** ground truth reconstructed after task-store baton was missing; three mission-text assertions falsified (task ID, prod SHA, contract manifest location); Hive PDF flagged as unreadable; repo state (branch/HEAD/pushed/dirty) captured; wm-doc-bridge tonight-scaffold discovered.
- **Governing artifact:** this file (`docs/operations/ATHOS_BATON_2026-08-11.md`), not committed, not pushed (per NO-GO).
- **Blocker:** CAP-BLOCK-01, NECTAR-MIG-01, CONTRACT-MANIFEST-LOC, PROD-SHA-RECONCILE, HIVE-NECTAR-PDF (see above).
- **Next owner/action:** NEHEMIAH → item #1.
- **MISSION STATUS = ACTIVE / CONTINUATION REQUIRED.**

---

## CYCLE 2 SUPERSESSION NOTE — 2026-08-12 (append-only per Drive-doc pattern)

Corrections from reading Drive doc P00284–P00429 (architecture audit + PR25 reconciliation contract):

- **CORRECTION to Cycle 1 §"HARD ENVIRONMENT FACTS"**: Local `~/wealthymindsets-pro` main @ `55c869c` is **16 commits BEHIND production/main** per Drive doc P00310's GitHub comparison — NOT "clean vs origin, nothing unpushed" as Cycle 1 stated. Local `origin/main` on this clone is stale.
- **CORRECTION to Cycle 2 preflight receipt**: The `coverageServerPersistence.test.ts` L24 identity-tuple assertion does NOT actually fix P00149. Per Drive doc P00287, the test asserts on a test-local JSON string, not on the RPC payload schema — production still uses `owner_id + instrument_id + channel + provider_path` and OMITS `timeframe` + `sessionIdentity`. Sentinel already flagged this as **P0 IDENTITY CONTRACT GAP** unresolved. The correction commits `a8c3438`+`5158994` are documentation + string-shape assertions, not the migration/RPC schema fix themselves.
- **NEW CONTEXT**: **PR25 exists** as OPEN DRAFT (`8d49e4f8`, 3 commits ahead of `61b20a2`, 21 files, `mergeable=true`). Not previously in this session's memory.
- **NEW CONTEXT**: Drive-doc's P00325 already stated a SENTINEL DECISION: RETURN on PR25 requiring 6 conditions (a-f) before adoption. That is the actual controlling gate — my preflight PASS on the V2 61-entry manifest is a prerequisite but not sufficient.
- **NEW CONTEXT**: Overlap between PR25 21-path + correction 5-path = **exactly 1 path** (`src/lib/marketData/observationPersistence.test.ts`). Any implementation seat must apply PR25's diff first, then hand-apply correction assertions once (never twice-cherry-pick).
- **NET-NEW FROM CYCLE 2** (not in prior Drive-doc chronology): S-01 canonical-SHA drift; S-02 12 out-of-scope fan-out consumers (extends P00289 beyond useWebSocket); S-03 dual-clone divergence between `~/wealthymindsets-pro` and `~/Documents/Codex/2026-08-09/…/wm-pro-working/.git`.

**Superseded Cycle 1 next-action list.** The Drive doc's P00325 six-condition Sentinel RETURN is the controlling next specification. All six require capacity above 2 GiB start floor — founder's deletion-authority decision on the recorded 5/8 installer paths remains the load-bearing blocker.

**Chrome MCP status**: extension installed + toggled ON (founder confirmed via screenshot 2026-08-12 ~00:59) but `list_connected_browsers` still returns empty — needs side-panel sign-in with `dhill5711@gmail.com` to complete pairing. Visual verification remains blocked until then.

**MISSION STATUS unchanged: ACTIVE / CONTINUATION REQUIRED / WM NO-GO.**

---

## CYCLE 4 SUPERSESSION NOTE — 2026-08-12 (Ultimate Reconstruction directive absorbed)

Founder issued Ultimate Reconstruction + Functional UI + Intelligence Convergence addendum. §32 anti-stall + §49 continuous loop internalized. Executed across chained sub-cycles this session:

- **Cycle 4** — [UI_CONTRACTS_AND_CONTRADICTIONS_2026-08-12.md](UI_CONTRACTS_AND_CONTRADICTIONS_2026-08-12.md) (27,478 bytes, 361 lines): truth-state vocabulary inventory (identified `MarketQualityState`, `MarketStateResolution`, `MarketStateDimension`, `CoverageState`, `MemoryState` already exist as types), full UI contradiction audit (8 findings with file:line + verdict), P00290 canonical state adoption gap re-confirmed (0 non-test UI consumers), 6 module contracts (Mirror, Opening Bell, Story Ribbon, Steward State, Available R, CLC) each answering §40's 13-question template, Selectors/View-Model spec (Gate 2), 12 primitive contracts.
- **Cycle 4 UI_TRANSFORMATION_LEDGER_2026-08-12.md** (from prior message): mockup gap matrix, 10-step Micah build priority, THIRD-clone finding.
- **Cycle 5a** (appended to Cycle 4 doc): LIVE label sweep — 6 unique JSX sites (not 25), 4 HONEST + 2 VIOLATION + 1 MINOR. Reference-correct pattern lives at MainChart.tsx:6928 (`status.live` gated, degrades to NO FEED / amber label). Adopt as `<QualityBadge>` primitive.
- **Cycle 5b** (appended): PR#24 × PR#25 × correction-seat three-way overlap. PR#24 discovered (previously unknown). PR#24 ∩ PR#25 = 2 files (`MainChart.tsx`, `sessionNectar.test.ts`). Migration ordering + Sentinel merge sequence proposed. `gh` CLI functional at `/opt/homebrew/bin/gh` (account spaidsnipes, scopes repo/workflow/gist/read:org).
- **Cycle 5c** (appended): PR#24 diff read — **does NOT fix P00286 "Saved" overclaim; EXTENDS it** (chip rename `"Seen"→"Saved"`, render gate widened `>tradeCount → >0`, new "server-durable" aria-label). BUT PR#24 introduces `checkpointSaved`/`appended` at coverage route — data exists to gate on. **Sentinel-RETURN-worthy defect** with a small fix specified. PR#25 adds ZERO canonical-store consumers → P00290 remains open in both open PRs.
- **TRUTH_STATE_TYPE_ADDITIONS_SPEC_2026-08-12.md** (4,911 bytes, 132 lines): PR#26 candidate — additive types `PersistenceAckState` + `TruthClass` + `MarketStateDimension.truthClass` extension. Helpers `isDurable(ack)` + `displayCountFor(ack, observedCount)` enable one-line UI adoption. Two ADD files + one one-field EDIT (or fallback: companion map to avoid FROZEN/EDIT ambiguity). Focused test spec included.

### Corrected repository truth
- 25 PRs since 2026-08-09, all 1-23 MERGED, PR#24 OPEN, PR#25 DRAFT, no PR#26+ yet.
- Local `~/wealthymindsets-pro@55c869c` missing PRs #10-#17 (canonical market state + market memory foundation + quote-truth). **Do not branch from it.**
- Canonical clone = `~/Documents/Codex/2026-08-09/…/wm-pro-working/.git`, worktrees include correction seat + preserved-inactive `wm-nectar-durable-summary` (HEAD 684d485).
- `MarketQualityState`, `MarketStateResolution`, `MarketStateDimension` all TYPE-defined. §14 D×L×A×R framework already in `canonicalMarketState.ts`.

### Load-bearing blockers (unchanged, founder-gated)
- Capacity ≥2 GiB (deleting recorded 5-or-8 installer paths)
- Chrome MCP pairing (side-panel sign-in)
- Sentinel disposition on PR#24 defect expansion + P00325 six-condition RETURN on PR#25
- Migration application authority for both `20260811103000_wm_append_only_coverage_receipts.sql` and `20260811230000_wm_market_operational_gaps.sql`

### Post-unblock chain (bounded PRs, each self-contained)
- **PR#26**: `PersistenceAckState` + `TruthClass` types (spec ready, awaits Sentinel APPROVE)
- **PR#27**: `<PersistenceBadge>` adoption in MainChart Nectar overlay + PR#24's saved-history overlay — fixes C2/C3/PR#24 defect
- **PR#28**: `<QualityBadge>` adoption at OptionsChain:173 (C7) + FootprintControls:259 (C1) + refined LiveRoom:506 (C8)
- **PR#29**: Story Ribbon as first `canonicalMarketStateStore` UI consumer — closes P00290

**MISSION STATUS = ACTIVE / CONTINUATION REQUIRED / WM NO-GO.**

---

## CYCLE 9 SUPERSESSION — 2026-08-12 P0 Provider Live Trace (Founder TSLA "not live" investigation)

Founder P0 directive: audit entire provider→UI pipeline. Live production probes at 14:10 UTC (Founder's active TSLA session).

**Data plane VERIFIED HEALTHY**:
- `/api/alpaca?sym=TSLA&type=quote` HTTP 200, source:alpaca, price 328.07, ts 1s stale
- `/api/yahoo?sym=TSLA` HTTP 200, ts 0s stale, full-market vol 6.3M vs Alpaca IEX 102K
- `/api/finnhub?sym=TSLA` HTTP 200, ts 23s stale
- `/api/alpaca?type=candles&tf=2m` HTTP 200, 5 real bars
- Railway Alpaca IEX proxy `wss://aplacawsproxy-production.up.railway.app` HTTP/2 200 ALIVE

**Founder's TSLA analysis validates**: 330 target region hit (low 326.86 today), 335-336 upside magnets tested (high 335.26).

**Root cause: UI truthfulness bug, NOT data-plane failure.** Confirms prior findings — C1 FootprintControls "!paused=LIVE", C2/C3+PR#24 MainChart "Saved N" overclaim, P00286 P0 TRUTH DEFECT unchanged. Data path works; UI lies.

**Provider Capability Matrix built** (in `docs/operations/P0_PROVIDER_LIVE_TRACE_2026-08-12.md`):
- **Alpaca** = primary live source via REST + Railway IEX proxy WSS
- **Yahoo** = fallback quote + full-market volume + futures (`NQ1!`)
- **Finnhub** = REST only server-proxied (WS removed 2026-08-08 WM-SEC-P0-03)
- **Polygon** = client WS path exists in useWebSocket.ts:196 but no POLYGON_API_KEY env grep hit → dormant
- **tastytrade** = broker-status ONLY (accounts/market-metrics/status routes), NO market-data quote route
- **Webull** = NOT integrated (0 routes, 0 imports)
- **Kraken** = only source of DOM/L2 (via `DOMPanel.tsx:79` separate socket outside useWebSocket per Drive P00495)
- **`/api/alpaca-stream/route.ts`** = DEAD SERVER WSS (0 client consumers per Drive P00496); wastes Alpaca socket allocation on every hit

**6 employee-decision fix packets drafted** (Section §What actually needs to happen in P0 doc): E1 QualityBadge, E2 PersistenceBadge (fixes PR#24 defect atomically), E3 alpaca-stream disposition, E4 NectarHeartbeat component, E5 Data-Health header, E6 volume-source labeling. All can be authored mechanically when disk clears to ≥2 GiB.

**Standing state**: Disk 186 MiB (dropped from 1.3 GiB in cycle). Chrome MCP still unpaired. `gh` at 4998/5000. No source/schema/DB/deploy mutation. Founder BTC tab + worktrees + quarantine `2f03f965` untouched.

## CYCLE 12 SUPERSESSION — 2026-08-13 helicopter transformation directive

Founder issued new master directive 2026-08-13 shifting priority from Nectar/backend to Trading Experience + UI + Profile + Heatmap + Memory/Learning + Education/Community + WOW Ecosystem. Key architectural insight captured:

**Process Landscape Loop** (Profile × Heatmap × Memory × Replay × Drill):
```
Heatmap discovers pattern
  → Memory proves examples
    → Replay explains it
      → Mirror helps interpret it
        → Drill trains it
          → Profile records improvement
```

Market side:
```
Market Heatmap → symbol → Command Deck → Story → Chart → Profile/Volume/Order Flow → setup → Decision Memory
```

Shipped this cycle:
- `src/lib/traderMemory/viewModels/selectProcessLandscape.ts` — pure selector composing DecisionMemorySnapshots into a heatmap-ready LandscapeVM. 12 axis extractors × 8 metrics = 96 possible views. UNKNOWN-safe below sample threshold. Includes `selectMemoryExamplesForCell` bridge for "heatmap cell → memory examples" drill.

**8 heatmap families** to build per new directive:
1. Market Map (sector/watchlist strength)
2. Liquidity Map (only if real depth available)
3. Volume/Auction Map (unified with VP authority)
4. Order-Flow Map (signed classification only)
5. Session Map (time/day/session behavior)
6. Playbook Edge Map (edge by context, requires sample threshold)
7. Trader Process Map (adherence, rushing, review) — no emotional diagnosis
8. Decision Memory Map (patterns across decisions) — correlation ≠ causation

**One WOW civilization** doctrine — TV/Radio/Lounge/Shop share:
- Passport → Relationship Graph → Search/Discovery → Creator/Business Graph → Permissions → Payments → Notifications → Media Library → Events → Rooms → Academies → Commerce → History/Memory

Different room. Same house. Different instrument. Same orchestra.

## CYCLE 10 SUPERSESSION — real WSS + code-level TSLA "not live" root cause

**Correction**: Cycle 9 "data plane healthy" was premature from single REST probe. Full end-to-end verification this cycle:

- WSS handshake real via Node 24 native `WebSocket`: HTTP 101 upgrade OK 335ms, first msg 396ms
- **Railway proxy IGNORES `?sym=TSLA`** — fans out FIXED 12-symbol set (`AAPL/AMZN/BTC/EURUSD/GBPUSD/META/MSFT/NVDA/QQQ/SPY/TSLA/USDJPY`) to every connection
- 45.1-sec proxy soak: TSLA 21 trades (27.9/min), NVDA 44, AMZN 35, SPY 25 — proxy is fully operational
- TSLA price at 325.27 (dropped $3 from morning probe — continuing toward Founder's ~325 lower objective)

**Code-level root cause** at `src/lib/marketData/adapters/alpacaRelay.ts:51-53` + `src/hooks/useWebSocket.ts:1055`:
- Adapter uses tick-rule: `price > priorPrice → BUY; price < priorPrice → SELL; else UNKNOWN` (first trade `priorPrice=0 → UNKNOWN` always)
- useWebSocket ingest gate: `if (event.aggressorSide === "UNKNOWN") continue;` — drops before `ingestSessionNectarEvent()`
- `setState({connected:true, source:"alpaca"})` runs AFTER the aggressor drop → status stays disconnected until first tick-differentiated trade

**Live 30-sec TSLA simulation of client code**: 12 proxy trades → 5 (41.7%) dropped as UNKNOWN → **first Nectar-accepted event at 13,235ms (13.2 seconds of silence)** after WSS open. Founder's exact "not live" experience.

**Corrections env inventory**:
- Polygon IS configured — env vars are `POLYGON_KEY` + `NEXT_PUBLIC_POLYGON_KEY` (my earlier grep used wrong pattern `POLYGON_API_KEY`)
- Webull confirmed NOT integrated (only mentioned in `docs/ATH_VIDEO_EVIDENCE_2026-07-28.md` for competitor comparison)
- tastytrade has full OAuth (`TASTYTRADE_CLIENT_ID/SECRET/REFRESH_TOKEN/ENV`) but no market-data quote route
- `JWT_SECRET` confirmed as missing preview env → PR#25 Vercel failure root cause (matches Drive P00323)

**Bounded fix drafted — F1+F2+F3 = ~13 lines total in `useWebSocket.ts` (V2 EDIT per P00737, no manifest supersede)**:
- **F1**: seed `lastPx` from REST `priceRef.current` at connect (removes first-trade always-UNKNOWN)
- **F2**: replace `if (UNKNOWN) continue` with `if (UNKNOWN) { ingestSessionNectarEvent(event); continue; }` — truthful degradation instead of silence
- **F3**: fire `connected:true` on FIRST event, not first ACCEPTED — separate connection state from aggressor state

Combined effect: Nectar UI shows OBSERVING within <1s of tab open, matching reality.

**4 architectural defects surfaced** (AD-01 fan-out broadcast, AD-02 UNKNOWN drop, AD-03 status hidden, AD-04 lastPx=0 seed, AD-05 subscription echo). F1+F2+F3 address AD-02/AD-03/AD-04. AD-01 requires MarketFeedHub work (deferred). AD-05 needs audit.

**Full 20-stage trace matrix** verdicts in P0 doc §Cycle 10. Stages 07 PASS, 08 PARTIAL, 09 PASS, 12 FAIL, 20 FAIL — the failure chain is TRACED.

**MISSION STATUS = ACTIVE / CONTINUATION REQUIRED / WM NO-GO.**

**MISSION STATUS = ACTIVE / CONTINUATION REQUIRED / WM NO-GO.**
