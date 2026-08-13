# Cycle 7 Precomputation — Employee-Decision Packets Ready for Zero-Latency Implementation

**Purpose**: per §Precomputation Mode + §Employee vs Founder Gate Taxonomy, all remaining WM Pro P0 work is either founder-gated (2 items) or employee-gated (5 items). This doc formalizes the 5 employee-gated packets so implementation is mechanical the moment execution unblocks.

**Preserved**: Founder BTC tab · all worktrees · quarantine `2f03f965` · Nectar/TSLA/BTC evidence · credentials · brokerage state. WM Pro NO-GO. Correction seat clean at `5158994`, base `61b20a2d`.

## 0. Corrected WM ordering (per Founder Requirement Index WM-RQ-001..014 + Founder Master Order-Flow Directive)

Real sequence is: **PR1 gate resolution → WM-OF-P0-00..04 order-flow defects → approved bounded decision-asset tickets (Mirror/Story Ribbon/Realm Gateway/etc.).**

Cycle 4's UI Transformation Ledger 10-step build priority is downstream of this — decision-asset modules do NOT bypass PR1 or order-flow defects. Micah's item-6.1 (design tokens + primitives) is still safe to start early because it's foundational infrastructure that all downstream work will consume.

## 1. PR1 group status reconciliation

Brief-era tickets vs current PR chronology:

| PR1-group ticket | Brief status | Current status (real GitHub) |
|---|---|---|
| WM-WYCK-P0-01 (Wyckoff fabrication removal) | behavioral prod pass | LIKELY LANDED in PR#14 (`fix(market-state): isolate future tick rejection`) or earlier |
| WM-WYCK-P0-02 (deployment provenance) | ready for Sentinel closure | Sentinel disposition unrecorded post-PR#23 merge |
| WM-CHART-P0-01A | FAILED (provider/timeframe silent substitutions) | Related PR#6 P0 `agent/yahoo-timeframe-truth-p0` MERGED — verify closure |
| WM-CHART-P0-01B | proposed | Status unrecorded |
| WM-VID-P0-01/02 | require reproduction on identified build | Screen Recording artifacts on disk; Sentinel reproduction pending |
| PR1 E predicate correction (from FRI PR1 E) | Forge active, status 97 pre-runtime | Not visible in GitHub PR list; QA gate internal to Forge worktree |

**Sentinel action needed** (employee decision): audit which PR1-group tickets remain OPEN vs which are closed by PRs #14-#22 that landed 2026-08-11. Draft a bounded Sentinel disposition update to the Drive doc (I cannot write Drive but can prep the paragraph text).

## 2. Real open P0 blockers (post-brief-era, from GitHub + Drive current-state)

| Blocker | Type | Owner |
|---|---|---|
| WM-RQ-003 auth/email real delivery | Founder-gated (needs real email cred + clean session runtime) | Sentinel acceptance after prov |
| WM-RQ-005 phone/iPad interactive acceptance | Founder-gated (needs real devices + Chrome pairing) | Sentinel |
| PR#24 "Saved" overclaim expansion | **Employee-gated (Sentinel)** — RETURN packet in §3 | Sentinel |
| PR#25 Vercel deployment failures × 2 | Founder-gated (needs `JWT_SECRET` in preview env) | Founder → then Vercel |
| v2-identity migration architecture | **Employee-gated (Noah + Forge)** — shadow-table pattern in §4 | Noah/Forge |
| WM-OF-P0-00..04 order-flow defects | **Employee-gated (Forge architecture → Noah bounded impl)** — 5 packets in §5 | Forge → Sentinel → Noah |
| Canonical Market State UI adoption (P00290) | **Employee-gated (Micah + Noah)** — Story Ribbon selector spec in §6 | Micah/Noah |

## 3. Sentinel RETURN packet — PR#24

**Decision authority: Sentinel (employee). Delivering:**

