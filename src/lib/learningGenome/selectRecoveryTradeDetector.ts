/**
 * selectRecoveryTradeDetector — canon §Daily Risk + §17 Mental Gate.
 *
 * Canon (verbatim, Top-Down Process §Daily Risk):
 *   "A loss does not create permission for a recovery trade.
 *    Every re-entry returns to Regime and requires the full chain again."
 *
 * Deterministic detector: scans the same-day entry stream for the
 * signature of a RECOVERY TRADE — a trade taken immediately after a
 * loss without a canonically-implausible amount of time or evidence
 * between them.
 *
 * A recovery-trade candidate is any entry that:
 *   - has processQuality = BROKE_RULES
 *   - is preceded (same day) by an entry with realizedR < 0
 *   - is not the first entry of the day
 *
 * This is a HEURISTIC signal (canon calls out revenge trading as a
 * behavioral pattern, not a hard error). It exists to surface the
 * pattern honestly in Journal review; it never blocks logging.
 *
 * Rejection guarantees:
 *  - Empty input → empty result
 *  - Different-day entries never contribute to same-day detection
 *  - FOLLOWED_PLAN trades are never flagged, even if preceded by a
 *    loss (canon: a fresh authorized setup is not revenge)
 */

import type { EdgeEntry } from "../proofLane/selectSessionEdge";

export interface RecoveryCandidate {
  /** ISO date of the day. */
  date: string;
  /** Index of the recovery-flagged entry within the day's stream (0-based). */
  index_in_day: number;
  /** Realized R of the preceding losing trade that day. */
  preceding_loss_r: number;
}

export interface RecoveryDetectorResult {
  candidates: readonly RecoveryCandidate[];
  days_scanned: number;
  sample_size: number;
}

export function selectRecoveryTradeDetector(
  entries: readonly EdgeEntry[],
): RecoveryDetectorResult {
  if (entries.length === 0) {
    return { candidates: [], days_scanned: 0, sample_size: 0 };
  }

  // Group by date preserving array order (which we take as chronological
  // within a day; callers pass their existing sort).
  const byDay = new Map<string, EdgeEntry[]>();
  for (const e of entries) {
    if (!e.date) continue;
    const arr = byDay.get(e.date) ?? [];
    arr.push(e);
    byDay.set(e.date, arr);
  }

  const candidates: RecoveryCandidate[] = [];
  for (const [date, dayEntries] of byDay.entries()) {
    // Assume the caller passes entries in the order they were logged
    // (Journal is stored newest-first — but for same-day detection
    // that ordering is fine: we're looking at siblings, not time).
    // Iterate 1..n; a "preceding" losing trade is any earlier entry
    // (which, in newest-first order, is a LATER index).
    // To keep behavior obvious, we treat the array as "oldest first"
    // for detection purposes: reverse the day slice.
    const chrono = [...dayEntries].reverse();
    for (let i = 1; i < chrono.length; i++) {
      const e = chrono[i]!;
      if (e.processQuality !== "BROKE_RULES") continue;
      const prev = chrono[i - 1]!;
      const prevR = prev.realizedR;
      if (typeof prevR !== "number" || prevR >= 0) continue;
      candidates.push({
        date,
        index_in_day: i,
        preceding_loss_r: prevR,
      });
    }
  }

  return {
    candidates,
    days_scanned: byDay.size,
    sample_size: entries.length,
  };
}
