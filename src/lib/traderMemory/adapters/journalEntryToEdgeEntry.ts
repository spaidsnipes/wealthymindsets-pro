/**
 * journalEntryToEdgeEntry — adapter from AdaptableJournalEntry to
 * proofLane EdgeEntry.
 *
 * Two surfaces (/journal week block, /morning-prep continuity badge)
 * need EdgeEntry-shaped input for the learningGenome streak selectors.
 * Both call this helper so a single map keeps them consistent, and
 * the legacy processQuality vocabulary (GREAT/GOOD/MID/POOR/TERRIBLE)
 * maps to the current canon (FOLLOWED_PLAN/BROKE_RULES/UNRESOLVED) in
 * exactly one place.
 *
 * Canon anchors:
 *  - §journalProcess FOLLOWED_PLAN / BROKE_RULES / UNRESOLVED
 *  - §Public Blessing streak selectors
 *  - §Loss-as-Data — result derived from pnl sign, not from streak
 *    self-report (a plan-followed loss is still a loss).
 */

import type { AdaptableJournalEntry } from "./journalEntryToSnapshot";
import type {
  EdgeEntry,
  SessionOutcome,
  SessionProcess,
} from "../../proofLane/selectSessionEdge";

/**
 * Map a journal entry's freeform processQuality string to the canon
 * three-value SessionProcess enum. Case-insensitive, tolerant of
 * whitespace, absent values become UNRESOLVED (canon: perception gap
 * counts as broken).
 */
export function normalizeSessionProcess(
  raw: string | undefined | null,
): SessionProcess {
  const q = String(raw ?? "").trim().toUpperCase();
  // Current canon
  if (q === "FOLLOWED_PLAN") return "FOLLOWED_PLAN";
  if (q === "BROKE_RULES") return "BROKE_RULES";
  // Legacy ordinal (5-tier). GREAT/GOOD → FOLLOWED_PLAN. POOR/TERRIBLE
  // → BROKE_RULES. MID stays UNRESOLVED (neither pride nor shame).
  if (q === "GREAT" || q === "GOOD") return "FOLLOWED_PLAN";
  if (q === "POOR" || q === "TERRIBLE") return "BROKE_RULES";
  return "UNRESOLVED";
}

/**
 * Derive outcome from pnl sign. Zero pnl = BE (break-even), not a
 * loss. Undefined/null pnl treated as 0 (canon: absence is not a loss).
 */
export function normalizeSessionOutcome(pnl: number | undefined | null): SessionOutcome {
  const p = typeof pnl === "number" && Number.isFinite(pnl) ? pnl : 0;
  if (p > 0) return "win";
  if (p < 0) return "loss";
  return "be";
}

/** Pure map — only fields the streak selectors read. */
export function journalEntryToEdgeEntry(entry: AdaptableJournalEntry): EdgeEntry {
  return {
    date: entry.date,
    result: normalizeSessionOutcome(entry.pnl),
    processQuality: normalizeSessionProcess(entry.processQuality),
  };
}

/** Batch — preserves caller's input order (needed for focus-streak `current`). */
export function journalEntriesToEdgeEntries(
  entries: readonly AdaptableJournalEntry[],
): readonly EdgeEntry[] {
  return entries.map(journalEntryToEdgeEntry);
}
