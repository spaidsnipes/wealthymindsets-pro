/**
 * Decision Memory — the immutable decision-time evidence capsule.
 *
 * Doctrine (from Founder 2026-08-13 helicopter directive):
 *
 *   Decision Memory defeats hindsight bias.
 *   Freeze at decision time: exact Market State, provenance, TraderState,
 *   exact Playbook version, thesis, trigger, invalidation, structural stop,
 *   targets, Available R, intended size/risk, expected behavior, action,
 *   system/model versions, whether coaching was shown.
 *
 *   After sealing: DO NOT REWRITE HISTORICAL INTENT.
 *     Management: APPEND.
 *     Outcome:    ATTACH ONCE.
 *     Review:     ATTACH ONCE.
 *     Corrections: AMEND.
 *
 *   No arbitrary 7-day lock unless Founder/company policy explicitly
 *   creates one. No arbitrary maturity threshold such as "30 trades =
 *   validated" unless policy defines it.
 *
 * This module ships the type + seal/append/attach helpers ONLY. The store
 * (subscription/broadcast/persistence) is a separate atom that consumes
 * these types. The types feed selectProcessLandscape, which feeds the
 * ProcessLandscape UI, which powers the Heatmap→Memory→Replay→Mirror→Drill
 * loop.
 */

import type { CanonicalMarketState } from "../marketData/canonicalMarketState";

// ── Schema version — bump when structure changes (Replay needs this) ────

export const DECISION_MEMORY_SCHEMA_VERSION = "wm.decision-memory.v1" as const;
export type DecisionMemorySchemaVersion = typeof DECISION_MEMORY_SCHEMA_VERSION;

// ── Frozen decision-time snapshot (never mutable) ──────────────────────

export interface FrozenTraderState {
  readonly ownerId: string;
  readonly capturedAt: number;
  readonly planStatus: "ACTIVE" | "PAUSED" | "BREACHED" | "UNKNOWN";
  readonly ruleAdherenceAtDecision: boolean;
  /** Trader-declared external influence at decision time (Discord, tip, etc.). */
  readonly externalInfluenceFlagged: boolean;
  /** Nth trade of this session (1-indexed). */
  readonly tradeNumberInSession: number;
  /** Optional self-reported state — user-declared, never inferred. */
  readonly selfReported?: {
    readonly focus?: 1 | 2 | 3 | 4 | 5;
    readonly urgency?: 1 | 2 | 3 | 4 | 5;
    readonly fatigue?: 1 | 2 | 3 | 4 | 5;
  };
  /** Was AI coaching shown at decision time? (For coach-effect measurement.) */
  readonly coachingShown: boolean;
}

export interface FrozenMarketStateSummary {
  /** Compact projection of the CanonicalMarketState dimensions. */
  readonly regime: string | null;
  readonly direction: string | null;
  readonly location: string | null;
  readonly volatility: string | null;
  readonly session: string | null;
  readonly structure: string | null;
  readonly aggression: string | null;
  readonly profile: string | null;
  /** How many dimensions were UNRESOLVED at decision time. */
  readonly unresolvedDimensionCount: number;
  /** Verbatim reference id to the full CanonicalMarketState snapshot. */
  readonly canonicalStateId: string;
}

export interface FrozenProvenance {
  /** For each dimension source, a compact provenance envelope. */
  readonly providersUsed: readonly {
    readonly provider: string;
    readonly feed?: string;
    readonly coverageScope: string;
    readonly freshness: "LIVE" | "DELAYED" | "STALE" | "REPLAY" | "UNKNOWN";
    readonly entitlement?: string;
  }[];
}

export interface FrozenPlaybook {
  readonly playbookId: string;
  readonly playbookVersion: number;
  /** Compact copy of the version's genome — makes replay independent of
   *  playbook history mutation. */
  readonly genomeSnapshot: Readonly<Record<string, unknown>>;
}

export interface FrozenState {
  readonly schemaVersion: DecisionMemorySchemaVersion;
  readonly capturedAt: number;
  readonly marketStateSummary: FrozenMarketStateSummary;
  readonly marketProvenance: FrozenProvenance;
  readonly traderState: FrozenTraderState;
  readonly playbook: FrozenPlaybook;
}

// ── Plan (the commitment made at decision time) ────────────────────────

export type DecisionAction =
  | "ENTER_LONG"
  | "ENTER_SHORT"
  | "WAIT"
  | "NO_TRADE"
  | "CLOSE_LONG"
  | "CLOSE_SHORT";

export interface DecisionPlan {
  readonly action: DecisionAction;
  readonly thesis: string;
  readonly intendedSize: number;
  readonly intendedStop: number;
  readonly intendedTargets: readonly number[];
  readonly expectedR: number;
  readonly availableRAtDecision: number | "UNKNOWN";
  /** The structural invalidation criteria (not just the stop price). */
  readonly invalidationCriteria: string;
  /** Expected market behavior that would keep the thesis supportive. */
  readonly expectedBehavior: readonly string[];
}

