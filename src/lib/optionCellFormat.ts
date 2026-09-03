/**
 * Option chain cell formatting — absence must never render as a measurement.
 *
 * Real defect (2026-09-03), OptionsChain.tsx:
 *   cBid: call?.bid ?? 0,  cIV: call?.impliedVolatility ?? 0,  cDelta: ... ?? 0
 *
 * When a strike had no call (or no put), every cell rendered a confident
 * zero: bid 0.00, ask 0.00, IV 0.0%, delta 0.00. A trader reading that row
 * sees a real contract that is worthless and has no directional exposure —
 * not "this contract was not quoted". A 0.00 ask is the most dangerous of the
 * set, because it reads as "free to buy".
 *
 * The file already knew better: its own Spot readout renders "—" when the
 * underlying has not been observed, and a comment acknowledged that a missing
 * quote arrives as zero. Only the cells kept lying.
 *
 * Rule: a value that was never observed renders as EM DASH. A value that was
 * observed AS zero renders as zero — open interest of 0 is a real, meaningful
 * fact about a contract nobody holds, and must stay distinguishable from a
 * contract nobody quoted.
 */

export const UNOBSERVED = "—";

function observed(v: number | null | undefined): v is number {
  // Number.isFinite rejects NaN and Infinity; `??` alone would let NaN through.
  return typeof v === "number" && Number.isFinite(v);
}

/** Price / greek cell. `digits` fixes the decimal places. */
export function formatOptionNumber(
  v: number | null | undefined,
  digits: number,
): string {
  return observed(v) ? v.toFixed(digits) : UNOBSERVED;
}

/** Implied volatility, stored as a fraction, rendered as a percentage. */
export function formatOptionPercent(v: number | null | undefined): string {
  return observed(v) ? `${(v * 100).toFixed(1)}%` : UNOBSERVED;
}

/** Open interest / volume. A genuine zero is preserved, not blanked. */
export function formatOptionCount(v: number | null | undefined): string {
  return observed(v) ? v.toLocaleString("en-US") : UNOBSERVED;
}

/* ------------------------------------------------------------------ */
/* Open-interest aggregation                                           */
/* ------------------------------------------------------------------ */

/**
 * The chain footer showed "Calls OI / Puts OI / P/C Ratio" summed over rows
 * whose missing contracts had already been coerced to 0. Two lies compounded:
 *
 *  1. Unquoted strikes silently counted as zero open interest, so the totals
 *     understated the book without ever saying so.
 *  2. The ratio divided by `Math.max(1, callsOI)`. With no call open interest
 *     at all, that fabricated a denominator of 1 and printed the put total as
 *     if it were a ratio — an invented sentiment reading.
 *
 * A put/call ratio is a headline sentiment number. It must be derived only
 * from what was observed, and must be withheld when it is not defined.
 */
export interface OpenInterestSummary {
  readonly callsOI: number;
  readonly putsOI: number;
  /** Ratio, or undefined when no call open interest was observed. */
  readonly putCallRatio: number | undefined;
  readonly observedCalls: number;
  readonly observedPuts: number;
  readonly totalRows: number;
  /** True when every row contributed both a call and a put OI. */
  readonly complete: boolean;
}

export function summariseOpenInterest(
  rows: readonly { readonly cOI?: number; readonly pOI?: number }[],
): OpenInterestSummary {
  let callsOI = 0, putsOI = 0, observedCalls = 0, observedPuts = 0;

  for (const r of rows) {
    if (typeof r.cOI === "number" && Number.isFinite(r.cOI)) {
      callsOI += r.cOI;
      observedCalls++;
    }
    if (typeof r.pOI === "number" && Number.isFinite(r.pOI)) {
      putsOI += r.pOI;
      observedPuts++;
    }
  }

  return {
    callsOI,
    putsOI,
    // Withheld rather than forced: no call interest means no ratio exists.
    putCallRatio: callsOI > 0 ? putsOI / callsOI : undefined,
    observedCalls,
    observedPuts,
    totalRows: rows.length,
    complete:
      rows.length > 0 &&
      observedCalls === rows.length &&
      observedPuts === rows.length,
  };
}
