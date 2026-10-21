/**
 * WHAT THIS ENTRY IS STILL MISSING — Megazord order §5 step 5, "Completeness check — state what is
 * missing" (2026-10-20). PURE.
 *
 * The Journal → learning pipeline only learns from what a trade carries. A self-reported trade from
 * TradingView is as learnable as a broker fill, but only if the trader marks the process and records
 * the risk. This says, per entry, which of those are not there yet and which read each gap holds
 * back, so the gap is visible instead of the trade silently dropping out of the reads.
 *
 * Read only from the entry; nothing is inferred and nothing is filled in. Where a trade was taken is
 * OPTIONAL and never counts as missing. A saved entry has no edit (only star and delete), so the line
 * points at the NEXT trade rather than inviting a rewrite of this one.
 * Plain words, no grading of the trader.
 */

import type { JournalEntry } from "./hydrateJournalEntries";

export type CompletenessGap = {
  readonly id: "PROCESS" | "PLANNED_RISK" | "MFE" | "SETUP" | "LESSON";
  /** The form field to fill, by its name in the edit form. */
  readonly field: string;
  /** Which Journal read needs it. */
  readonly neededFor: string;
};

export type EntryCompleteness = {
  readonly gaps: readonly CompletenessGap[];
  readonly complete: boolean;
  readonly line: string;
};

type Readable = Pick<JournalEntry, "processQuality" | "realizedR" | "mfeR" | "setup" | "lessons">;

const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const written = (s: unknown): boolean => typeof s === "string" && s.trim() !== "";

export function entryCompleteness(e: Readable): EntryCompleteness {
  const gaps: CompletenessGap[] = [];
  if (e.processQuality !== "FOLLOWED_PLAN" && e.processQuality !== "BROKE_RULES")
    gaps.push({ id: "PROCESS", field: "Process quality", neededFor: "the Learning Genome's plan-followed and transfer reads" });
  if (!finite(e.realizedR))
    gaps.push({ id: "PLANNED_RISK", field: "Planned R (1R = $)", neededFor: "the result in R, this week's edge and the transfer read" });
  if (!finite(e.mfeR))
    gaps.push({ id: "MFE", field: "MFE (R)", neededFor: "the capture-efficiency read (how much of the move was kept)" });
  if (!written(e.setup))
    gaps.push({ id: "SETUP", field: "Setup", neededFor: "comparisons by setup" });
  if (!written(e.lessons))
    gaps.push({ id: "LESSON", field: "Lessons Learned", neededFor: "carrying a lesson into the next session" });
  const line = gaps.length === 0
    ? "Complete: this trade counts in every read the Journal makes."
    : `Not recorded when this trade was saved: ${gaps.map(g => g.field).join(", ")}. A saved entry is never rewritten, so record ${gaps.length === 1 ? "it" : "them"} on the next trade; nothing is guessed for this one.`;
  return { gaps, complete: gaps.length === 0, line };
}
