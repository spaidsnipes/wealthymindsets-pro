/**
 * selectDteFit — canon §8 LIQUIDITY-DECAY WINDOW / DTE LAW
 * (Top-Down Process amendment 2026-08-25 §8).
 *
 * Canon verbatim:
 *   "Time of day changes derivative expression quality; it does not
 *    choose the market model.
 *    Core law:
 *      BUY THE SHORTEST DTE THAT GIVES THE AUTHORIZED THESIS ENOUGH TIME.
 *      MINIMIZE UNNECESSARY DECAY FOR THE JOB."
 *
 * Given a candidate contract's DTE + the expected time-in-trade for
 * the thesis, this selector returns a canonical fit verdict:
 *
 *   TOO_SHORT           — DTE < expected time (canon: not enough time
 *                          for the thesis to play out)
 *   OPTIMAL             — DTE within [expected, expected + 1.5x buffer]
 *   OVER_TIMED          — DTE > expected + 1.5x (canon: unnecessary
 *                          theta decay paid for time you don't need)
 *   INSUFFICIENT_INPUT  — either input missing / non-positive
 *
 * The 1.5x buffer is canon-adjacent (not verbatim) and treated as a
 * threshold; changing it requires a canon amendment.
 */

export interface DteFitInput {
  /** Days to expiration on the contract candidate. */
  dteDays: number;
  /** Expected time-in-trade for the thesis, in days. */
  expectedHoldDays: number;
}

export type DteFitVerdict =
  | "INSUFFICIENT_INPUT"
  | "TOO_SHORT"
  | "OPTIMAL"
  | "OVER_TIMED";

export interface DteFitResult {
  verdict: DteFitVerdict;
  ratio: number | undefined;
  canon: string;
}

const OVER_TIMED_MULTIPLIER = 1.5;

function ok(n: number): boolean {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

export function selectDteFit(input: DteFitInput): DteFitResult {
  if (!ok(input.dteDays) || !ok(input.expectedHoldDays)) {
    return {
      verdict: "INSUFFICIENT_INPUT",
      ratio: undefined,
      canon: "§DTE LAW — cannot classify without both dteDays and expectedHoldDays",
    };
  }
  const ratio = input.dteDays / input.expectedHoldDays;
  if (input.dteDays < input.expectedHoldDays) {
    return {
      verdict: "TOO_SHORT",
      ratio,
      canon: "§DTE LAW — not enough time for the authorized thesis to play out",
    };
  }
  if (ratio > OVER_TIMED_MULTIPLIER) {
    return {
      verdict: "OVER_TIMED",
      ratio,
      canon: "§DTE LAW — paying unnecessary theta decay for time you do not need",
    };
  }
  return {
    verdict: "OPTIMAL",
    ratio,
    canon: "§DTE LAW — shortest DTE that fits the thesis with a safety buffer",
  };
}
