/**
 * selectShutdownAdvice — canon §Daily Risk / Shutdown Rules + §10 Profit/Shutdown
 * (Top-Down Process 2026-08-24).
 *
 * Canon verbatim:
 *   "Define 1R before entry from structural invalidation and planned
 *    account loss.
 *    -2R maximum daily loss. If two authorized losses occur, stop for the day.
 *    A loss does not create permission for a recovery trade.
 *    +3R realized is the baseline shutdown objective (not a quota)."
 *
 * Deterministic advice selector that reads today's realized-R stream
 * and returns one of:
 *   OK              — no shutdown condition met; trader may continue if
 *                     they see a fresh authorized setup
 *   AT_TWO_R_STOP   — -2R hard-stop hit; canon: stop for the day
 *   AT_THREE_R_TARGET — +3R objective hit; canon: stewardship
 *                     decision (not forced stop, but protect the day)
 *   AT_TWO_LOSSES   — two authorized losses; canon: stop
 *
 * Rejection guarantees:
 *  - Empty R stream → OK (nothing to shut down against)
 *  - Never returns AT_THREE_R_TARGET when cumulative < 3 (no rounding-up)
 *  - Never returns AT_TWO_R_STOP when cumulative > -2 (no rounding-down)
 */

export type ShutdownState =
  | "OK"
  | "AT_TWO_R_STOP"
  | "AT_THREE_R_TARGET"
  | "AT_TWO_LOSSES";

export interface ShutdownAdvice {
  state: ShutdownState;
  cumulative_r: number;
  losing_trades: number;
  /** Short human string the UI can render. */
  message: string;
  canon: string;
}

export function selectShutdownAdvice(
  todaysRealizedRs: readonly number[],
): ShutdownAdvice {
  const cumulative = todaysRealizedRs.reduce((sum, r) => sum + r, 0);
  const losing_trades = todaysRealizedRs.filter((r) => r < 0).length;

  // Priority order: hard stop first, then two-loss stop, then +3R target.
  if (cumulative <= -2) {
    return {
      state: "AT_TWO_R_STOP",
      cumulative_r: cumulative,
      losing_trades,
      message: "-2R hard stop reached. Canon §Daily Risk: stop for the day.",
      canon: "§Daily Risk",
    };
  }
  if (losing_trades >= 2) {
    return {
      state: "AT_TWO_LOSSES",
      cumulative_r: cumulative,
      losing_trades,
      message: "Two authorized losses. Canon §Daily Risk: stop for the day.",
      canon: "§Daily Risk",
    };
  }
  if (cumulative >= 3) {
    return {
      state: "AT_THREE_R_TARGET",
      cumulative_r: cumulative,
      losing_trades,
      message: "+3R baseline objective reached. Canon §10: stewardship decision — protect the day.",
      canon: "§10 Profit/Shutdown",
    };
  }
  return {
    state: "OK",
    cumulative_r: cumulative,
    losing_trades,
    message: "Session open. Continue only on a fresh authorized setup.",
    canon: "§Daily Operating Loop",
  };
}
