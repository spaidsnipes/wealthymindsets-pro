import {
  describeRecordCoverage,
  isJournalRecord,
  readStoredDate,
  readStoredNumber,
  readStoredProcessQuality,
  readStoredResult,
  type JournalRecordCoverage,
} from "@/lib/journal/journalRecordShape";
import type { EdgeEntry, SessionOutcome } from "./selectSessionEdge";

/**
 * THE ONE PROJECTION from a stored journal record to a session.
 *
 * ── Why "the one" is the whole point ─────────────────────────────────────────
 *
 * There were two. This file read the stored `result` field. The /morning-prep
 * adapter (`journalEntryToEdgeEntry`) DERIVED the outcome from `pnl` instead.
 * Same book, two answers, and they disagreed in both directions:
 *
 *   { date, processQuality: "FOLLOWED_PLAN" }        // no result, no pnl
 *     here            -> not a session at all
 *     /morning-prep   -> a BREAKEVEN session, because `pnl ?? 0` is 0
 *
 *   { date, result: "loss", pnl: 250 }               // stored fields disagree
 *     here            -> loss
 *     /morning-prep   -> win
 *
 * The second one is a straight contradiction. The first is worse, because it
 * is silent: a day with no trade on it became a breakeven session that EXTENDED
 * the discipline streak on the morning continuity badge. The trader was shown
 * credit for a session that does not exist, on a surface whose entire job is to
 * tell him whether he has been keeping his word.
 *
 * §24 / H21 — one owner. `journalEntryToEdgeEntry.ts` is deleted; this answers
 * for both surfaces now.
 *
 * ── What is still NOT answered here ──────────────────────────────────────────
 *
 * The record-shape questions — is this an object, is that a number WM can do
 * arithmetic with, is that one of the three outcomes — belong to
 * `journalRecordShape.ts`. This module owns only the PROJECTION: which readable
 * fields become an EdgeEntry, and what disqualifies a record from being a
 * session. It never derives R from P&L.
 */

export interface JournalEdgeProjection {
  readonly entries: readonly EdgeEntry[];
  /**
   * How many stored records became sessions, and how many did not.
   *
   * Shipped because a surface that silently drops records teaches the trader
   * that his book is smaller than it is. §24 D: WM may refuse a record it
   * cannot read, but it may not do so quietly.
   */
  readonly coverage: JournalRecordCoverage;
}

/**
 * Project stored records, preserving caller order (selectFocusStreak depends
 * on newest-first ordering for `current`).
 */
export function projectJournalRecordsToEdge(
  records: readonly unknown[],
): JournalEdgeProjection {
  const entries: EdgeEntry[] = [];

  for (const value of records) {
    if (!isJournalRecord(value)) continue;

    const date = readStoredDate(value.date);
    if (date === undefined) continue;

    const result = readStoredResult(value.result) ?? outcomeFromStoredPnl(value.pnl);
    if (result === undefined) continue;

    entries.push({
      date,
      result,
      realizedR: readStoredNumber(value.realizedR),
      processQuality: readStoredProcessQuality(value.processQuality),
      mfeR: readStoredNumber(value.mfeR),
      maeR: readStoredNumber(value.maeR),
    });
  }

  return {
    entries,
    coverage: describeRecordCoverage(records.length, entries.length),
  };
}

/** The entries alone, for callers with nothing to disclose coverage on. */
export function journalRecordsToEdgeEntries(
  records: readonly unknown[],
): readonly EdgeEntry[] {
  return projectJournalRecordsToEdge(records).entries;
}

/**
 * FALLBACK for records written before the journal stored `result` — and only
 * for those.
 *
 * ZERO IS DELIBERATELY REFUSED. `computeJournalPnl` returns the NUMBER 0 when
 * entry/exit/size are missing, documented as "nothing to price", and older
 * records were saved that way. So a stored pnl of 0 with no result is exactly
 * the ambiguous case: it is either a real breakeven or a trade WM could never
 * price, and nothing in the record distinguishes them.
 *
 * WM does not guess between those. The record is skipped and counted in the
 * coverage note, which is the honest version of the answer the old adapter
 * gave — it called every one of them a breakeven and put them in the streak.
 */
function outcomeFromStoredPnl(value: unknown): SessionOutcome | undefined {
  const pnl = readStoredNumber(value);
  if (pnl === undefined || pnl === 0) return undefined;
  return pnl > 0 ? "win" : "loss";
}
