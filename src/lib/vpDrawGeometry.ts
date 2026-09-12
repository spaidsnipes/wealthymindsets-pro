/**
 * Volume Profile DRAW geometry — where the pixels go.
 *
 * `src/lib/vpEngine.ts` owns WHERE THE VOLUME GOES: bucket grid, up/down split,
 * POC, 70% value area. That half of the profile is canonical and tested.
 *
 * The other half — turning each bucket into a rectangle on a canvas — was still
 * inline in `drawWMVP`, inside a 300-line draw loop, with no coverage at all.
 * That is the half the trader actually looks at. The comments in that loop make
 * strong, specific claims:
 *
 *   • "snapping both endpoints makes adjacent populated rows share the exact
 *      boundary pixel = pixel-flush, no hairline gaps"
 *   • "bar length is DIRECTLY proportional to this level's real volume-at-price,
 *      normalized to the peak (POC) bucket. No aesthetic baseline and no power
 *      curve — those made low levels fake-wide"
 *   • "the histogram never draws on top of the price labels"
 *
 * Every one of those is a claim about the honesty of the picture, and not one of
 * them was executable. A comment is not a guard. This module makes them so.
 *
 * WHAT THIS MODULE OWNS
 *
 *   The four pure pixel decisions, lifted verbatim in intent from the renderer:
 *   the column's width and right edge, a bucket's row rectangle, a row's bar
 *   length, and the up/down split of that length. Nothing here touches a canvas,
 *   a chart handle, or the DOM, so the shipped arithmetic is the tested
 *   arithmetic.
 *
 * ONE REAL FIX WHILE EXTRACTING
 *
 *   The inline layout could compute a NEGATIVE right edge — when the usable
 *   span (canvas minus price axis) is too narrow to hold the requested number of
 *   columns, the second column's right edge lands left of x=0. Every bar in it
 *   was then painted off-canvas. The profile was requested, the work was done,
 *   and nothing appeared, with no indication that a column had been dropped.
 *   `vpColumnLayout` now returns `fits: false` for that case so the caller can
 *   decline explicitly rather than paint into the void. §5 SYSTEM TRUTH LAW.
 *
 * Aggressor/direction convention matches the engine: `up` is the volume from
 * up-closing bars, drawn LEFT; `down` is drawn RIGHT.
 */

/** Minimum vertical spacing between two volume labels, in pixels. */
export const VP_LABEL_MIN_SPACING_PX = 13;

/** A row is drawn at least this tall so a genuinely-traded level is never invisible. */
export const VP_MIN_ROW_PX = 2;

/** Gap between stacked profile columns, in pixels. */
export const VP_COLUMN_GAP_PX = 12;

/** Breathing room between the histogram's right edge and the price axis. */
export const VP_AXIS_MARGIN_PX = 6;

export interface VpColumnLayout {
  /** Column width in pixels. 0 when the column does not fit. */
  width: number;
  /** x of the column's right edge. Bars extend LEFT from here. */
  right: number;
  /**
   * Whether this column has room to be drawn at all.
   *
   * False is a real answer, not an error: the caller must skip the column. The
   * inline code had no such answer and painted off-canvas instead.
   */
  fits: boolean;
}

/**
 * Width and right edge for profile column `colIndex` of `nCols`.
 *
 * Two profiles (Fixed + Session) sit SIDE BY SIDE, not stacked, so each column
 * narrows and column 1 shifts left by a full column plus a gap. The width is
 * capped both absolutely and as a fraction of the usable span, because a
 * profile is a right-side lane and must never overpower price action.
 */
export function vpColumnLayout(
  canvasWidth: number,
  priceScaleWidth: number,
  colIndex: number,
  nCols: number,
): VpColumnLayout {
  const none: VpColumnLayout = { width: 0, right: 0, fits: false };
  if (!Number.isFinite(canvasWidth) || !Number.isFinite(priceScaleWidth)) return none;

  // The price axis width is queried live because it grows with the number of
  // digits — BTC's 59,800.00 is far wider than a $12 stock, and a fixed reserve
  // let the bars bleed over the numbers.
  const usable = canvasWidth - priceScaleWidth;
  if (usable <= 0) return none;

  const multi = nCols > 1;
  const width = Math.min(multi ? 84 : 116, usable * (multi ? 0.1 : 0.13));
  if (!(width > 0)) return none;

  const right =
    canvasWidth - priceScaleWidth - VP_AXIS_MARGIN_PX -
    colIndex * (width + VP_COLUMN_GAP_PX);

  // A column whose right edge has walked left of the canvas cannot be seen. Say
  // so; do not paint it at negative x and call the profile drawn.
  if (right - width < 0) return { width, right, fits: false };

  return { width, right, fits: true };
}

