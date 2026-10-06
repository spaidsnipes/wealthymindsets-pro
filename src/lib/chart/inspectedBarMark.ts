/**
 * F05B · CANDLE ANATOMY INSPECT, CAMERA ALIVE — the selected candle is marked
 * ON the chart, not only in the Inspect Ticket.
 *
 * Plate F05B read beside serving NQ1! 5m (2026-10-06 09:00 CDT, select=bar):
 * the plate draws a hairline through the selected candle and its TRUTH
 * CEILING / TRUTH FLOOR (the bar's own high and low) as short dashed rules
 * either side of it. On the glass the ticket opened in the panel and nothing
 * on the candles said which one it read (attentionSelection:NONE).
 *
 * Geometry only, from the bar's own high / low — the same bar the ticket
 * reads (ChartsDashboard's `inspectBar` when a bar is pinned). Nothing is
 * derived. The hairline never crosses the candle it marks: it stops short of
 * the wick at both ends. PURE.
 */

export interface InspectedBarMarkInput {
  /** The bar's centre x on screen. */
  readonly x: number;
  /** Screen y of the bar's high (top) and low (bottom). */
  readonly yHigh: number;
  readonly yLow: number;
  readonly barSpacing: number;
  /** The drawable pane: left / right of the plot, header floor / pane bottom. */
  readonly plot: { readonly x0: number; readonly x1: number; readonly y0: number; readonly y1: number };
}

export interface InspectedBarMark {
  /** The hairline, in two pieces: above the wick and below it. */
  readonly hairline: readonly { readonly x: number; readonly y0: number; readonly y1: number }[];
  /** Ceiling (high) and floor (low) rules. */
  readonly ceiling: { readonly x0: number; readonly x1: number; readonly y: number };
  readonly floor: { readonly x0: number; readonly x1: number; readonly y: number };
}

/** Bars each rule reaches either side of the candle (the plate's short rules, not full-width lines). */
export const INSPECT_RULE_BARS = 5;
/** Air between the wick's ends and the hairline. */
export const INSPECT_HAIRLINE_GAP = 6;

export function inspectedBarMark(i: InspectedBarMarkInput): InspectedBarMark | null {
  const vals = [i.x, i.yHigh, i.yLow, i.barSpacing, i.plot.x0, i.plot.x1, i.plot.y0, i.plot.y1];
  if (!vals.every(Number.isFinite) || !(i.barSpacing > 0)) return null;
  if (i.x < i.plot.x0 || i.x > i.plot.x1) return null;
  const top = Math.min(i.yHigh, i.yLow), bot = Math.max(i.yHigh, i.yLow);
  const reach = Math.max(24, i.barSpacing * INSPECT_RULE_BARS);
  const x0 = Math.max(i.plot.x0, i.x - reach), x1 = Math.min(i.plot.x1, i.x + reach);
  const hairline: { x: number; y0: number; y1: number }[] = [];
  if (top - INSPECT_HAIRLINE_GAP > i.plot.y0) hairline.push({ x: i.x, y0: i.plot.y0, y1: top - INSPECT_HAIRLINE_GAP });
  if (bot + INSPECT_HAIRLINE_GAP < i.plot.y1) hairline.push({ x: i.x, y0: bot + INSPECT_HAIRLINE_GAP, y1: i.plot.y1 });
  return { hairline, ceiling: { x0, x1, y: top }, floor: { x0, x1, y: bot } };
}
