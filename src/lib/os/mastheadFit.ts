/**
 * WHERE THE MASTHEAD'S FEED READING CAN STAND — the arithmetic behind the
 * compact band's wrap rule (Garden 16 §51, 2026-09-26).
 *
 * The stylesheet in WMOperatingSystem.tsx is what actually places the reading
 * (flex-wrap with the badge's min-content as its floor); a browser decides, not
 * this function. This is the same decision written as arithmetic so it can be
 * pinned at the widths §51 names (901, 1024, 1280, 1440) and so the next edit
 * that widens a masthead item can be checked against a number before it is
 * checked against the glass.
 *
 * Inputs are widths MEASURED in Chromium — pass what the glass reports; this
 * module holds no text metrics of its own. The reading has three sizes:
 *
 *   oneLinePx   pip + the whole reading on one line
 *   stackedPx   pip + the widest single phrase (feedLabelLines) — the label's
 *               phrases stacked, the detail under them
 *
 * and three placements, in the order the stylesheet prefers them:
 *
 *   "one-line"    it fits beside the utilities at full length
 *   "stacked"     it fits beside the utilities only with phrases stacked
 *   "second-row"  it cannot fit in row one at all, so it moves WHOLE to the
 *                 right end of a second masthead row — never past the edge.
 */
export interface MastheadRowPx {
  /** Masthead horizontal padding, each side. */
  readonly padPx: number;
  /** Gap between masthead items in this band. */
  readonly gapPx: number;
  /** Widths of the row-one items that precede the reading (identity, plates or doors, utilities). */
  readonly itemsPx: readonly number[];
}

export interface FeedReadingPx {
  readonly oneLinePx: number;
  readonly stackedPx: number;
}

export type FeedReadingPlacement = "one-line" | "stacked" | "second-row";

/** Room left for the reading in row one — negative when row one is already over. */
export function feedReadingRoomPx(viewportPx: number, row: MastheadRowPx): number {
  const items = row.itemsPx.reduce((a, b) => a + b, 0);
  // One gap between each item AND before the reading itself.
  const gaps = row.gapPx * row.itemsPx.length;
  return viewportPx - 2 * row.padPx - items - gaps;
}

export function feedReadingPlacement(
  viewportPx: number,
  row: MastheadRowPx,
  reading: FeedReadingPx,
): FeedReadingPlacement {
  const room = feedReadingRoomPx(viewportPx, row);
  if (room >= reading.oneLinePx) return "one-line";
  if (room >= reading.stackedPx) return "stacked";
  return "second-row";
}