> **RETURN — PR#24 (`baa297a4…`, "fix(nectar): surface saved history when live tape is unavailable")**
>
> Contract violation of Drive P00286 (P0 TRUTH DEFECT — "SAVED" OVERCLAIM). PR#24 preserves the defect vocabulary and widens the render gate:
> - Chip rename `"Seen"` → `"Saved"` at `src/components/chart/MainChart.tsx` ~line 7147
> - Render gate widened `coverageEvents > s.tradeCount` → `coverageEvents > 0`
> - Aria-label promises `"server-durable coverage observations"` at ~line 7092 without ack gate
> - Second new aria-label promises `"server-durable coverage observations from a prior tape session"` in the saved-history overlay
>
> Silver lining: PR#24 introduces the ack signal at the coverage route response — `checkpointSaved: true` and `appended: <int>`. Data exists to gate on; UI just doesn't consume it.
>
> **Bounded correction (≤15 lines, MainChart.tsx only):**
> 1. Thread `checkpointSaved` and `appended` from coverage-route response through the sessionNectar hook state (add to whatever nectar-state shape the hook returns).
> 2. Compute `ackState` in the render body: `const ackState = appended != null && appended >= coverageEvents ? 'ACKNOWLEDGED' : (pendingWrite ? 'PENDING' : 'LOCAL_ONLY');`
> 3. Gate the chip: `<span>{ackState === 'ACKNOWLEDGED' ? 'Saved ' : ackState === 'PENDING' ? 'Pending ' : 'Local '}</span><span>{count}</span>`
> 4. Update both aria-labels to match: `"${ackState === 'ACKNOWLEDGED' ? 'server-durable' : 'local session'} coverage observations"`.
> 5. Same treatment for the second saved-history overlay aria-label.
>
> **Focused test**: `MainChart.persistence.test.tsx` (already an ADD in V2 61-entry manifest, P00723) must include: ACKNOWLEDGED renders "Saved N"; PENDING renders "Pending N"; count mismatch renders "Local N"; missing `appended` renders "Local N".
>
> **After correction**: PR#24 becomes truthfully additive — new saved-history overlay + acknowledgement pipe + truthful chip. Merge after focused-test PASS.

## 4. Noah + Forge architecture — v2-identity migration shadow-table pattern

**Decision authority: Noah + Forge (employee). Delivering:**

Drive P00548-P00566 established that a simple additive column migration on `wm_market_coverage_checkpoints` is impossible:
- Old PK `(owner_id, instrument_id, channel, provider_path)`
- V2 required identity `(userId, canonicalSymbol, timeframe, providerPath, eventChannel, sessionIdentity)`
- Adding columns while keeping old PK collapses identities across timeframe/session
- Replacing PK invalidates v1 RPC `ON CONFLICT` target
- Keeping old unique constraint prevents required v2 multiplicity

**Shadow-table pattern (dual-write, v1-preserved-compat)**:

```sql
-- New v2 table with full 6-field identity, orthogonal to v1
CREATE TABLE wm_market_memory.coverage_checkpoints_v2 (
  owner_id             uuid NOT NULL,
  canonical_symbol     text NOT NULL,
  timeframe            text NOT NULL,       -- NEW
  provider_path        text NOT NULL,
  event_channel        text NOT NULL,
  session_identity     text NOT NULL,       -- NEW
  observed_from        timestamptz,
  observed_through     timestamptz,
  observed_event_count bigint NOT NULL DEFAULT 0,
  gap_count            int NOT NULL DEFAULT 0,
  updated_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, canonical_symbol, timeframe, provider_path, event_channel, session_identity)
);

-- Companion first-seen ledger for v2 (matches PR#23 first-seen defense pattern)
CREATE TABLE wm_market_memory.coverage_first_seen_v2 (
  owner_id             uuid NOT NULL,
  canonical_symbol     text NOT NULL,
  timeframe            text NOT NULL,
  provider_path        text NOT NULL,
  event_channel        text NOT NULL,
  session_identity     text NOT NULL,
  observed_from        timestamptz NOT NULL,
  PRIMARY KEY (owner_id, canonical_symbol, timeframe, provider_path, event_channel, session_identity)
);

-- New v2 RPC — never touches v1 table
CREATE FUNCTION wm_upsert_market_coverage_checkpoints_v2(payload jsonb) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER AS $$ ... $$;

-- v1 compatibility view for read-during-transition
CREATE VIEW wm_market_memory.coverage_v_unified AS
  SELECT owner_id, canonical_symbol, provider_path, event_channel,
         COALESCE(NULL::text, '')  AS timeframe_or_empty,
         COALESCE(NULL::text, '')  AS session_or_empty,
         observed_from, observed_through, observed_event_count, gap_count
  FROM wm_market_memory.coverage_checkpoints_v2
  UNION ALL
  SELECT owner_id, instrument_id, provider_path, channel,
         ''::text, ''::text,
         observed_from, observed_through, observed_event_count, gap_count
  FROM public.wm_market_coverage_checkpoints;  -- v1 preserved
```

