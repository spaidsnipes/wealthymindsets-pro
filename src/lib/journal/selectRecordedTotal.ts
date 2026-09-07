/**
 * THE TOTAL OF RECORDS WM MAY NOT BE ABLE TO READ.
 *
 * THE DEFECT THIS EXISTS TO STOP: /journal hydrates from browser storage with
 * an UNCHECKED cast —
 *
 *     read.records as JournalEntry[]
 *
 * and `readJournalStorage` validates exactly one thing: that the parsed JSON is
 * an array. Nothing checks that a record's `pnl` is a number. It routinely
 * isn't: `JSON.stringify(NaN)` writes `null`, so any entry that ever held a
 * non-finite P&L comes back as `pnl: null` on the next load. Legacy entries,
 * hand-edited storage and partially-written records do the same.
 *
 * That value then entered `reduce((s, e) => s + e.pnl, 0)` unguarded, and
 * JavaScript's coercion rules produced THREE different lies — each verified by
 * running them, not assumed:
 *
 *   pnl: null       100 + null + 50  ->  150
 *                   Silently counted as $0.00. A fabricated breakeven inside
 *                   the total, with nothing on screen to suggest it. This is
 *                   the round-trip shape, so it is also the common one.
 *
 *   pnl missing     100 + undefined  ->  NaN  ->  fmtPnl -> "-$NaN"
 *                   And `totalPnl >= 0` is false, so the chip renders RED —
 *                   the treatment canon §9 reserves for money actually lost.
 *                   One unreadable row repaints the whole book as a loss.
 *
 *   pnl: "250.00"   100 + "250.00"   ->  "100250.00"
 *                   String concatenation. A $100 trade and a $250 trade total
 *                   $100,250.00 — a fabricated number off by three orders of
 *                   magnitude, rendered with total confidence.
 *
 * The third is the one that should never be survivable: WM stating a dollar
 * figure the trader never made, in the styling it uses for facts.
 *
 * Absence is not zero, and this is the arithmetic form of it: a sum is either
 * COMPLETE, or it covers only part of the book and must say so.
 */

export type RecordedTotalStatus = "COMPLETE" | "PARTIAL" | "UNKNOWN";

export interface RecordedTotal {
  readonly status: RecordedTotalStatus;
  /** Dollars. NULL — never 0 — when nothing could be read. */
  readonly total: number | null;
  readonly counted: number;
  readonly unreadable: number;
  /** Present exactly when the sum does not cover every record. */
  readonly note: string | null;
}

export interface SummableRecord {
  readonly pnl?: unknown;
}

/**
 * Sum the P&L WM can actually read, and report how much of the book that is.
 *
 * An EMPTY journal totals a genuine $0.00 and is COMPLETE — there is nothing
 * unread about having recorded nothing. A journal in which NOTHING is readable
 * is UNKNOWN with a null total, because 0 would be a claim about money.
 */
export function selectRecordedTotal(records: readonly SummableRecord[]): RecordedTotal {
  let total = 0;
  let counted = 0;
  for (const record of records) {
    const value = record.pnl;
    // `null` (a NaN round-tripped through JSON.stringify), undefined, strings
    // and Infinity are all "WM cannot read this", never "this one was flat".
    if (typeof value === "number" && Number.isFinite(value)) {
      total += value;
      counted += 1;
    }
  }
  const unreadable = records.length - counted;

  if (unreadable === 0) {
    return { status: "COMPLETE", total, counted, unreadable: 0, note: null };
  }
  if (counted === 0) {
    return {
      status: "UNKNOWN",
      total: null,
      counted: 0,
      unreadable,
      note: `WM could not read a dollar result on any of your ${unreadable} `
        + `${unreadable === 1 ? "record" : "records"}, so there is no total to show. `
        + "Your records are unchanged — open one to add its entry, exit and size.",
    };
  }
  return {
    status: "PARTIAL",
    total,
    counted,
    unreadable,
    note: `This total covers ${counted} of ${records.length} records. `
      + `WM could not read a dollar result on the other ${unreadable}, so `
      + `${unreadable === 1 ? "it is" : "they are"} not included. `
      + "Nothing was lost — open a record to add its missing values.",
  };
}
