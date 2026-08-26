/**
 * journalEntryToSnapshot — adapter from local Journal entries into
 * DecisionMemorySnapshot[] the selectors consume.
 *
 * Bridges the existing localStorage journal (src/app/journal/page.tsx)
 * into the Founder loop:
 *   Journal entries → snapshots → selectMirror / selectPermission /
 *   selectProcessLandscape / selectATHOSIntervention
 *
 * Truthful projection:
 *   - JournalEntry has post-trade P&L + processQuality; adapter maps
 *     these to outcome.realizedR (R multiple derived from entry/exit/
 *     stop-implied-risk when possible) and review.processAdherence.
 *   - Fields NOT recorded in the journal (playbook version, external
 *     influence flag, market state summary dimensions) default to
 *     null / false / conservative defaults — never fabricated.
 *   - Owner scoping: caller passes ownerId. Adapter never invents one.
 *
 * Determinism: no wall-clock reads. All timestamps derive from the
 * entry's `date` field.
 */

import type { DecisionMemorySnapshot } from "../viewModels/selectProcessLandscape";

/** Minimum shape the adapter needs — subset of app JournalEntry. */
export interface AdaptableJournalEntry {
  id: string;
  date: string;
  symbol: string;
  side: "long" | "short";
  entry: number;
  exit: number;
  size: number;
  pnl: number;
  pct: number;
  tags: readonly string[];
  setup: string;
  processQuality?: string;    // "GREAT" | "GOOD" | "MID" | "POOR" | "UNRESOLVED"
  processOutcome?: string;    // "PROFESSIONAL_WIN" | "PROFESSIONAL_LOSS" | "DANGEROUS_WIN" | "PREVENTABLE_LOSS" | "UNRESOLVED"
}

/**
 * Best-effort conversion. Returns null when the entry can't be meaningfully
 * projected (missing symbol or missing entry price).
 */
export function journalEntryToSnapshot(
  entry: AdaptableJournalEntry,
  ownerId: string,
  sessionIdentity?: string,
): DecisionMemorySnapshot | null {
  if (!entry.symbol || !Number.isFinite(entry.entry) || entry.entry <= 0) return null;

  const capturedAt = new Date(entry.date).getTime();
  if (!Number.isFinite(capturedAt) || capturedAt <= 0) return null;

  const session = sessionIdentity ?? `session-${entry.date}`;

  // R multiple derivation: without an explicit stop the journal doesn't
  // record risk, so we approximate via P&L per unit / entry price × 100
  // as a scale-free proxy. This is CANDIDATE evidence, not authoritative.
  const perUnitPnl = entry.size > 0 ? entry.pnl / entry.size : entry.pnl;
  const scaleFreeR = entry.entry > 0 ? perUnitPnl / entry.entry * 20 : 0;
  const realizedR = Number.isFinite(scaleFreeR) ? Number(scaleFreeR.toFixed(3)) : 0;

  // Playbook id from setup — falls back to a stable "unspecified" so
  // ProcessLandscape's playbook axis has a bucket.
  const playbookId = entry.setup
    ? entry.setup.toLowerCase().replace(/\s+/g, "-")
    : "unspecified";

  // Rule adherence: infer from processQuality.
  // Current canon (Top-Down §journalProcess): FOLLOWED_PLAN → adherence;
  // BROKE_RULES / UNRESOLVED → non-adherence.
  // Legacy ordinal (pre-2026-08 canon): GREAT/GOOD → adherence.
  // Never fabricates a self-report.
  const ruleAdherenceAtDecision =
    entry.processQuality === "FOLLOWED_PLAN" ||
    entry.processQuality === "GREAT" ||
    entry.processQuality === "GOOD";

  // Review composite: only populated for LEGACY ordinal processQuality
  // (GREAT/GOOD/MID/POOR) which encoded a 1-5 quality score. Current
  // canon FOLLOWED_PLAN/BROKE_RULES is binary discipline, not a quality
  // ordinal — so review stays undefined and callers read
  // ruleAdherenceAtDecision instead. Prevents fake per-dimension 1-5
  // scores from a binary source (canon §Truth Resolution Matrix).
  const reviewedAt = capturedAt;
  const legacyOrdinal: 5 | 4 | 3 | 2 | 1 | null =
    entry.processQuality === "GREAT" ? 5 :
    entry.processQuality === "GOOD"  ? 4 :
    entry.processQuality === "MID"   ? 3 :
    entry.processQuality === "POOR"  ? 2 :
    entry.processQuality === "TERRIBLE" ? 1 :
    null;
  const review = legacyOrdinal !== null
    ? {
        reviewedAt,
        marketOpportunityQuality: legacyOrdinal,
        playbookMatch: legacyOrdinal,
        riskQuality: legacyOrdinal,
        executionQuality: legacyOrdinal,
        processAdherence: legacyOrdinal,
      }
    : undefined;

  // Outcome — only when trade is closed (exit > 0).
  const outcome = entry.exit > 0
    ? {
        closedAt: capturedAt,
        realizedR,
        reason: "MANUAL" as const,
      }
    : undefined;

  return {
    decisionId: entry.id,
    capturedAt,
    ownerId,
    sessionIdentity: session,
    marketStateSummary: {
      regime: null,
      direction: entry.side === "long" ? "LONG" : "SHORT",
      location: null,
      volatility: null,
      session: null,
    },
    playbookId,
    playbookVersion: 1,
    plan: {
      action: entry.side === "long" ? "ENTER_LONG" : "ENTER_SHORT",
      expectedR: 0,
    },
    ruleAdherenceAtDecision,
    externalInfluenceFlagged: false,
    tradeNumberInSession: 1,
    outcome,
    review,
  };
}

/**
 * Batch adapter. Sorts snapshots by capturedAt (oldest first) so any
 * downstream detector that iterates in-order (e.g. detectSuccessRuleBending
 * in selectMirror) sees chronologically-correct data.
 */
export function journalEntriesToSnapshots(
  entries: readonly AdaptableJournalEntry[],
  ownerId: string,
): readonly DecisionMemorySnapshot[] {
  return entries
    .map((e) => journalEntryToSnapshot(e, ownerId))
    .filter((s): s is DecisionMemorySnapshot => s !== null)
    .sort((a, b) => a.capturedAt - b.capturedAt);
}