**App-code dual-write phase** (bounded correction, `sessionNectar.ts` EDIT):
```ts
// During transition window: call both v1 and v2 RPCs.
async function persistCoverage(identity: FullIdentity, obs: CoverageDelta): Promise<PersistenceAck> {
  const [v1, v2] = await Promise.allSettled([
    rpcV1({ owner_id, instrument_id, channel, provider_path, ...obs }),
    rpcV2({ owner_id, canonical_symbol, timeframe, provider_path, event_channel, session_identity, ...obs }),
  ]);
  // Ack requires v2 success. v1 is fire-and-preserve compatibility.
  return v2.status === 'fulfilled'
    ? { state: 'ACKNOWLEDGED', appended: v2.value.appended, checkpointSaved: true, expectedCount: obs.count, acknowledgedCount: v2.value.appended }
    : { state: 'FAILED', appended: 0, checkpointSaved: false, expectedCount: obs.count, acknowledgedCount: 0, reason: v2.reason.message };
}
```

**Read path cutover** (later phase): once N days of clean v2 writes:
```ts
async function readCoverage(id: FullIdentity): Promise<Coverage> {
  const v2 = await queryV2(id);
  if (v2) return v2;
  // v1 fallback for pre-cutover rows — partial identity, marked as such
  return queryV1(id).map(row => ({ ...row, identityCompleteness: 'PARTIAL_V1_LEGACY' }));
}
```

**Rollback shape**: additive-only. Reverting app code stops v2 writes; v2 table remains inert (safe). No forward-compensation SQL needed for source rollback. If v2 table ever needs contraction, a separately reviewed migration under Founder authority.

**Migration manifest supersede**: current V2 61-entry ADD `supabase/migrations/20260812030000_wm_market_coverage_identity_v2.sql` should be split into TWO additive migrations + one app-code EDIT + one v1-preserved view. Requires manifest supersede with fresh Sentinel APPROVE.

## 5. Forge architecture packets — WM-OF-P0-00..04

**Decision authority: Forge (employee). Delivering 5 packets:**

### 5.1 WM-OF-P0-00 — Big Trades bubble overlap defect

**Verified live evidence** (Drive): "Enabling Big Trades on TSLA 15m rendered many overlapping white numbered circles near current price."

**Root cause hypothesis**: bubbles positioned by price-only with no collision detection or lateral offset. High-price-density regions (near current price) stack.

**Proposed architecture**:
- Bubble layout algorithm: quadtree spatial hash keyed on `(pricePx, timePx)` with radius = `min(bubbleR, tickSpacing/2)`.
- On placement, query quadtree for overlap; if overlap detected, push laterally along the time axis (or vertically fractional) up to `maxOffsetPx = bubbleR * 3`.
- If still overlap after max offset attempts, merge into a cluster label `Nx` with count.
- Side labels off the price axis for high-density periods.
- Preserve individual click/hover semantics — cluster expands on hover.

**Founder direction**: "water-style bubble system" — bubbles remain distinct with soft edges, subtle motion; NOT copy any proprietary appearance.

**Acceptance**:
- No overlapping bubbles on TSLA 15m, any density
- Cluster labels for count > threshold
- Bubble count controls: All / 25 / 50 / 75 / 100 / 150 / 200 / **custom** (see WM-OF-P0-02)
- No canvas flicker on drawn state change
- Visual/runtime evidence at exact SHA + device + timestamp

**Files** (estimated): `src/components/chart/MainChart.tsx` (bubble render), new `src/lib/marketData/bubbleLayout.ts` (quadtree algorithm), `MainChart.persistence.test.tsx` (already V2 ADD) — add collision test.

### 5.2 WM-OF-P0-01 — Plain-text "Smart Money" control

**Verified live evidence**: Smart Money control is plain text; opens a substantial Smart Money Tools panel.

**Proposed architecture**:
- Replace plain-text control with `<SmartMoneyButton />` primitive (branded W mark + label + status pill).
- W mark: geometric gold sigil derived from Cycle 3 artifact's Realm Gateway sigil style — obsidian ground, 1px gold border, hover glow.
- Status pill inline: shows aggregate Smart Money Confluence Score from existing panel (currently 56/100 on TSLA per Drive).
- Truncation-safe at all breakpoints.

**Acceptance**: no truncation at 360×800; branded mark visible; clear affordance (cursor pointer, hover state).

**Files**: `src/components/smart-money/SmartMoneyButton.tsx` (NEW), plus button-swap edit at wherever `"Smart Money"` label is rendered (likely `SmartMoneyPanel.tsx` header or chart nav).

### 5.3 WM-OF-P0-02 — Missing custom Big Trades quantity

**Verified live evidence**: Big Trades settings expose All/25/50/75/100/150/200; no custom quantity.

**Proposed architecture**:
- Add numeric input alongside preset chips: `<input type="number" min="1" max="10000" step="1" />` with debounce.
- Value bound to same state slice as preset chips; presets deselect when custom entered.
- Persist to localStorage per-user-per-symbol (respecting Nectar identity contract).

