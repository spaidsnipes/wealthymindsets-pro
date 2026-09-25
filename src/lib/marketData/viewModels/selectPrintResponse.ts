/**
 * FORCE → RESPONSE ON THE SAME PRINT — H-701 plate (WM_A_H701_FORCE_RESPONSE,
 * F06 "Force Response Same Print").
 *
 * The selected execution is the FORCE: its side says which way it pushed. The
 * RESPONSE is what price did in the next RESPONSE_BARS bars, measured both
 * WITH the force and AGAINST it, in price and in units of the window's median
 * bar range. Nothing is forecast: before those bars exist the verdict is
 * PENDING, and what has printed so far is still reported.
 *
 *   FOLLOWED  moved ≥ 1 median range with the force, and more than against it
 *   FADED     moved ≥ 1 median range against the force, and more than with it
 *   MUTED     neither — the force bought no clear response
 *   PENDING   fewer than RESPONSE_BARS bars after the print so far
 *
 * The yardstick (the median range) is taken from the YARDSTICK_BARS bars
 * BEFORE the event bar and never from the bars after it. Bars after the print
 * are the response being graded: letting them set the bar they are graded
 * against widens the envelope exactly when the response was large, and grades
 * one print differently depending on how much later history is loaded. The
 * event bar itself is excluded because its range includes what happened after
 * the print inside that bar. With no ranged bar before the print there is no
 * yardstick, and the response is refused rather than called MUTED.
 *
 * PURE. DETERMINISTIC.
 */

export const PRINT_RESPONSE_VERSION = 2;
export const RESPONSE_BARS = 3;
export const YARDSTICK_BARS = 50;

export interface ResponseBar { readonly time: number; readonly high: number; readonly low: number; readonly close: number }
export interface PrintForce { readonly timeSec: number; readonly price: number; readonly side: "buy" | "sell" }

export interface PrintResponseVM {
  readonly version: number;
  readonly drawn: boolean;
  readonly reason: "DRAWN" | "NO_BARS" | "PRINT_OUTSIDE_BARS" | "NO_PRIOR_RANGE";
  readonly eventBarTime: number | null;
  readonly dir: 1 | -1;
  readonly responseBars: number;
  /** Furthest price travelled WITH the force after the print (≥ 0). */
  readonly withForce: number;
  /** Furthest price travelled AGAINST the force after the print (≥ 0). */
  readonly againstForce: number;
  readonly medianRange: number;
  readonly endTime: number | null;
  /** Close of the last response bar — where the RESPONSE arrow lands. */
  readonly endClose: number | null;
  readonly verdict: "FOLLOWED" | "FADED" | "MUTED" | "PENDING";
}

export function selectPrintResponse(force: PrintForce | null | undefined, input: readonly ResponseBar[] | null | undefined): PrintResponseVM {
  const dir: 1 | -1 = force?.side === "sell" ? -1 : 1;
  const none = (reason: PrintResponseVM["reason"]): PrintResponseVM => ({
    version: PRINT_RESPONSE_VERSION, drawn: false, reason, eventBarTime: null, dir, responseBars: 0,
    withForce: 0, againstForce: 0, medianRange: 0, endTime: null, endClose: null, verdict: "PENDING",
  });
  const bars = (input ?? []).filter(b => [b.time, b.high, b.low, b.close].every(Number.isFinite) && b.high >= b.low);
  if (!force || bars.length === 0) return none("NO_BARS");
  let idx = -1;
  for (let i = 0; i < bars.length; i++) { if (bars[i].time <= force.timeSec) idx = i; else break; }
  if (idx < 0) return none("PRINT_OUTSIDE_BARS");
  const after = bars.slice(idx + 1, idx + 1 + RESPONSE_BARS);
  const ranges = bars.slice(Math.max(0, idx - YARDSTICK_BARS), idx).map(b => b.high - b.low).filter(r => r > 0).sort((a, z) => a - z);
  if (!ranges.length) return none("NO_PRIOR_RANGE");
  const med = ranges[Math.floor(ranges.length / 2)];
  let withF = 0, against = 0;
  for (const b of after) {
    withF = Math.max(withF, dir > 0 ? b.high - force.price : force.price - b.low);
    against = Math.max(against, dir > 0 ? force.price - b.low : b.high - force.price);
  }
  withF = Math.max(0, withF); against = Math.max(0, against);
  const verdict: PrintResponseVM["verdict"] = after.length < RESPONSE_BARS
    ? "PENDING"
    : withF >= med && withF > against ? "FOLLOWED"
    : against >= med && against > withF ? "FADED"
    : "MUTED";
  return {
    version: PRINT_RESPONSE_VERSION, drawn: true, reason: "DRAWN", eventBarTime: bars[idx].time, dir,
    responseBars: after.length, withForce: withF, againstForce: against, medianRange: med,
    endTime: after.length ? after[after.length - 1].time : null,
    endClose: after.length ? after[after.length - 1].close : null, verdict,
  };
}

export default selectPrintResponse;
