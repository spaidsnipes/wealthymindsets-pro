/**
 * WHERE A STACKED IMBALANCE SITS IN TIME ON THE GLASS (H-701).
 *
 * The stack is drawn ON the bars that built it (`formedFrom`..`formedTo`) and
 * only its edges carry on to now. That placement is a claim about specific
 * bars, so it is only true while those bars are in view. lightweight-charts
 * hands back a coordinate for any bar in the data, on screen or not, and a
 * clamp to the plot edge on its own turns an off-screen formation into slabs
 * painted on whichever bars happen to sit at that edge — bars that built
 * nothing. So the placement is decided here, in one of four words:
 *
 *   ON_BARS            the formation span is at least partly in view; the
 *                      cells sit on the visible part of it.
 *   FORMED_BEFORE_VIEW every bar in view came after the stack formed. The
 *                      band across the whole view is true; no bar in view
 *                      can carry the cells.
 *   FORMED_AFTER_VIEW  every bar in view came before the stack formed.
 *                      Painting the level over them would hand those bars a
 *                      fact they could not have known — lookahead — so the
 *                      glass draws nothing.
 *   TIME_UNKNOWN       the reading carries no formation time, or no loaded
 *                      bar is at or before it; the full band is the only
 *                      placement that claims no particular bar.
 *
 * Pure. Canvas-free. The paint block in MainChart owns ink only.
 */

export interface StackAnchorChart {
  timeScale(): { timeToCoordinate(t: never): unknown; options(): { barSpacing: number } };
}

export type StackPlacement =
  | { readonly kind: "ON_BARS"; readonly x0: number; readonly x1: number; readonly key: string }
  | { readonly kind: "FORMED_BEFORE_VIEW" | "FORMED_AFTER_VIEW" | "TIME_UNKNOWN" };

/**
 * The time of the last bar at or before `t`, by binary search over bars in
 * ascending time. This runs every animation frame and formation times sit at
 * the recent end, so a forward walk would read almost the whole history on
 * every call.
 */
export function barTimeAtOrBefore(bars: readonly { time: unknown }[], t: number | null): number | null {
  if (t == null) return null;
  let lo = 0, hi = bars.length - 1, hit: number | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const bt = Number(bars[mid]!.time);
    if (bt <= t) { hit = bt; lo = mid + 1; } else hi = mid - 1;
  }
  return hit;
}

export function stackAnchor(
  chart: StackAnchorChart,
  bars: readonly { time: unknown }[], fromSec: number | null, toSec: number | null, plotRight: number,
): StackPlacement {
  const bf = barTimeAtOrBefore(bars, fromSec), bt = barTimeAtOrBefore(bars, toSec);
  if (bf == null || bt == null) return { kind: "TIME_UNKNOWN" };
  const xf = chart.timeScale().timeToCoordinate(bf as never), xt = chart.timeScale().timeToCoordinate(bt as never);
  if (xf == null || xt == null) return { kind: "TIME_UNKNOWN" };
  let sp = 6; try { sp = Math.max(4, chart.timeScale().options().barSpacing); } catch { /* default */ }
  const left = Number(xf) - sp / 2, right = Number(xt) + sp / 2;
  if (right < 0) return { kind: "FORMED_BEFORE_VIEW" };
  if (left > plotRight) return { kind: "FORMED_AFTER_VIEW" };
  return { kind: "ON_BARS", x0: Math.max(0, left), x1: Math.min(plotRight, right), key: `${bf}-${bt}` };
}