**Acceptance**: entering custom value applies live; refresh restores it; symbol switch preserves per-symbol; keyboard/touch accessible.

**Files**: `src/components/chart/FootprintControls.tsx` (near existing preset chips).

### 5.4 WM-OF-P0-03 — Timeframe row gap vs reference platforms

**Verified live evidence**: WM shows 1m/2m/5m/15m/30m/1h/1D/1W/1M. Moomoo shows 1m/3m/5m/10m/15m/30m/1h/2h/3h/4h + seconds + 45s. TradingView shows similar depth.

**Proposed architecture**:
- Expand exposed timeframes to at minimum: `1s / 15s / 30s / 45s / 1m / 2m / 3m / 5m / 10m / 15m / 30m / 1h / 2h / 3h / 4h / 1D / 1W / 1M`.
- **Do NOT silently add timeframes without provider verification** — each new timeframe must be verified against real provider capability (Alpaca, Yahoo, Kraken). If unsupported, mark UNAVAILABLE with reason, do not fabricate.
- Add category grouping in a compact dropdown for timeframes that don't fit the visible row (e.g. sub-minute + 4h+); primary presets stay on the button strip.
- Persist per-user timeframe favorites.

**Acceptance**: no silent provider substitution (WM-RQ-006 truthfulness); each timeframe traces to a verified provider capability; UNAVAILABLE state renders explicitly.

**Files**: `src/components/chart/TimeframeRow.tsx` (or wherever the current row lives, likely in ChartsDashboard), plus `src/lib/marketData/capabilityRegistry.ts` (per-provider timeframe capability).

### 5.5 WM-OF-P0-04 — SVP/Fixed VP stability under state changes

**Verified live evidence** (Founder Master WM Order-Flow Directive IMMEDIATE-STABILITY): "Session and Fixed Volume Profile must remain stable under timeframe, symbol, resize, scroll, zoom, drawing, session, and data-state changes."

**Root cause hypotheses**:
- VP recomputes on every render instead of memoizing on `(symbol, timeframe, sessionId, barHash)`.
- VP layer lifecycle tied to component mount instead of chart lifecycle → resize forces remount.
- No debounce on resize → recompute storm.

**Proposed architecture**:
- Memoize VP computation keyed on stable identity `(symbol, timeframe, sessionId, canonicalBarSetHash)`.
- Detach VP render from React reconciliation: draw on canvas layer with imperative update triggered only when identity hash changes.
- Resize handler debounced (16ms).
- Drawing tool state kept in a separate layer; VP does not repaint on drawing add/move.
- Symbol/timeframe change tears down VP layer, then reconstructs — no partial paint.

**Acceptance**: VP visible pixels stable through `[symbol A → B → A]`, `[timeframe A → B → A]`, `[resize]`, `[scroll]`, `[zoom]`, `[drawing add/move/delete]`, `[session change]`, `[data gap injection]`. FPS ≥ 60 during all state changes.

**Files**: `src/components/chart/WMSessionVP.tsx` (V2 FROZEN — needs supersede) + `src/lib/vpEngine.ts` (already exists per grep).

**Manifest note**: `WMSessionVP.tsx` is FROZEN in the V2 61-entry manifest. Any edit requires a superseding manifest with fresh Sentinel APPROVE. Sentinel could classify this as a bounded EDIT under WM-OF-P0-04 without touching the coverage/receipt semantics FROZEN protects.

## 6. Micah + Noah — Story Ribbon selector prototype

**Decision authority: Micah (design) + Noah (data contract) (employee). Delivering:**

Story Ribbon becomes the FIRST real UI consumer of `canonicalMarketStateStore`, resolving Drive P00290.

**Selector signature** (`src/lib/marketData/viewModels/selectStoryChapters.ts`, NEW):
```ts
export interface StoryChapterVM {
  id: 'opening_auction' | 'balance' | 'compression' | 'liquidity_probe'
     | 'sweep' | 'absorption' | 'reclaim' | 'breakout' | 'acceptance'
     | 'trend_expansion' | 'rotation' | 'value_migration' | 'exhaustion' | 'closing_auction';
  glyph: string;              // '◈' | '⟢' | '✧' | '✦' | '⧫' | '◇'
  name: string;               // display label
  status: 'past' | 'active' | 'future' | 'unknown';
  evidence: readonly MarketStateEvidenceRef[];
  resolution: MarketStateResolution;
  truthClass: TruthClass;
}

export interface StoryRibbonVM {
  chapters: readonly StoryChapterVM[];
  activeIndex: number | null;   // null when active chapter cannot be determined
  narrative: string | null;     // "Structure shift → Bear trap → …" — null if UNKNOWN
  resolution: MarketStateResolution;
  reason?: string;              // when resolution=UNKNOWN, explain
}

// Pure. No I/O. Consumes an immutable snapshot + rolling window of last N snapshots.
export function selectStoryChapters(
  state: CanonicalMarketState,
  history: readonly CanonicalMarketState[],
): StoryRibbonVM {
  // Derive activeIndex from `state.regime.value + state.structure.value + state.aggression.value`
  // (all three MUST be RESOLVED — else return activeIndex=null with reason)
  // Derive past chapters from history reduction.
  // Never fabricate. If evidence[] is empty, mark chapter status='unknown'.
}
```

