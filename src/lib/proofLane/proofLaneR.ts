/**
 * proofLaneR — pure R math + Model 0/1/2 classification for the Proof Lane.
 *
 * Founder canon: 3·6·9·12 Challenge Engine v0.2 §4 Daily Risk & Shutdown,
 * §6 Contract Lens, §24 Model Integration.
 *
 * Two truths this module enforces:
 *  1. R and option-premium return are DIFFERENT measurements. Never merged.
 *     Canon §24 example: $100 contract with $20 predefined structural
 *     risk → 1R = $20. +20% contract return = +1R. +100% return = +5R.
 *  2. Capital deployed ≠ capital risked. 1R is defined by planned
 *     structural loss, not by option premium.
 *
 * All exports are pure functions with deterministic outputs. No I/O.
 */

/** Day model per canon §3 + §24. */
export type DayModel = "M0" | "M1" | "M2";

export const DAY_MODEL_LABELS: Record<DayModel, string> = {
  M0: "NO TRADE — Capital preservation",
  M1: "TREND / EXPANSION — 3R baseline, 4R/5R+ A+ standard",
  M2: "CHOP / ROTATION — 1R baseline, 2R+ only on fresh expansion",
};

/** Session-end shutdown state per canon §4. */
export type ShutdownState = "OPEN" | "AT_TWO_R_STOP" | "AT_THREE_R_TARGET";

/** Input to compute realized R from a single closed trade. */
export interface TradeRInput {
  /** Planned structural loss in $ (defines 1R). Canon §4 required pre-entry. */
  plannedRDollars: number;
  /** Realized P&L in $ (positive = win). */
  realizedPnlDollars: number;
}

/**
 * Convert a closed trade's dollar P&L into R.
 * Canon: R = realized_pnl / planned_R_dollars.
 * Never uses premium % as R. Rejection guarantee: throws on missing plan.
 */
export function realizedR(input: TradeRInput): number {
  if (!(input.plannedRDollars > 0)) {
    throw new Error("proofLaneR: plannedRDollars must be > 0 (canon §4 requires 1R defined before entry)");
  }
  return input.realizedPnlDollars / input.plannedRDollars;
}

export interface ContractReturnInput {
  entryPremiumPerContract: number;
  exitPremiumPerContract: number;
}

/**
 * Return the CONTRACT premium percentage change (not R).
 * Canon §6 Contract Lens: record separately from R.
 */
export function contractReturnPct(input: ContractReturnInput): number {
  if (!(input.entryPremiumPerContract > 0)) {
    throw new Error("proofLaneR: entryPremiumPerContract must be > 0");
  }
  return (input.exitPremiumPerContract - input.entryPremiumPerContract) / input.entryPremiumPerContract;
}

export interface DayShutdownInput {
  /** All closed R values so far this session. */
  closedRs: readonly number[];
  /** Canon §4: -2R maximum daily loss ends the session. */
  maxDailyLossR?: number;
  /** Canon §4: +3R realized is a baseline shutdown OBJECTIVE (not quota). */
  shutdownTargetR?: number;
}

/**
 * Evaluate whether the session should stop per canon §4.
 * Returns AT_TWO_R_STOP once cumulative R ≤ -2R (hard stop),
 * AT_THREE_R_TARGET once cumulative R ≥ +3R (optional stewardship stop),
 * OPEN otherwise.
 */
export function evaluateShutdown(input: DayShutdownInput): {
  state: ShutdownState;
  cumulativeR: number;
  reason: string;
} {
  // This is a RISK CONTROL — the gate that stops a spiralling session. It must
  // not silently return the permissive "OPEN" when its inputs are unresolvable.
  //
  // A non-finite R makes BOTH comparisons below false (NaN <= x and NaN >= y are
  // each false), so a corrupted entry would have reported "Session open." while
  // the chip rendered "NaNR" — the hard stop simply never fires. The live caller
  // (/journal) filters with Number.isFinite first, so this was latent, but the
  // primitive must defend itself rather than trust every future caller. This
  // module already throws on unresolvable input (see realizedR), so failing loud
  // is the established convention here rather than a new one.
  for (const r of input.closedRs) {
    if (!Number.isFinite(r)) {
      throw new Error(
        "proofLaneR: closedRs contains a non-finite R — the daily-loss stop cannot be evaluated from unresolved input (canon §5: if state cannot be resolved, do not report a permissive state).",
      );
    }
  }

  // Sign-convention guard. The default is -2 (negative = loss), but a caller
  // passing `maxDailyLossR: 2` meaning "2R of loss" would make `cumulative <= 2`
  // true for almost any session and trip the hard stop immediately. Normalise to
  // a negative magnitude so both spellings mean the same thing.
  const rawMaxLoss = input.maxDailyLossR ?? -2;
  const maxLoss = rawMaxLoss > 0 ? -rawMaxLoss : rawMaxLoss;
  const target = input.shutdownTargetR ?? 3;
  const cumulative = input.closedRs.reduce((a, b) => a + b, 0);
  if (cumulative <= maxLoss) {
    return {
      state: "AT_TWO_R_STOP",
      cumulativeR: cumulative,
      reason: `Session at ${maxLoss}R — canon §4 hard daily-loss stop. Re-entry restarts at Regime.`,
    };
  }
  if (cumulative >= target) {
    return {
      state: "AT_THREE_R_TARGET",
      cumulativeR: cumulative,
      reason: `Session at ${target}R baseline objective — no daily quota to exceed.`,
    };
  }
  return { state: "OPEN", cumulativeR: cumulative, reason: "Session open." };
}

/**
 * Input for classifying a day into Model 0 / 1 / 2 per canon §3.
 * These are the pre-entry authorization inputs, not post-hoc labels.
 */
export interface DayModelInput {
  /** Full trade-chain aligned? (regime → direction → external → location → OF/CVD → CLC). */
  fullChainAligned: boolean;
  /** Available R runway before structural invalidation, in R units. */
  availableRunwayR: number;
  /** Chart character: TREND | CHOP | UNCLEAR. */
  regime: "TREND" | "CHOP" | "UNCLEAR";
  /** At a legitimate range edge? (only meaningful for CHOP). */
  atRangeEdge: boolean;
  /** CLC (canonical location confirmation) sufficient? */
  clcSufficient: boolean;
}

/**
 * Classify a day per canon §3.
 * Rejection guarantees:
 *  - No green-day COUNT creates permission to trade.
 *  - Middle-of-range guessing is NOT M2.
 *  - Insufficient CLC or unclear regime forces M0.
 */
export function classifyDayModel(input: DayModelInput): DayModel {
  if (!input.clcSufficient || input.regime === "UNCLEAR" || !input.fullChainAligned) {
    return "M0";
  }
  if (input.regime === "TREND" && input.availableRunwayR >= 3) {
    return "M1";
  }
  if (input.regime === "CHOP" && input.atRangeEdge && input.availableRunwayR >= 1) {
    return "M2";
  }
  return "M0";
}

/** Combine session R events into a running balance-in-R sequence. */
export function cumulativeRPath(closedRs: readonly number[]): number[] {
  const out: number[] = [];
  let acc = 0;
  for (const r of closedRs) {
    acc += r;
    out.push(acc);
  }
  return out;
}
