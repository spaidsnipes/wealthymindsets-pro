/**
 * WHERE THE DATA WINDOW SITS — beside the bar it describes, never on the
 * price legend.
 *
 * Measured on serving, 2026-09-26 03:29Z, NQ1! 1h: the Data Window ("1H BAR ·
 * SEP 24, 19:00 · Bar under your cursor — NOT the latest bar") was printed at
 * `top: 8, left: 48` — squarely over the symbol, the headline price and the
 * D / EFF chips. That corner was free before 2026-09-21, when the price legend
 * became a 28px overlay pinned to the pane's top edge (F24); the `D` toggle
 * and the BASIS caption were moved below the legend that day, the panel they
 * belong to was not.
 *
 * The panel describes ONE bar, so it lives beside that bar (the F05A callout's
 * grammar: the reading hangs off the candle it reads), on the side with room,
 * level with the bar's high, and it never covers the bar itself: the gap is
 * at least half a bar's width plus a margin. It stays below the chip row under
 * the legend, clear of the price axis and the time axis, and out of the
 * pane's top-left chip column.
 *
 * PURE. Pixels in, pixels out.
 */

/** Wide enough for the scope line "Bar under your cursor — NOT the latest bar" at 8.5px. */
export const DATA_WINDOW_W = 216;
export const DATA_WINDOW_H = 124;
/** The minimum clear space between the bar's edge and the panel. */
export const DATA_WINDOW_MARGIN = 8;
/** The price axis and its margin on the right of the pane. */
export const DATA_WINDOW_AXIS_RESERVE = 88;
/** The time axis at the bottom of the pane. */
export const DATA_WINDOW_TIME_AXIS = 36;
/** The top-left chip column (D, EFF, the countdown): x < RIGHT and y < BOTTOM is theirs. */
export const CHIP_COLUMN_RIGHT = 96;
export const CHIP_COLUMN_BOTTOM = 112;

export type DataWindowSide = "RIGHT" | "LEFT" | "PARKED";

export interface DataWindowPlacementInput {
  /** The hovered bar's centre x, or null when it cannot be projected. */
  readonly barX: number | null;
  /** The y of the hovered bar's high, or null. */
  readonly barHighY: number | null;
  /** Pixel distance between bar centres (the time scale's bar spacing). */
  readonly barSpacing: number;
  readonly paneW: number;
  readonly paneH: number;
  /** The first y below the legend band AND the chip row under it. */
  readonly topFloor: number;
}

export interface DataWindowPlacement {
  readonly left: number;
  readonly top: number;
  readonly side: DataWindowSide;
}

const finite = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

export function placeDataWindow(input: DataWindowPlacementInput): DataWindowPlacement {
  const { paneW, paneH, topFloor } = input;
  const maxTop = Math.max(topFloor, paneH - DATA_WINDOW_H - DATA_WINDOW_TIME_AXIS);
  const clampTop = (y: number) => Math.min(maxTop, Math.max(topFloor, y));
  const clearChipColumn = (left: number, top: number) =>
    left < CHIP_COLUMN_RIGHT && top < CHIP_COLUMN_BOTTOM ? Math.min(maxTop, CHIP_COLUMN_BOTTOM) : top;

  if (!finite(input.barX) || !(paneW > 0) || !(paneH > 0)) {
    const left = CHIP_COLUMN_RIGHT;
    return { left, top: clearChipColumn(left, clampTop(topFloor)), side: "PARKED" };
  }

  const halfBar = Math.max(1, finite(input.barSpacing) ? input.barSpacing / 2 : 3);
  const gap = halfBar + DATA_WINDOW_MARGIN;
  const rightLimit = paneW - DATA_WINDOW_AXIS_RESERVE;
  const top0 = clampTop(finite(input.barHighY) ? input.barHighY - 10 : topFloor);

  const rightLeft = input.barX + gap;
  if (rightLeft + DATA_WINDOW_W <= rightLimit) {
    return { left: Math.round(rightLeft), top: Math.round(clearChipColumn(rightLeft, top0)), side: "RIGHT" };
  }
  const leftLeft = Math.max(DATA_WINDOW_MARGIN, input.barX - gap - DATA_WINDOW_W);
  return { left: Math.round(leftLeft), top: Math.round(clearChipColumn(leftLeft, top0)), side: "LEFT" };
}