// ── Management events (append-only after decision) ──────────────────────

export type ManagementEventType =
  | "PARTIAL_EXIT"
  | "SCALE_IN"
  | "TRAIL_STOP"
  | "TARGET_ADJUST"
  | "THESIS_UPDATE"
  | "TIME_STOP"
  | "USER_NOTE";

export interface ManagementEvent {
  readonly id: string;
  readonly type: ManagementEventType;
  readonly at: number;
  readonly detail: string;
  /** Numeric deltas where applicable (price/size/stop/target). */
  readonly numeric?: Readonly<Record<string, number>>;
}

// ── Outcome (attached once when the trade closes) ──────────────────────

export type OutcomeReason = "TARGET" | "STOP" | "MANUAL" | "TIME" | "INVALIDATION";

export interface Outcome {
  readonly closedAt: number;
  readonly realizedR: number;
  readonly realizedPnl?: number;
  readonly reason: OutcomeReason;
  readonly averageFillPrice?: number;
  readonly slippageR?: number;
}

// ── Review (attached once when the trader reviews) ─────────────────────

export interface Review {
  readonly reviewedAt: number;
  /** Decision Quality Split (kept distinct from outcome per Founder doctrine). */
  readonly marketOpportunityQuality: 1 | 2 | 3 | 4 | 5;
  readonly playbookMatch: 1 | 2 | 3 | 4 | 5;
  readonly riskQuality: 1 | 2 | 3 | 4 | 5;
  readonly executionQuality: 1 | 2 | 3 | 4 | 5;
  readonly processAdherence: 1 | 2 | 3 | 4 | 5;
  readonly lessons: readonly string[];
  readonly lessonsForPlaybook?: readonly { playbookId: string; note: string }[];
}

// ── Corrections (amendments, not rewrites) ─────────────────────────────

export interface Amendment {
  readonly id: string;
  readonly at: number;
  readonly authorOwnerId: string;
  readonly reason: string;
  /** Which top-level field was amended (management/outcome/review). */
  readonly target: "outcome" | "review" | "management";
  /** JSON-shaped diff or note — original stays intact via amendmentHistory. */
  readonly note: string;
}

// ── The full record ─────────────────────────────────────────────────────

export interface DecisionMemoryRecord {
  readonly decisionId: string;
  readonly ownerId: string;
  readonly sessionIdentity: string;
  /** IMMUTABLE — never rewritten after seal. */
  readonly frozen: FrozenState;
  /** IMMUTABLE — the commitment made at decision time. */
  readonly plan: DecisionPlan;
  /** APPEND-ONLY. */
  readonly management: readonly ManagementEvent[];
  /** ATTACH-ONCE. Present after trade closes. */
  readonly outcome?: Outcome;
  /** ATTACH-ONCE. Present after trader reviews. */
  readonly review?: Review;
  /** APPEND-ONLY. Corrections preserve history — original review/outcome stays. */
  readonly amendments: readonly Amendment[];
}

// ── deepFreeze — runtime immutability ──────────────────────────────────

function deepFreeze<T>(value: T): T {
  if (value == null || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const key of Object.getOwnPropertyNames(value)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deepFreeze((value as any)[key]);
  }
  return value;
}

// ── seal — create a new record ─────────────────────────────────────────

export interface SealDecisionInput {
  decisionId: string;
  ownerId: string;
  sessionIdentity: string;
  frozen: FrozenState;
  plan: DecisionPlan;
}

export function sealDecision(input: SealDecisionInput): DecisionMemoryRecord {
  if (input.frozen.schemaVersion !== DECISION_MEMORY_SCHEMA_VERSION) {
    throw new Error(`sealDecision: schema version mismatch — got ${input.frozen.schemaVersion}, expected ${DECISION_MEMORY_SCHEMA_VERSION}`);
  }
  if (input.frozen.traderState.ownerId !== input.ownerId) {
    throw new Error("sealDecision: ownerId mismatch between input and frozen.traderState");
  }
  const record: DecisionMemoryRecord = {
    decisionId: input.decisionId,
    ownerId: input.ownerId,
    sessionIdentity: input.sessionIdentity,
    frozen: input.frozen,
    plan: input.plan,
    management: [],
    amendments: [],
  };
  return deepFreeze(record);
}

// ── appendManagement — returns a new frozen record with event added ────

export function appendManagement(
  record: DecisionMemoryRecord,
  event: ManagementEvent,
): DecisionMemoryRecord {
  if (record.outcome && event.at > record.outcome.closedAt) {
    throw new Error("appendManagement: cannot append management event after outcome");
  }
  const next: DecisionMemoryRecord = {
    ...record,
    management: [...record.management, event],
  };
  return deepFreeze(next);
}

// ── attachOutcome — attach ONCE, error on second attempt ───────────────

