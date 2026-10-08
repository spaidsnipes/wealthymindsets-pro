/**
 * THE n ≥ 20 GUARD FOR EVERY RATE OR RATIO A TRADER READS ABOUT THEMSELVES.
 * PURE. One owner of the threshold and the words.
 *
 * Win rate, expectancy, profit factor, average R:R and per-group rates are
 * measurements; below 20 closed trades they are INSUFFICIENT EVIDENCE — the
 * same rule and wording Personal Edge uses (planAdherence, founderAnalytics,
 * ledgerEdge.MIN_SAMPLE, ledgerTimeline.MIN_WINDOW all hold 20). Counts and
 * sums (trades, wins, losses, net P&L) are facts at any n and are not guarded.
 */

import { PATTERN_SAMPLE_MIN } from "./founderAnalytics";

export const STAT_SAMPLE_MIN = PATTERN_SAMPLE_MIN;

export const INSUFFICIENT = "INSUFFICIENT EVIDENCE";

/** "INSUFFICIENT EVIDENCE — 7 of 20 closed trades so far" */
export function insufficientLine(n: number): string {
  return `${INSUFFICIENT} — ${n} of ${STAT_SAMPLE_MIN} closed trades so far`;
}

export function isMeasured(n: number): boolean {
  return Number.isFinite(n) && n >= STAT_SAMPLE_MIN;
}

export interface GuardedStat {
  /** The measured text, or "INSUFFICIENT EVIDENCE" below 20. */
  readonly text: string;
  readonly state: "MEASURED" | "INSUFFICIENT EVIDENCE";
  /** The count line under the tile when not measured; null when measured. */
  readonly note: string | null;
}

/** A rate / ratio over `n` closed trades: its text only at n ≥ 20. */
export function guardStat(n: number, measuredText: string): GuardedStat {
  return isMeasured(n)
    ? { text: measuredText, state: "MEASURED", note: null }
    : { text: INSUFFICIENT, state: "INSUFFICIENT EVIDENCE", note: insufficientLine(Math.max(0, n)) };
}

/** A table cell: the value at n ≥ 20, else "—" (the row's own INSUFFICIENT label says why). */
export function guardCell(n: number, measuredText: string): string {
  return isMeasured(n) ? measuredText : "—";
}
