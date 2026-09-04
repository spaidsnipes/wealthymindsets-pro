/**
 * Delta bubble level ownership — Founding Contract §13 open gate.
 *
 * A delta bubble claims a price out loud. MainChart prints the number inside
 * the bubble, and the hover tooltip reads:
 *
 *     "12.4M shares aggressive buy at 150.01"
 *
 * That sentence is shared, verbatim, with the BIG TRADE bubble — and a big
 * trade bubble's price is a real print, taken straight off the tape. So the
 * two bubble kinds make the same claim in the same words, and only one of them
 * used to be able to back it up.
 *
 * WHAT THIS MODULE OWNS
 *
 *   Ticks for one bar are binned into `numLev` equal-price buckets. That part
 *   is aggregation and it is legitimate. The question this module answers is
 *   the one the gate is named after: once a bucket is formed, WHICH PRICE DOES
 *   THE BUBBLE OWN?
 *
 *   The answer is: the real traded price inside the bucket that carries the
 *   most volume. Not the bucket's geometric centre.
 *
 *   The centre is a number the platform computed. Nothing necessarily traded
 *   there, and on a tick-quantised instrument nothing CAN: an NQ bar from
 *   21750.00 to 21752.00 bins into ten 0.20-wide buckets whose centres are
 *   21750.10, 21750.30, 21750.50 … while NQ only trades in 0.25 increments.
 *   Every one of those centres is a price that cannot exist on the ladder, and
 *   the bubble printed it as the place the flow happened.
 *
 *   Reporting the bucket's heaviest real tick is both honest AND more useful.
 *   Given ticks at 150.00 (100 lots) and 150.01 (5 lots) in one bucket, the
 *   centre rounds to 150.01 — the price where almost nothing happened.
 *
 * THE SECOND DEFECT, WHICH IS SILENT DATA LOSS
 *
 *   The centre was rounded for display (`.toFixed(dp)`) and then that ROUNDED
 *   value was used as the bubble's identity — both as the `pickMap` key here
 *   and as the `dt:<time>:<price>` spawn key in the renderer.
 *
 *   A lossy display value is not an identity. On a quiet equity bar from
 *   150.00 to 150.03 the six buckets produce centres
 *
 *     150.0025  150.0075  150.0125  150.0175  150.0225  150.0275
 *
 *   which round to  150.00  150.01  150.01  150.02  150.02  150.03  —
 *   SIX distinct buckets, FOUR distinct keys. Two collisions. The colliding
 *   bucket was overwritten in the map and its bubble suppressed at spawn, so
 *   real aggressor volume vanished from the chart with no indication.
 *
 *   That is the same class of defect as the strict-centre binning bug fixed
 *   earlier in this function — order-flow evidence silently dropped, §5 SYSTEM
 *   TRUTH LAW — surviving one line further down. Identity is now the bucket
 *   INDEX, which is what a "level" actually is and cannot collide.
 *
 * Pure: no DOM, no refs, no globals, so the shipped code is the tested code.
 * The previous coverage tested a re-typed COPY of the binning loop and
 * string-matched MainChart for three identifiers, which meant a rename went
 * red with no behaviour change while a behaviour change kept the strings.
 *
 * Aggressor convention is codebase-wide:  ask = buyer-initiated ("buy"),
 * bid = seller-initiated ("sell"), delta = ask - bid.
 */

export interface DeltaTick {
  price: number;
  bid: number; // seller-initiated volume at this price
  ask: number; // buyer-initiated volume at this price
}

export interface DeltaBubbleLevel {
  /** Bucket index. The level's IDENTITY — stable, and cannot collide. */
  levelIdx: number;
  /** A REAL traded price inside the bucket: its heaviest tick. */
  priceLevel: number;
  bid: number;
  ask: number;
  total: number;
  delta: number;
}

/**
 * Price granularity and display precision, derived from the instrument's
 * price magnitude. Exported so the assumption is testable rather than buried.
 */
export function priceTickFor(base: number): number {
  return base > 1_000 ? 0.25 : base > 100 ? 0.01 : 0.0001;
}

/** Bucket count for a bar of `range`, clamped to [6, 10] as the renderer expects. */
export function bucketCountFor(range: number, priceTick: number): number {
  return Math.max(6, Math.min(10, Math.floor((range / priceTick) * 1.5) || 6));
}

/**
 * Bin one bar's ticks into every non-empty price bucket.
 *
 * This step is CONSERVATIVE: every lot handed in comes back out in exactly one
 * bucket. Separated from ranking so that invariant is directly testable —
 * `computeDeltaBubbleLevels` then discards below-average buckets on purpose,
 * and measuring conservation on its output would be measuring the wrong thing.
 */
