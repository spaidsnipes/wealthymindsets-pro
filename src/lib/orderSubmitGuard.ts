/**
 * Order submit guard — prevents an accidental double-submit (fat-finger
 * double-tap / rapid repeat click) from placing two orders from one intended
 * action. Found by live QA: double-clicking "Place Buy Order" on the paper
 * ticket placed TWO orders (Total Trades 1 → 3). Founder QA law: "RAPID
 * REPEATED CLICK → NO DUPLICATE ORDER."
 *
 * A time-based guard is the right tool here because paper fills are synchronous
 * (there is no in-flight window to disable the button against). Two clicks
 * closer than `minGapMs` collapse to one order; a deliberate second order after
 * the gap still goes through. Pure + deterministic (time is injected) so the
 * guard is unit-tested and cannot silently regress.
 */

/** Default minimum gap between accepted submits — long enough to swallow a
 *  double-click (~<300ms) but short enough not to impede deliberate re-orders. */
export const ORDER_SUBMIT_MIN_GAP_MS = 400;

/**
 * True if a submit at `nowTs` should be ACCEPTED given the last accepted submit
 * was at `lastTs`. The first submit (lastTs = 0) is always accepted.
 */
export function acceptOrderSubmit(
  lastTs: number,
  nowTs: number,
  minGapMs: number = ORDER_SUBMIT_MIN_GAP_MS,
): boolean {
  if (!(nowTs > 0)) return false;
  if (!(lastTs > 0)) return true;
  return nowTs - lastTs >= minGapMs;
}
