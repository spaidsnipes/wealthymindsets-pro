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
