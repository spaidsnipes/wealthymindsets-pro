/**
 * WHICH JOURNAL RECORDS ARE TRADES.
 *
 * THE DEFECT THIS EXISTS TO STOP: canon §3 M0 means "NO TRADE — Capital
 * preservation" (see DAY_MODEL_LABELS). It is a reflective record of a day the
 * trader deliberately did not trade, and it is saved with no entry, no exit and
 * no size. `computeJournalPnl` prices that as 0, `classifyFinancialOutcome(0)`
 * calls it "be", and from there /journal counted it as a TRADE:
 *
 *     winRate  = wins / entries.length        <- an M0 day dilutes the rate
 *     setupMap[e.setup].pnl += e.pnl          <- graded a setup never taken
 *     hasJournalCoachEvidence(entries.length) <- SHARPEST: days on which no
 *                                                strategy was executed could
 *                                                push the journal over the
 *                                                minimum-sample threshold and
 *                                                unlock win-rate, R:R and
 *                                                profit-factor claims ABOUT
 *                                                THAT STRATEGY.
 *
 * The trader's discipline was being counted against their win rate. Honouring
 * a no-trade day — the single hardest habit canon §3 asks for — made their
 * numbers look worse, which is the exact opposite of what the record is for.
 *
 * DELIBERATELY NOT DONE HERE: dropping M0 records from the journal list, the
 * export, the day-model coverage meter or the ledger. They are real records of
 * real decisions and must stay visible everywhere a RECORD is counted. This
 * module answers one narrower question — is this row a TRADE, i.e. may it enter
 * an OUTCOME statistic — and nothing else.
 */

import type { DayModel } from "../proofLane/proofLaneR";

/** The only field this verdict depends on. Structural so any row shape fits. */
export interface DayModelRecord {
  readonly dayModel?: DayModel;
}

/**
 * True when the record describes a trade that was actually taken.
 *
 * A record with NO dayModel is a trade. Most of the journal predates the day
 * model and an absent field is not a claim of abstention — rounding UNKNOWN to
 * "no trade" would silently delete history from the statistics, which is the
 * same class of lie in the other direction.
 */
export function isTradeRecord(record: DayModelRecord): boolean {
  return record.dayModel !== "M0";
}

/** The subset of records that may enter an outcome statistic. */
export function selectTradeRecords<T extends DayModelRecord>(records: readonly T[]): T[] {
  return records.filter(isTradeRecord);
}

/**
 * WHAT A RECORD'S OUTCOME ACTUALLY SAYS.
 *
 * THE SECOND HALF OF THE SAME DEFECT: holding M0 days out of the statistics
 * stopped them being COUNTED as breakevens. It did not stop them being LABELLED
 * as breakevens. An M0 row still renders `result "be"` and `$0.00`, and exports
 * to CSV as `be` — pixel-for-pixel identical to a real trade the trader entered,
 * managed and scratched at their entry price.
 *
 * Those are two completely different days. One is discipline, one is a flat
 * outcome, and H13 is explicit that separate facts get separate labels and are
 * never merged. "$0.00" is a PRICE; on a no-trade day no price was paid.
 *
 * DELIBERATELY NOT DONE: adding a fourth member to the stored FinancialOutcome
 * union. That union is persisted on every historical entry and is read by seven
 * adapters across traderMemory, proofLane and learningGenome; widening it is a
 * large migration and is not what is wrong. On an M0 record `result` is not
 * holding a WRONG value — it is holding a MEANINGLESS one, because no trade
 * happened to have an outcome. The repair is that no surface reads it raw.
 */
export interface RecordOutcome {
  readonly isTrade: boolean;
  /** What the outcome chip says. Uppercase; already display-ready. */
  readonly label: string;
  /**
   * Whether a dollar figure may be shown. False on a no-trade day: rendering
   * "$0.00" would state that money changed hands and came back level.
   */
  readonly hasMoney: boolean;
}

const TRADE_OUTCOME_LABELS: Record<string, string> = {
  win: "WIN",
  loss: "LOSS",
  be: "BE",
};

export function describeRecordOutcome(
  record: DayModelRecord & { readonly result?: string },
): RecordOutcome {
  if (!isTradeRecord(record)) {
    return { isTrade: false, label: "NO TRADE", hasMoney: false };
  }
  return {
    isTrade: true,
    // An unrecognised stored value is reported as UNKNOWN rather than silently
    // shown as a breakeven — the exact substitution this module exists to end.
    label: TRADE_OUTCOME_LABELS[record.result ?? ""] ?? "UNKNOWN",
    hasMoney: true,
  };
}

/**
 * Say out loud that records were held out of a statistic, or return null when
 * none were.
 *
 * A denominator that quietly shrinks is its own defect: the trader sees a
 * different win rate than their entry count implies and has no way to learn
 * why. §8 — this is not an error, so it is not phrased as one.
 */
export function describeNoTradeExclusion(records: readonly DayModelRecord[]): string | null {
  const held = records.length - selectTradeRecords(records).length;
  if (held === 0) return null;
  return `${held} M0 NO TRADE ${held === 1 ? "day is" : "days are"} recorded but not counted here — `
    + "no trade was taken, so there is no outcome to score. "
    + `${held === 1 ? "It is" : "They are"} still in your journal and your day-model coverage.`;
}