export interface VpRowRect {
  /** Top y, integer-snapped. */
  y: number;
  /** Full row height in pixels, before the separation gap. */
  height: number;
  /** Height actually filled, i.e. `height` minus the separation gap. */
  drawHeight: number;
}

/**
 * The pixel rectangle for one bucket, from its two price coordinates.
 *
 * `yTop` is the coordinate of the bucket's UPPER price edge and `yBottom` of its
 * lower, so on a canvas (y grows downward) `yTop < yBottom`.
 *
 * Snap BOTH endpoints to integers and subtract — never round the height
 * independently. A row's top coordinate is the SAME coordinate as the bottom of
 * the row above it, so snapping both makes adjacent populated rows share the
 * exact boundary pixel. Rounding the height on its own drifted by ±1px and left
 * hairline gaps between contiguous bars.
 *
 * Returns null for coordinates the price scale could not produce (off-screen),
 * because a row with no position is not a row drawn at zero.
 */
export function vpRowRect(
  yTop: number | null,
  yBottom: number | null,
  rowCapPx: number,
): VpRowRect | null {
  if (yTop == null || yBottom == null) return null;
  if (!Number.isFinite(yTop) || !Number.isFinite(yBottom)) return null;

  const y = Math.round(yTop);
  const bottom = Math.round(yBottom);
  const cap = Number.isFinite(rowCapPx) && rowCapPx > 0 ? rowCapPx : Infinity;
  const height = Math.max(VP_MIN_ROW_PX, Math.min(cap, bottom - y));

  // A separation gap keeps each price row individually visible, so many thin
  // rows read as a smooth outer silhouette rather than one painted slab. Rows
  // too short to spare a pixel keep all of it.
  const gap = height >= 3 ? 1 : 0;
  return { y, height, drawHeight: Math.max(1, height - gap) };
}

/**
 * Bar length for a level, normalized to the peak (POC) bucket.
 *
 * DIRECTLY proportional — no aesthetic baseline, no power curve. Those made low
 * levels fake-wide and saturated every above-median level into one chunky solid
 * block, which is a picture of the shaping function rather than of the volume.
 * Only the POC reaches full width; everything else is in true ratio to it.
 *
 * The 1px floor is the single concession, and it only guarantees that a level
 * which genuinely traded is not invisible.
 */
export function vpBarWidth(volume: number, maxVolume: number, columnWidth: number): number {
  if (!Number.isFinite(volume) || volume <= 0) return 0;
  if (!Number.isFinite(maxVolume) || maxVolume <= 0) return 0;
  if (!Number.isFinite(columnWidth) || columnWidth <= 0) return 0;
  return Math.max(1, Math.round(columnWidth * Math.min(1, volume / maxVolume)));
}

export interface VpBarSplit {
  /** Pixels of up-bar volume, drawn from the bar's left edge. */
  upWidth: number;
  /** Pixels of down-bar volume, drawn immediately right of `upWidth`. */
  downWidth: number;
}

/**
 * Split a bar's length into its up and down halves.
 *
 * The down half is the REMAINDER, never a second rounding. Rounding both ends
 * independently would let the two pieces sum to one pixel more or less than the
 * bar, so a level would be drawn a hair wider or narrower than its own volume
 * depending on which way the ratio fell.
 */
export function vpBarSplit(barWidth: number, upRatio: number): VpBarSplit {
  if (!Number.isFinite(barWidth) || barWidth <= 0) return { upWidth: 0, downWidth: 0 };
  const ratio = Number.isFinite(upRatio) ? Math.min(1, Math.max(0, upRatio)) : 0.5;
  const upWidth = Math.round(barWidth * ratio);
  return { upWidth, downWidth: barWidth - upWidth };
}

/** Whether a volume label at `y` clears the last one drawn. */
export function vpLabelFits(y: number, lastLabelY: number): boolean {
  if (!Number.isFinite(y)) return false;
  if (!Number.isFinite(lastLabelY)) return true;
  return Math.abs(y - lastLabelY) >= VP_LABEL_MIN_SPACING_PX;
}