**Consumer** (`src/components/ribbon/StoryRibbon.tsx`, NEW):
```tsx
export function StoryRibbon() {
  const state = useCanonicalMarketState();       // THE new consumer, closes P00290
  const history = useCanonicalMarketStateHistory(60);  // 60 snapshots
  const vm = React.useMemo(() => selectStoryChapters(state, history), [state, history]);
  if (vm.resolution === 'UNKNOWN') {
    return <DegradedState reason={vm.reason ?? 'Market state cannot be resolved yet.'} />;
  }
  return (
    <Panel label="Story Ribbon · Market Narrative">
      <div className="chapters">
        {vm.chapters.map((c, i) => <ChapterNode key={c.id} chapter={c} active={i === vm.activeIndex} />)}
      </div>
      {vm.narrative && <p className="narrative">{vm.narrative}</p>}
    </Panel>
  );
}
```

**Acceptance**: mounting StoryRibbon into ChartsDashboard becomes the first non-test UI consumer of `canonicalMarketStateStore` — verifiable by grep count going from 0 → 1. Truthful UNKNOWN branch when store dimensions unresolved. Focused tests: `storyChapters.test.ts` (pure fn) + `StoryRibbon.test.tsx` (renders UNKNOWN when store partial; renders correct active chapter for a known state; degradation graceful).

**Files** (NEW): `src/lib/marketData/viewModels/selectStoryChapters.ts`, `src/lib/marketData/viewModels/selectStoryChapters.test.ts`, `src/components/ribbon/StoryRibbon.tsx`, `src/components/ribbon/StoryRibbon.test.tsx`. **Files EDIT**: `src/components/chart/ChartsDashboard.tsx` (V2 EDIT) — mount `<StoryRibbon />` in existing chart region.

**Manifest**: this expands the V2 61-entry manifest by 4 new ADD files + 1 existing EDIT. Requires Sentinel APPROVE of manifest supersede.

## 7. Founder decision packet (smallest)

**Any ONE of these unblocks a downstream chain of ≥5 employee-decision items:**

1. **Capacity ≥2 GiB** — authorize deletion of 5-installer path set (Drive P00255). Projects `~2.29 GiB` free per P00301. Unblocks: PR#26 type additions → PR#27 PersistenceBadge → PR#28 QualityBadge → PR#29 Story Ribbon → WM-OF-P0-00..04 implementation.
2. **Chrome MCP pairing** — side-panel sign-in as `dhill5711@gmail.com`. Unblocks: visual verification via controlled tabs.
3. **Preview `JWT_SECRET` env var in Vercel** — clears at least one PR#25 Vercel failure (`dpl_3oVPYHpjMcrTLPi9tBdtDX3MKQfK`).
4. **Real email delivery test creds + clean test session** — unblocks WM-RQ-003 P0 closure verification.
5. **Real phone + iPad access + Chrome pairing** — unblocks WM-RQ-005 P0 closure.

## 8. Cycle 7 receipt

- Zero source/schema/test/deploy mutation.
- Founder BTC tab and all preserved state untouched.
- Real GitHub verified via `gh` (PR#25 failure identified as Vercel env-binding, not source).
- Drive Founder Requirement Index read (WM-RQ-001..014); WM Pro Current Project Brief read (PR1 group ticket status reconciled).
- v2 identity migration architecture drafted (Noah/Forge decision, ready to write).
- PR#24 Sentinel RETURN packet drafted (Sentinel decision, ready to deliver).
- WM-OF-P0-00..04 Forge architecture packets drafted (5 defects, ready to hand to Noah).
- Story Ribbon selector prototype drafted (Micah/Noah decision, closes P00290, ready to write).
- Disk oscillating 217-475 MiB; STOP_REQUIRED holds; ENOSPC transient during cycle.

**MISSION STATUS = ACTIVE / CONTINUATION REQUIRED / WM NO-GO.**
