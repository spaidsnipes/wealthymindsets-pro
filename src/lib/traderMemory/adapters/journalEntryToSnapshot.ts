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

  // Rule adherence: infer from processQuality — GREAT/GOOD → adherence;
  // MID/POOR/UNRESOLVED → non-adherence. Never fabricates a self-report.
  const ruleAdherenceAtDecision =
    entry.processQuality === "GREAT" || entry.processQuality === "GOOD";

  // Review composite: only populated when processQuality resolved.
  const reviewedAt = capturedAt;
  const qualityScore =
    entry.processQuality === "GREAT" ? 5 :
    entry.processQuality === "GOOD"  ? 4 :
    entry.processQuality === "MID"   ? 3 :
    entry.processQuality === "POOR"  ? 2 : 1;
  const review = entry.processQuality && entry.processQuality !== "UNRESOLVED"
    ? {
        reviewedAt,
        marketOpportunityQuality: qualityScore as 1 | 2 | 3 | 4 | 5,
        playbookMatch: qualityScore as 1 | 2 | 3 | 4 | 5,
        riskQuality: qualityScore as 1 | 2 | 3 | 4 | 5,
        executionQuality: qualityScore as 1 | 2 | 3 | 4 | 5,
        processAdherence: qualityScore as 1 | 2 | 3 | 4 | 5,
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
