/**
 * THE NEAREST FREE ROW FOR A LABEL IN A COLUMN.
 *
 * The profile stack prints every species' POC / VAH / VAL in ONE right-hand
 * column. Its old rule stepped a colliding label one row AWAY from the label it
 * hit, up to eight times. Between two neighbours that step oscillates — away
 * from the upper one lands on the lower one, away from the lower lands back on
 * the upper — and after eight tries the label printed where it started, on top
 * of both. Measured on serving (BTC 1m FAR, 2026-09-25): "LIVING POC",
 * "VRP POC" and "LIVING VAL" printed as one smear.
 *
 * This picks, among the label's own row and the rows directly above and below
 * every label already placed, the free row nearest its price — never across the
 * label it first collided with (that would invert the column's price order).
 *
 * PURE. DETERMINISTIC.
 */

export function nearestFreeLabelY(y: number, taken: readonly number[], gap = 12): number {
  const clash = (t: number) => taken.some(s => Math.abs(s - t) < gap);
  if (!clash(y)) return y;
  const first = taken.find(s => Math.abs(s - y) < gap)!;
  // A label above the one it hit stays above it; below stays below.
  const wrongSide = (t: number) => (y <= first ? t > first : t < first);
  let best: number | null = null;
  let bestCost = Infinity;
  for (const s of taken) {
    for (const t of [s - gap, s + gap]) {
      if (clash(t)) continue;
      const cost = Math.abs(t - y) + (wrongSide(t) ? 1e6 : 0);
      if (cost < bestCost) { bestCost = cost; best = t; }
    }
  }
  return best ?? y;
}
