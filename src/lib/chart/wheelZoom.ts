/**
 * L8 · ZOOM ANCHORS ON THE LIVE CANDLE, AND IS FASTER (Garden 19 finish line, Founder 2026-10-15).
 *
 * Live click-through on NQ1! 15m: "10 wheel ticks ≈ 10% zoom; after zooming the right edge showed
 * 8:30 AM, not now. Scrolling over the Weather lens doesn't zoom at all." The library zooms about 1%
 * a notch around the cursor, so a zoom started anywhere on the plot walked the newest bar off screen.
 *
 * One owner for a vertical wheel over the chart:
 *   · while the newest bar is on camera, the RIGHT EDGE STAYS PINNED (the live candle never leaves);
 *   · otherwise the zoom holds the bar under the cursor still;
 *   · ZOOM_PER_NOTCH (3.5%) a notch — 10 notches ≈ 41%, about 4× the library's pace;
 *   · never fewer than MIN_BARS bars, never more than every bar plus a margin.
 * Pure: the chart applies the range it returns.
 */

export const ZOOM_PER_NOTCH = 1.035;
/** A mouse notch reports ~100 px of deltaY; a trackpad reports small continuous deltas. */
export const NOTCH_PX = 100;
export const MIN_BARS = 8;

export interface LogicalRange { readonly from: number; readonly to: number }

export function wheelZoomRange(
  range: LogicalRange,
  deltaY: number,
  opts: { readonly lastIndex: number; readonly cursorLogical: number | null; readonly totalBars: number },
): LogicalRange {
  const width = range.to - range.from;
  if (!(width > 0) || !Number.isFinite(deltaY) || deltaY === 0) return range;
  // Wheel down (positive deltaY) zooms OUT, as every chart does.
  const factor = Math.pow(ZOOM_PER_NOTCH, deltaY / NOTCH_PX);
  const maxW = Math.max(MIN_BARS, opts.totalBars + 50);
  const next = Math.min(maxW, Math.max(MIN_BARS, width * factor));
  const liveOnCamera = range.to >= opts.lastIndex - 0.5;
  if (liveOnCamera || opts.cursorLogical == null || !Number.isFinite(opts.cursorLogical)) {
    // The right edge (with its offset past the live bar) stays where it is.
    return { from: range.to - next, to: range.to };
  }
  const f = (opts.cursorLogical - range.from) / width;
  const anchor = opts.cursorLogical;
  return { from: anchor - f * next, to: anchor + (1 - f) * next };
}
