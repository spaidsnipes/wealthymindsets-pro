/**
 * WHAT A STORED JOURNAL RECORD IS.
 *
 * THE DEFECT THIS EXISTS TO STOP: `readJournalStorage` is the canonical owner
 * of the journal bytes, and it validates exactly ONE thing — that the parsed
 * JSON is an array. It then hands back `readonly unknown[]` and lets each
 * consumer decide what a record is. Five of them do, five different ways:
 *
 *   /journal                  read.records as JournalEntry[]          UNCHECKED
 *   /morning-prep             read.records as AdaptableJournalEntry[] UNCHECKED
 *   useJournalSnapshots       read.records as AdaptableJournalEntry[] UNCHECKED
 *   journalEdgeAdapter        hand-rolled isRecord / finite / result checks
 *   useLearningGenomeBundle   a SECOND hand-rolled copy of the same checks
 *
 * The last two are near-identical: same object guard, same finite-number
 * guard, same win/loss/be check, same processQuality and dayModel narrowing,
 * written twice. Two copies of a rule is how the first one stops being true.
 *
 * The three casts are worse. They are a promise to the type system that the
 * bytes in a browser's localStorage have a shape nobody checked — which is how
 * `pnl: null` reached `reduce((s, e) => s + e.pnl, 0)` and produced a total
 * built out of coercion.
 *
 * This module is the one place that answers "what is a record, and which of
 * its fields can WM actually read". It deliberately does NOT project to a
 * target shape: the adapters legitimately build different things (EdgeEntry,
 * MisreadEntry). What they must share is the QUESTION, not the answer.
 */

export type StoredTradeResult = "win" | "loss" | "be";
export type StoredDayModel = "M0" | "M1" | "M2";
export type StoredProcessQuality = "FOLLOWED_PLAN" | "BROKE_RULES" | "UNRESOLVED";

/** A parsed object. Arrays and null are not records, despite `typeof`. */
export function isJournalRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A number WM can do arithmetic with, or undefined.
 *
 * `null` (what `JSON.stringify` writes for NaN), missing fields, numeric
 * STRINGS and Infinity are all undefined here. The string case matters most:
 * `100 + "250.00"` is `"100250.00"`, so a stored string does not merely fail
 * to add — it fabricates a number three orders of magnitude wrong.
 */
export function readStoredNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** A non-empty date string, or undefined. A blank date is not a date. */
export function readStoredDate(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

/** Only the three outcomes WM actually writes. Anything else is unknown. */
export function readStoredResult(value: unknown): StoredTradeResult | undefined {
  return value === "win" || value === "loss" || value === "be" ? value : undefined;
}

/** Canon §3 day model, or undefined. Absent is NOT rounded to M0. */
export function readStoredDayModel(value: unknown): StoredDayModel | undefined {
  return value === "M0" || value === "M1" || value === "M2" ? value : undefined;
}

/**
 * Canon: UNRESOLVED is the honest default. It is neither pride nor shame, and
 * it is what an unrecognised or absent value means — never FOLLOWED_PLAN,
 * which would credit the trader with discipline they did not record.
 */
export function readStoredProcessQuality(value: unknown): StoredProcessQuality {
  return value === "FOLLOWED_PLAN" || value === "BROKE_RULES" ? value : "UNRESOLVED";
}

/**
 * HOW MUCH OF A STORED BOOK WM CAN READ.
 *
 * Both existing adapters `continue` past a record they cannot parse. That is
 * correct — but it is SILENT, so a journal in which half the records are
 * unreadable reports confident statistics over the other half and says
 * nothing. Counting the skips is what lets a surface disclose it.
 */
export interface JournalRecordCoverage {
  readonly readable: number;
  readonly skipped: number;
  readonly note: string | null;
}

export function describeRecordCoverage(
  total: number,
  readable: number,
): JournalRecordCoverage {
  const skipped = total - readable;
  if (skipped <= 0) return { readable, skipped: 0, note: null };
  return {
    readable,
    skipped,
    note: `${readable} of ${total} saved records could be read. `
      + `WM could not make sense of the other ${skipped} and left `
      + `${skipped === 1 ? "it" : "them"} out rather than guessing. `
      + "Nothing was deleted.",
  };
}
