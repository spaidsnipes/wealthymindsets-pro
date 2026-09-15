/**
 * WHICH FILLS ARE ALLOWED IN A WIN RATE — and the scratch that could not be seen.
 *
 * ── THE MEASURED DEFECT ───────────────────────────────────────────────
 * /paper rendered its Win Rate as
 *
 *     trades.filter(t => (t.pnl ?? 0) > 0).length / trades.length
 *
 * in three places. `trades` is the fill ledger, and HALF OF IT IS OPENINGS.
 * Buying one contract and later selling it at a profit is TWO trades and ONE
 * win, so that expression renders 50%. The trader won every position they
 * closed. The page told them they won half.
 *
 * The error is structural, not a rounding artefact: an opening fill realises
 * nothing, so it can never appear in the numerator, yet it sat in the
 * denominator. The rate was therefore biased DOWNWARD by construction, and the
 * bias grew with position count — the more a trader scaled in, the worse the
 * page lied about them.
 *
 * ── WHY IT COULD NOT BE FIXED WHERE IT WAS RENDERED ───────────────────
 * The obvious repair is to filter to trades that realised something. It does not
 * work, because of a second defect one layer down. `applyFill` ended with
 *
 *     if (realized !== 0) trade.pnl = realized;
 *
 * A close at EXACTLY the average price realises exactly zero. That is a real,
 * measured outcome — the scratch, the outcome trading discipline is actually
 * built around — and the line above threw the measurement away. The resulting
 * Trade has no `pnl` key, which is byte-for-byte the same record an OPENING fill
 * produces. Absence was made to mean two different things at once: "nothing was
 * realised because nothing closed" and "zero was realised and we deleted it".
 * §5 SYSTEM TRUTH LAW, and the H1 rule — absence is not zero — violated in the
 * direction nobody checks, by writing absence where a zero had been observed.
 *
 * So the ledger had to be able to SAY zero before any reader could count
 * correctly. `applyFill` now records `pnl` whenever the fill closed size,
 * including when that number is 0.
 *
 * ── WHAT THIS REFUSES TO DO ───────────────────────────────────────────
 * A trade persisted BEFORE that change, which closed flat, still has no `pnl`
 * key, and there is no field from which its scratch-ness could be recovered.
 * This module grades it `not-a-close` — the same as an opening — because the
 * alternative is to guess. That is a known, bounded, disclosed loss of fidelity
 * on historical books, not a thing to paper over with a default.
 */

/** The only field of a trade this grading is permitted to read. */
export interface PaperTradeOutcomeInput {
  readonly pnl?: number;
}

export type PaperTradeOutcome =
  /** Closed for a realised gain. */
  | "win"
  /** Closed for a realised loss. */
  | "loss"
  /** Closed at EXACTLY breakeven. A measured zero, not a missing number. */
  | "scratch"
  /**
   * Realised nothing — an opening or add fill. ALSO the grade for a historical
   * trade whose realised P&L was never recorded. Those two are genuinely
   * indistinguishable in the data; see the module note.
   */
  | "not-a-close";

/** Pure. */
export function classifyPaperTradeOutcome(trade: PaperTradeOutcomeInput): PaperTradeOutcome {
  const pnl = trade.pnl;
  // A non-finite P&L is a corrupt record, not a scratch. Refusing to grade it
  // keeps it out of BOTH the numerator and the denominator, which is the only
  // honest place for a number that cannot be trusted.
  if (typeof pnl !== "number" || !Number.isFinite(pnl)) return "not-a-close";
  if (pnl > 0) return "win";
  if (pnl < 0) return "loss";
  return "scratch";
}

/** True when this fill realised a P&L and therefore belongs in a win rate. */
export function isClosingPaperTrade(trade: PaperTradeOutcomeInput): boolean {
  return classifyPaperTradeOutcome(trade) !== "not-a-close";
}

export interface PaperWinRate {
  /** Fills that realised a P&L. The ONLY legitimate denominator. */
  readonly closed: number;
  readonly wins: number;
  readonly losses: number;
  readonly scratches: number;
  /**
   * Percent of CLOSED trades that were wins, rounded, or null when nothing has
   * closed yet.
   *
   * NULL IS NOT ZERO. A trader who has opened a position and closed nothing has
   * no win rate; rendering 0% would assert they have lost every trade they took.
   * Callers must render null as "—" and never coerce it.
   */
  readonly pct: number | null;
}

/**
 * Pure.
 *
 * A scratch sits in the denominator and NOT in the numerator: it closed, so it
 * is a completed attempt, and it was not a win. That is the conventional
 * treatment, and it is stated here rather than left implicit because it is the
 * one judgement call in this file. `scratches` is reported separately so the
 * decision is visible to the reader instead of hiding inside a percentage.
 */
export function selectPaperWinRate(trades: readonly PaperTradeOutcomeInput[]): PaperWinRate {
  let wins = 0, losses = 0, scratches = 0;
  for (const t of trades) {
    switch (classifyPaperTradeOutcome(t)) {
      case "win": wins++; break;
      case "loss": losses++; break;
      case "scratch": scratches++; break;
      default: break;
    }
  }
  const closed = wins + losses + scratches;
  return { closed, wins, losses, scratches, pct: closed === 0 ? null : Math.round((wins / closed) * 100) };
}

/**
 * The Win Rate line for the blotter: `"67% (2W/1L)"`, or null when nothing has
 * closed.
 *
 * Scratches appear in the string ONLY when there are any — a trailing `/0S` on
 * every trader's screen is noise, and this sentence exists to be read.
 */
export function describePaperWinRate(rate: PaperWinRate): string | null {
  if (rate.pct == null) return null;
  const tail = rate.scratches > 0 ? `/${rate.scratches}S` : "";
  return `${rate.pct}% (${rate.wins}W/${rate.losses}L${tail})`;
}