export function binDeltaTicks(
  ticks: readonly DeltaTick[],
  barLow: number,
  barHigh: number,
  base: number,
): DeltaBubbleLevel[] {
  if (!Array.isArray(ticks) || ticks.length === 0) return [];

  const priceTick = priceTickFor(base);

  // The window spans the bar, then widens to hold any tick printed outside it.
  let lo = barLow;
  let hi = barHigh;
  const clean: DeltaTick[] = [];
  for (const t of ticks) {
    const p = Number(t?.price);
    if (!Number.isFinite(p)) continue;
    clean.push({ price: p, bid: Math.max(0, Number(t.bid) || 0), ask: Math.max(0, Number(t.ask) || 0) });
    if (p < lo) lo = p;
    if (p > hi) hi = p;
  }
  if (clean.length === 0) return [];
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [];

  let range = hi - lo;
  if (range <= 0) range = priceTick * 6;

  const numLev = bucketCountFor(range, priceTick);
  const levelStep = range / numLev;

  // Half-open binning: [start, end), final bucket inclusive of `hi`.
  //
  // This once used `Math.abs(price - centre) < half`, a STRICT comparison
  // against the half-width, so a tick landing exactly on a bucket edge
  // satisfied no bucket at all and was dropped from bid, ask AND delta. Market
  // prices are tick-quantised, so real prices land on boundaries
  // systematically — and the bar's own low and high are ALWAYS boundaries.
  // The extremes, where absorption and rejection evidence lives, were
  // discarded from every bar. The old form only looked correct on decimal
  // prices because floating-point error nudged the comparison just under.
  const bid = new Array<number>(numLev).fill(0);
  const ask = new Array<number>(numLev).fill(0);
  // Heaviest real tick per bucket — this is what the bubble will claim.
  const ownerPrice = new Array<number>(numLev).fill(Number.NaN);
  const ownerVol = new Array<number>(numLev).fill(-1);

  for (const t of clean) {
    const raw = Math.floor((t.price - lo) / levelStep);
    const idx = Math.max(0, Math.min(numLev - 1, raw));
    bid[idx]! += t.bid;
    ask[idx]! += t.ask;

    const vol = t.bid + t.ask;
    // Ties resolve to the lower price so the result is order-independent.
    if (vol > ownerVol[idx]! || (vol === ownerVol[idx]! && t.price < ownerPrice[idx]!)) {
      ownerVol[idx] = vol;
      ownerPrice[idx] = t.price;
    }
  }

  const levels: DeltaBubbleLevel[] = [];
  for (let i = 0; i < numLev; i++) {
    const total = bid[i]! + ask[i]!;
    if (total <= 0) continue;
    // A bucket can hold zero-volume ticks only; then it has no owning price
    // and there is nothing honest to print, so it is not drawn.
    if (!Number.isFinite(ownerPrice[i]!)) continue;
    levels.push({
      levelIdx: i,
      priceLevel: ownerPrice[i]!,
      bid: bid[i]!,
      ask: ask[i]!,
      total,
      delta: ask[i]! - bid[i]!,
    });
  }
  return levels;
}

/**
 * Rank one bar's binned levels down to the bubbles actually drawn.
 *
 * `cap` is the trader's "levels" preference (5/7/10/15) and is a MAXIMUM, not
 * a target — buckets with no data are never invented to reach it. Buckets
 * below the bar's own average |delta| are deliberately not drawn, so the
 * volume in the returned levels is a SUBSET of the bar's volume by design.
 *
 * Ranked by |delta| desc, tie-broken by price asc, so identical data always
 * yields identical bubbles.
 */
export function computeDeltaBubbleLevels(
  ticks: readonly DeltaTick[],
  barLow: number,
  barHigh: number,
  base: number,
  cap: number,
): DeltaBubbleLevel[] {
  const levels = binDeltaTicks(ticks, barLow, barHigh, base);
  if (levels.length === 0) return [];

  // Data-relative threshold (no absolute lot floor) so it works on any asset:
  // BTC (deltas ~0.05 BTC) and stocks (deltas ~50 sh) alike. Above-average zones.
  const threshold = levels.reduce((s, l) => s + Math.abs(l.delta), 0) / levels.length;

  const limit = Math.max(1, Math.floor(cap) || 1);
  const rank = (a: DeltaBubbleLevel, z: DeltaBubbleLevel) =>
    Math.abs(z.delta) - Math.abs(a.delta) || a.priceLevel - z.priceLevel;

  // Keyed by bucket index, never by the price. See the header: a rounded price
  // is a display value, and using one as an identity silently merged buckets.
  const picked = new Map<number, DeltaBubbleLevel>();
  for (const l of levels.filter((x) => Math.abs(x.delta) >= threshold).sort(rank).slice(0, limit)) {
    picked.set(l.levelIdx, l);
  }

  // Guaranteed buy + sell leaders so every active bar shows both sides.
  const topBuy = levels.filter((l) => l.delta > 0)
    .sort((a, z) => z.delta - a.delta || a.priceLevel - z.priceLevel)[0];
  const topSell = levels.filter((l) => l.delta < 0)
    .sort((a, z) => a.delta - z.delta || a.priceLevel - z.priceLevel)[0];
  if (topBuy) picked.set(topBuy.levelIdx, topBuy);
  if (topSell) picked.set(topSell.levelIdx, topSell);

  return [...picked.values()].sort(rank).slice(0, limit);
}
