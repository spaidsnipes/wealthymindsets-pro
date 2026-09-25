/**
 * formatImbalanceRatio — the ONE way WM Pro is allowed to speak an aggressor
 * imbalance ratio out loud.
 *
 * `selectAggressorFlow.imbRatio` is not a display number. It carries two traps,
 * and both were documented before this module existed:
 *
 *   1. THE 300 SENTINEL. When the weaker side has zero volume the true ratio is
 *      UNBOUNDED, so the selector returns 300 and sets `oneSided`. Painting that
 *      as "300:100" invents a 3:1 reading the tape never produced.
 *
 *   2. THE UNBOUNDED TAIL. Real per-trade sizes are fractional on crypto, so a
 *      tiny opposing side pushes the ratio into the millions. A from-USE defect
 *      was observed on BTC showing 27,261,700:100 — technically derived, and
 *      useless.
 *
 * Both rules lived as a PRIVATE function inside OrderFlowCockpitStrip.tsx, so
 * the only surface that obeyed them was the one that happened to contain them.
 * SmartMoneyPanel rendered `${imbRatio}%` directly and was exposed to both.
 * §24 — one rule, one owner, and a rule a second surface cannot import is not
 * an owner.
 *
 * PURE — no React, no I/O, no clock.
 */

/**
 * @param ratio     dominant/weaker × 100, straight from the selector.
 * @param oneSided  the selector's own flag that `ratio` is a sentinel.
 */
export function formatImbalanceRatio(ratio: number, oneSided = false): string {
  // LIVING-PIXEL LAW: a number no tick in the tape owns must not be painted.
  if (oneSided) return "one-sided";
  // A THIRD trap, found by this module's own regression file rather than from
  // USE: the original guard was `!Number.isFinite(ratio) || ratio <= 100`, so
  // BOTH non-finite inputs fell into "1:1". That is backwards in both
  // directions — +Infinity means the weaker side is zero (maximum dominance),
  // and NaN means the ratio was never computed at all. "1:1" asserts a
  // measured BALANCE in both cases, which is the loudest available lie about a
  // tape. `selectAggressorFlow` does not emit either today (it sends the 300
  // sentinel with `oneSided`), so this is defence, not an observed screen bug —
  // but a display owner that turns "unbounded" into "balanced" is one caller
  // away from being one.
  if (Number.isNaN(ratio)) return "unknown";
  if (ratio === Number.POSITIVE_INFINITY) return "one-sided";
  // A THIRD trap, found by this module's own regression file rather than from
  // USE: the original guard was `!Number.isFinite(ratio) || ratio <= 100`, so
  // BOTH non-finite inputs fell into "1:1". That is backwards in both
  // directions — +Infinity means the weaker side is zero (maximum dominance),
  // and NaN means the ratio was never computed at all. "1:1" asserts a
  // measured BALANCE in both cases, which is the loudest available lie about a
  // tape. `selectAggressorFlow` does not emit either today (it sends the 300
  // sentinel with `oneSided`), so this is defence, not an observed screen bug —
  // but a display owner that turns "unbounded" into "balanced" is one caller
  // away from being one.
  if (Number.isNaN(ratio)) return "unknown";
  if (ratio === Number.POSITIVE_INFINITY) return "one-sided";
  if (!Number.isFinite(ratio) || ratio <= 100) return "1:1";
  if (ratio >= 1e6) return "≥10k:1";
  if (ratio >= 1e5) return "≥1k:1";
  return `${ratio.toFixed(0)}:100`;
}

/**
 * The same ratio as canon FL-06 ② tags a block ON THE GLASS: "×2.1" — the
 * dominant side as a multiple of the weaker. Same traps, same owner:
 *
 *   · one-sided (or +∞) is a WORD, never the 300 sentinel as "×3.0";
 *   · the unbounded tail is capped in words ("×1k+"), never printed raw;
 *   · NaN, non-finite or ≤ 1:1 returns null — a tag nobody measured is not
 *     painted (LIVING-PIXEL LAW), and a stacked level never qualifies at 1:1.
 *
 * @param ratio     dominant/weaker × 100, straight from the selector.
 * @param oneSided  the selector's own flag that `ratio` is a sentinel.
 */
export function formatImbalanceMultiple(ratio: number, oneSided = false): string | null {
  if (oneSided || ratio === Number.POSITIVE_INFINITY) return "1-SIDED";
  if (!Number.isFinite(ratio) || ratio <= 100) return null;
  if (ratio >= 1e5) return "×1k+";
  const m = ratio / 100;
  return m >= 10 ? `×${m.toFixed(0)}` : `×${m.toFixed(1)}`;
}

export default formatImbalanceRatio;
