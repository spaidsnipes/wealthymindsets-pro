import {
  isJournalRecord,
  readStoredDate,
  readStoredNumber,
  readStoredProcessQuality,
  readStoredResult,
} from "@/lib/journal/journalRecordShape";
import type { EdgeEntry, SessionOutcome } from "./selectSessionEdge";

/**
 * Pure, order-preserving projection. It never derives R from P&L.
 *
 * The record-shape questions — is this an object, is that a number WM can do
 * arithmetic with, is that one of the three outcomes — are NOT answered here.
 * They were, in a local `isRecord`/`finite` pair that `useLearningGenomeBundle`
 * carried a near-identical second copy of. Two copies of a rule is how the
 * first one stops being true, and they had already drifted: this file rejected
 * a whitespace-only date and that one accepted it. §24 / H21 — one owner.
 *
 * What stays here is the projection: which of the readable fields become an
 * EdgeEntry, and that a record without a date or a recognised result is not a
 * session at all. That is this adapter's own question, not a shared one.
 */
export function journalRecordsToEdgeEntries(records: readonly unknown[]): readonly EdgeEntry[] {
  const entries: EdgeEntry[] = [];
  for (const value of records) {
    if (!isJournalRecord(value)) continue;
    const date = readStoredDate(value.date);
    if (date === undefined) continue;
    const result = readStoredResult(value.result);
    if (result === undefined) continue;
    entries.push({
      date,
      result: result as SessionOutcome,
      realizedR: readStoredNumber(value.realizedR),
      processQuality: readStoredProcessQuality(value.processQuality),
      mfeR: readStoredNumber(value.mfeR),
      maeR: readStoredNumber(value.maeR),
    });
  }
  return entries;
}
