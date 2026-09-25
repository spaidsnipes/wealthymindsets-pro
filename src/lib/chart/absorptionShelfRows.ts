/**
 * THE ABSORPTION SHELF AS ROWS ON PRICE — canon FL-06 ① / F06A.
 *
 * F06A ("Order Flow Lives on Price") does not draw an absorption shelf as one
 * box. It draws STACKED ROW BLOCKS on the shelf's own prices, each row running
 * across the bars that traded there — ragged at the ends, because not every
 * bar of the run reached every price. FL-06 ① hatches that shape.
 *
 * WHAT A ROW CLAIMS, AND WHAT IT DOES NOT.
 *
 * A row is a band of the shelf's own price range (the anatomy owner's
 * `priceLo`..`priceHi`). A bar is ON a row when its traded range [low, high]
 * reaches into that band — a fact every OHLC bar carries, no tape needed. A
 * row's RUNS are the stretches of consecutive shelf bars that were on it; a
 * bar of the run that never reached the row breaks the run. So a row block
 * says "price traded here, on these bars" — time at price inside the shelf —
 * and nothing else: no volume, no side, no score.
 *
 * How many rows is a DISPLAY resolution, like the footprint's `numLevels`:
 * the caller picks it from the shelf's pixel height. The rows are equal cuts
 * of the owner's real range; the lowest row ends exactly on `priceLo` and the
 * highest starts exactly on `priceHi`, so the stack never grows past the
 * shelf. Rows are returned HIGH FIRST, the order a price ladder reads.
 *
 * SIDE is not decided here. Whether a shelf may be coloured for a side is the
 * anatomy owner's `holdingEdge` / `holdingBasis` (signed aggression), and the
 * canvas reads it from there — never from a candle's colour.
 *
 * PURE — no canvas, no clock.
 */

export interface ShelfRowZone {
  readonly startTime: number;
  readonly endTime: number;
  readonly priceLo: number;
  readonly priceHi: number;
}

export interface ShelfRowBar {
  readonly time: number;
  readonly high: number;
  readonly low: number;
}

export interface ShelfRowRun {
  /** First and last shelf bar (unix seconds) of a stretch on this row. */
  readonly fromTime: number;
  readonly toTime: number;
  readonly bars: number;
}

export interface ShelfRow {
  readonly lo: number;
  readonly hi: number;
  readonly runs: readonly ShelfRowRun[];
}

/** Target row height in pixels; rows never get thinner than a readable block. */
export const SHELF_ROW_PX = 6;
export const SHELF_ROWS_MAX = 8;

/** How many rows a shelf this many pixels tall is cut into (1..SHELF_ROWS_MAX). */
export function shelfRowCount(shelfPx: number): number {
  if (!Number.isFinite(shelfPx) || shelfPx <= 0) return 1;
  return Math.max(1, Math.min(SHELF_ROWS_MAX, Math.floor(shelfPx / SHELF_ROW_PX)));
}

const finite = (v: number) => typeof v === "number" && Number.isFinite(v);

/** Does a bar's traded range reach into [lo, hi]? A one-price bar counts where it printed. */
function onRow(b: ShelfRowBar, lo: number, hi: number): boolean {
  return b.low <= hi && b.high >= lo;
}

export function absorptionShelfRows(
  zone: ShelfRowZone,
  bars: readonly ShelfRowBar[],
  rowCount: number,
): ShelfRow[] {
  const lo = Math.min(zone.priceLo, zone.priceHi);
  const hi = Math.max(zone.priceLo, zone.priceHi);
  if (!finite(lo) || !finite(hi) || !(hi > lo)) return [];
  const own = bars
    .filter(b => finite(b.time) && finite(b.high) && finite(b.low) && b.time >= zone.startTime && b.time <= zone.endTime)
    .slice()
    .sort((a, b) => a.time - b.time);
  if (own.length === 0) return [];
  const n = Math.max(1, Math.min(SHELF_ROWS_MAX, Math.floor(finite(rowCount) ? rowCount : 1)));
  const step = (hi - lo) / n;
  const rows: ShelfRow[] = [];
  for (let k = 0; k < n; k++) {
    const rHi = k === 0 ? hi : hi - k * step;
    const rLo = k === n - 1 ? lo : hi - (k + 1) * step;
    const runs: ShelfRowRun[] = [];
    let cur: { fromTime: number; toTime: number; bars: number } | null = null;
    for (const b of own) {
      if (onRow(b, rLo, rHi)) {
        if (cur) { cur.toTime = b.time; cur.bars++; }
        else cur = { fromTime: b.time, toTime: b.time, bars: 1 };
      } else if (cur) {
        runs.push(cur);
        cur = null;
      }
    }
    if (cur) runs.push(cur);
    rows.push({ lo: rLo, hi: rHi, runs });
  }
  return rows;
}

export default absorptionShelfRows;
