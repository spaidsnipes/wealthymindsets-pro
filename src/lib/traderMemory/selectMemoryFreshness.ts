/**
 * selectMemoryFreshness — "how current is my own trading memory?"
 *
 * The Growth tab shows a trader's Personal Edge, but nothing tells them whether
 * that edge is built on RECENT process or on stale history they've drifted from.
 * This pure selector answers: when did I last record/close/review a decision,
 * how many decisions exist, and how many are still unreviewed.
 *
 * Fail-closed: no decisions → EMPTY (never a fabricated "active"). Every state
 * is derived from real snapshot timestamps.
 */

export type MemoryFreshnessState = "EMPTY" | "ACTIVE" | "AGING" | "DORMANT";

/** Only the timestamp-bearing fields the selector needs (subset of DecisionMemorySnapshot). */
export interface DecisionTimeLike {
  readonly capturedAt: number;
  readonly outcome?: { readonly closedAt: number } | null;
  readonly review?: { readonly reviewedAt: number } | null;
}

export interface MemoryFreshness {
  readonly count: number;
  readonly reviewedCount: number;
  readonly openCount: number; // decisions with no outcome yet
  /** Most recent activity across captured/closed/reviewed, or null when empty. */
  readonly lastActivityAtMs: number | null;
  /** nowMs − lastActivityAtMs, clamped ≥ 0, or null when empty. */
  readonly ageMs: number | null;
  readonly state: MemoryFreshnessState;
}

const DAY_MS = 86_400_000;
export const MEMORY_ACTIVE_MAX_MS = DAY_MS;       // < 1 day → ACTIVE
export const MEMORY_AGING_MAX_MS = 7 * DAY_MS;    // < 7 days → AGING, else DORMANT

function isPos(n: number | null | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

export function selectMemoryFreshness(
  decisions: readonly DecisionTimeLike[],
  nowMs: number,
): MemoryFreshness {
  if (!decisions.length) {
    return { count: 0, reviewedCount: 0, openCount: 0, lastActivityAtMs: null, ageMs: null, state: "EMPTY" };
  }

  let reviewedCount = 0;
  let openCount = 0;
  let lastActivityAtMs: number | null = null;
  const bump = (t: number | null | undefined) => {
    if (isPos(t)) lastActivityAtMs = lastActivityAtMs == null ? t : Math.max(lastActivityAtMs, t);
  };

  for (const d of decisions) {
    bump(d.capturedAt);
    if (d.outcome) bump(d.outcome.closedAt);
    else openCount += 1;
    if (d.review) { reviewedCount += 1; bump(d.review.reviewedAt); }
  }

  const ageMs = lastActivityAtMs == null ? null : Math.max(0, nowMs - lastActivityAtMs);
  const state: MemoryFreshnessState =
    ageMs == null ? "DORMANT" // decisions exist but no valid timestamp — treat as dormant, not active
    : ageMs < MEMORY_ACTIVE_MAX_MS ? "ACTIVE"
    : ageMs < MEMORY_AGING_MAX_MS ? "AGING"
    : "DORMANT";

  return { count: decisions.length, reviewedCount, openCount, lastActivityAtMs, ageMs, state };
}