export function attachOutcome(record: DecisionMemoryRecord, outcome: Outcome): DecisionMemoryRecord {
  if (record.outcome) {
    throw new Error("attachOutcome: outcome already attached — use amendOutcome for corrections");
  }
  const next: DecisionMemoryRecord = { ...record, outcome };
  return deepFreeze(next);
}

// ── attachReview — attach ONCE, error on second attempt ────────────────

export function attachReview(record: DecisionMemoryRecord, review: Review): DecisionMemoryRecord {
  if (!record.outcome) {
    throw new Error("attachReview: cannot review a decision without outcome");
  }
  if (record.review) {
    throw new Error("attachReview: review already attached — use amendReview for corrections");
  }
  // No arbitrary time lock per Founder 2026-08-13 directive. Policy-driven
  // locks (if company doctrine adds one) attach via a separate policy check
  // wired at the store layer, not hardcoded here.
  const next: DecisionMemoryRecord = { ...record, review };
  return deepFreeze(next);
}

// ── amend — corrections preserve history via amendments list ────────────

export interface AmendmentInput {
  id: string;
  at: number;
  authorOwnerId: string;
  reason: string;
  target: Amendment["target"];
  note: string;
}

export function amendDecision(
  record: DecisionMemoryRecord,
  amendment: AmendmentInput,
): DecisionMemoryRecord {
  if (amendment.authorOwnerId !== record.ownerId) {
    throw new Error("amendDecision: only the decision owner may amend");
  }
  const next: DecisionMemoryRecord = {
    ...record,
    amendments: [...record.amendments, amendment],
  };
  return deepFreeze(next);
}

// ── Compact projection helper — for ProcessLandscape / heatmap feeds ────

/**
 * Extract the compact snapshot shape the ProcessLandscape selector expects.
 * Runs in O(1) — just a field projection. Kept as a helper so the selector
 * type stays independent of the full DecisionMemoryRecord shape.
 */
export function toDecisionSnapshot(record: DecisionMemoryRecord): {
  decisionId: string;
  capturedAt: number;
  ownerId: string;
  sessionIdentity: string;
  marketStateSummary: {
    regime: string | null;
    direction: string | null;
    location: string | null;
    volatility: string | null;
    session: string | null;
  };
  playbookId: string;
  playbookVersion: number;
  plan: { action: DecisionAction; expectedR: number };
  ruleAdherenceAtDecision: boolean;
  externalInfluenceFlagged: boolean;
  tradeNumberInSession: number;
  outcome?: {
    closedAt: number;
    realizedR: number;
    reason: OutcomeReason;
  };
  review?: {
    reviewedAt: number;
    marketOpportunityQuality: 1 | 2 | 3 | 4 | 5;
    playbookMatch: 1 | 2 | 3 | 4 | 5;
    riskQuality: 1 | 2 | 3 | 4 | 5;
    executionQuality: 1 | 2 | 3 | 4 | 5;
    processAdherence: 1 | 2 | 3 | 4 | 5;
  };
} {
  return {
    decisionId: record.decisionId,
    capturedAt: record.frozen.capturedAt,
    ownerId: record.ownerId,
    sessionIdentity: record.sessionIdentity,
    marketStateSummary: {
      regime: record.frozen.marketStateSummary.regime,
      direction: record.frozen.marketStateSummary.direction,
      location: record.frozen.marketStateSummary.location,
      volatility: record.frozen.marketStateSummary.volatility,
      session: record.frozen.marketStateSummary.session,
    },
    playbookId: record.frozen.playbook.playbookId,
    playbookVersion: record.frozen.playbook.playbookVersion,
    plan: { action: record.plan.action, expectedR: record.plan.expectedR },
    ruleAdherenceAtDecision: record.frozen.traderState.ruleAdherenceAtDecision,
    externalInfluenceFlagged: record.frozen.traderState.externalInfluenceFlagged,
    tradeNumberInSession: record.frozen.traderState.tradeNumberInSession,
    outcome: record.outcome
      ? {
          closedAt: record.outcome.closedAt,
          realizedR: record.outcome.realizedR,
          reason: record.outcome.reason,
        }
      : undefined,
    review: record.review
      ? {
          reviewedAt: record.review.reviewedAt,
          marketOpportunityQuality: record.review.marketOpportunityQuality,
          playbookMatch: record.review.playbookMatch,
          riskQuality: record.review.riskQuality,
          executionQuality: record.review.executionQuality,
          processAdherence: record.review.processAdherence,
        }
      : undefined,
  };
}

// ── Utility: enforce owner scoping at the query boundary ────────────────

/**
 * Filter a decision list to a single owner. Callers MUST pass this through
 * before rendering — never cross owners. Per Founder privacy doctrine.
 */
export function scopeToOwner(
  records: readonly DecisionMemoryRecord[],
  ownerId: string,
): readonly DecisionMemoryRecord[] {
  return records.filter((r) => r.ownerId === ownerId);
}
