/**
 * readTapeSide — the ONE verdict on which side took the aggressive tape.
 *
 * Sheriff receipt (serving NQ1! 5m, 2026-10-08 07:20 CDT, Smart Money panel):
 * one tape, one moment, five answers. Delta Domination "50% / 50% · Dead even"
 * with "buyers dominate the tape … Possible reversal up" directly under it;
 * Tape Pressure "BALANCED"; the Order Flow row "Aggressive buyers … dominate
 * the tape" on 541 vs 537; Regime "Buy-side tape". Each card had its own
 * threshold (55 %, 65 %, any sign of delta). This module is the only place a
 * side is decided; every card speaks its words.
 *
 * Observation only: it names who took the larger share of aggressive volume
 * in the window. It never predicts, never advises, never scores.
 * PURE — no clock, no I/O, no React.
 */

export type TapeSide = "BUYERS" | "SELLERS" | "BALANCED" | "NO_TAPE";

/** A side is named only when it took at least this share of aggressive volume. */
export const TAPE_SIDE_SHARE_PCT = 55;

export interface TapeSideVerdict {
  readonly side: TapeSide;
  /** Buyers' share of aggressive volume, 0–100, or null without tape. */
  readonly buyPct: number | null;
  readonly sellPct: number | null;
  /** One observational sentence, the same on every card. */
  readonly words: string;
}

export function readTapeSide(askVol: number, bidVol: number, hasFlow: boolean): TapeSideVerdict {
  const a = Number.isFinite(askVol) && askVol > 0 ? askVol : 0;
  const b = Number.isFinite(bidVol) && bidVol > 0 ? bidVol : 0;
  const total = a + b;
  if (!hasFlow || total <= 0) {
    return { side: "NO_TAPE", buyPct: null, sellPct: null, words: "No signed tape — the side that took aggressive volume is not measured." };
  }
  const buyPct = Math.round((a / total) * 100);
  const sellPct = 100 - buyPct;
  if (buyPct >= TAPE_SIDE_SHARE_PCT) {
    return { side: "BUYERS", buyPct, sellPct, words: `Buyers took ${buyPct}% of aggressive volume in this window.` };
  }
  if (sellPct >= TAPE_SIDE_SHARE_PCT) {
    return { side: "SELLERS", buyPct, sellPct, words: `Sellers took ${sellPct}% of aggressive volume in this window.` };
  }
  return {
    side: "BALANCED",
    buyPct,
    sellPct,
    words: `Neither side took ${TAPE_SIDE_SHARE_PCT}% of aggressive volume (buyers ${buyPct}% · sellers ${sellPct}%).`,
  };
}

/** Observed direction of the tape verdict, for colour; null when no side leads. */
export function tapeSideLeans(v: TapeSideVerdict): boolean | null {
  return v.side === "BUYERS" ? true : v.side === "SELLERS" ? false : null;
}
