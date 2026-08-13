# Truth-State Type Additions — Spec for a future PR#26

Spec-only. No source. Ready for Sentinel APPROVE/RETURN when capacity permits. Executes §7 (Acknowledged Persistence) + §8 (Truth Language) of the Ultimate Reconstruction directive.

## What's already in the codebase (do not duplicate)

From `src/lib/marketData/coverageMap.ts`:
- `CoverageState = "CONNECTING" | "COLLECTING" | "GAPPED" | "STALE" | "UNAVAILABLE" | "REPLAY"`
- `MemoryState = "NO_MEMORY" | "SESSION_ONLY" | "SUMMARY_ONLY" | "RETAINED"`

From `src/lib/marketData/canonicalMarketState.ts`:
- `MarketQualityState = "LIVE" | "DELAYED" | "STALE" | "PARTIAL" | "PROXY" | "REPLAY" | "UNAVAILABLE"`
- `MarketStateResolution = "RESOLVED" | "PARTIAL" | "UNKNOWN"`
- `MarketStateDimension { resolution, value, confidence, evidence[], contradictions[], unknowns[] }`

## What to add (proposed new types, PR#26 candidate)

### 1. `PersistenceAckState` — §7 vocabulary

```ts
// src/lib/marketData/persistenceAck.ts  (new file, additive)

export const PERSISTENCE_ACK_SCHEMA_VERSION = "wm.persistence-ack.v1" as const;

export type PersistenceAckState =
  | "NOT_REQUESTED"     // No server write attempted yet.
  | "PENDING"           // Request in-flight, no response yet.
  | "ACKNOWLEDGED"      // Server returned appended receipt(s) matching expected count.
  | "PARTIAL"           // Server acknowledged fewer receipts than expected.
  | "FAILED"            // Server rejected or returned non-2xx.
  | "OFFLINE_QUEUED"    // Offline; write queued locally for retry.
  | "UNKNOWN";          // Environment cannot determine ack state.

export interface PersistenceAck {
  schemaVersion: typeof PERSISTENCE_ACK_SCHEMA_VERSION;
  state: PersistenceAckState;
  expectedCount: number;
  acknowledgedCount: number;   // From coverage-route `appended` field (introduced by PR#24).
  checkpointSaved: boolean;    // From coverage-route response (introduced by PR#24).
  lastAckAt?: number;          // epoch ms of last successful ack
  lastAttemptAt?: number;      // epoch ms of last write attempt
  reason?: string;             // human-readable explanation for FAILED / UNKNOWN
}

export function isDurable(ack: PersistenceAck): boolean {
  return ack.state === "ACKNOWLEDGED" && ack.acknowledgedCount === ack.expectedCount;
}

export function displayCountFor(ack: PersistenceAck, observedCount: number): {
  label: "Saved" | "Pending" | "Local" | "—";
  count: number;
} {
  if (isDurable(ack)) return { label: "Saved", count: ack.acknowledgedCount };
  if (ack.state === "PENDING") return { label: "Pending", count: observedCount };
  if (ack.state === "OFFLINE_QUEUED") return { label: "Pending", count: observedCount };
  if (ack.state === "PARTIAL") return { label: "Saved", count: ack.acknowledgedCount }; // truthful — only ack'd count
  if (observedCount > 0) return { label: "Local", count: observedCount };
  return { label: "—", count: 0 };
}
```

Consumers (deferred implementation):
- `MainChart.tsx:7092` aria-label — call `displayCountFor(ack, coverageEvents)` and interpolate `{label} {count}`
- `MainChart.tsx:7147` chip — render `<span>{label} </span><span>{count}</span>`
- New `<PersistenceBadge ack={ack} />` primitive per Cycle 4 audit item 6

### 2. `TruthClass` — §8 vocabulary

```ts
// src/lib/marketData/truthClass.ts  (new file, additive)

export type TruthClass =
  | "OBSERVED"        // Directly received from named source within observation boundary.
  | "DERIVED"         // Deterministically calculated from identified inputs.
  | "INFERRED"        // Interpretive/probabilistic conclusion.
  | "RECONSTRUCTED"   // Rebuilt from durable aggregate/receipt evidence.
  | "STALE"           // Known value beyond freshness threshold.
  | "MISSING"         // Expected information absent for identifiable interval.
  | "UNKNOWN";        // Evidence insufficient.

export interface TruthLabel {
  class: TruthClass;
  freshnessMs?: number;   // age of underlying evidence
  source?: string;
  basis?: string;         // "receipt-count from wm_market_coverage_first_seen"
}
```

### 3. Extend `MarketStateDimension` with `truthClass` field

**Non-breaking additive**: extend `MarketStateDimension` to carry a `truthClass` alongside existing `resolution` — the two encode different things:
- `resolution`: RESOLVED / PARTIAL / UNKNOWN — did we compute it at all?
- `truthClass`: OBSERVED / DERIVED / INFERRED / RECONSTRUCTED — what KIND of computation?

```ts
export interface MarketStateDimension {
  resolution: MarketStateResolution;
  truthClass: TruthClass;       // ← new
  value: string | null;
  confidence: number | null;
  evidence: readonly MarketStateEvidenceRef[];
  contradictions: readonly string[];
  unknowns: readonly string[];
}
```

Migration: existing `publishCanonicalMarketState` callers set `truthClass: "DERIVED"` initially. Progressive typing: as consumers land, they specify the real class.

## Scope guard

- **No component migration in this PR#26.** Types + helpers only. Consumers follow in a separate PR.
- No FROZEN-path edits per V2 61-entry manifest. Two ADD files:
  - `src/lib/marketData/persistenceAck.ts`
  - `src/lib/marketData/truthClass.ts`
- One additive field on an existing type (`MarketStateDimension.truthClass`) — this crosses into EDIT territory for `src/lib/marketData/canonicalMarketState.ts`. Whether this is a permitted EDIT or requires a manifest supersede is a Sentinel decision. Fallback: define `truthClass` as a companion map keyed by dimension name in a NEW file (`dimensionTruthClass.ts`), avoiding the FROZEN/EDIT ambiguity entirely.

## Focused tests (new)

- `persistenceAck.test.ts`: `isDurable` truth table; `displayCountFor` for each state × observed count matrix; PARTIAL yields `acknowledgedCount` (never `observedCount`); OFFLINE_QUEUED yields "Pending".
- `truthClass.test.ts`: value narrowing, plus a stringifier test if introduced.

## Post-PR#26 chain (deferred)

- PR#27 candidate: adopt `PersistenceBadge` primitive in MainChart's Nectar overlay + new "saved history" overlay from PR#24 — fixes C2/C3/PR#24 defect atomically.
- PR#28 candidate: adopt `<QualityBadge>` primitive at OptionsChain.tsx:173 (fixes C7) and FootprintControls.tsx:259 (fixes C1).
- PR#29 candidate: Story Ribbon as first real `canonicalMarketStateStore` consumer (closes P00290).

## Blocker

Capacity ≥ 2 GiB start floor + Sentinel APPROVE for the two-file additive contract. All other execution boundaries (Founder BTC tab, quarantines, no push, no deploy) remain in force.

**MISSION STATUS = ACTIVE / CONTINUATION REQUIRED / WM NO-GO.**
