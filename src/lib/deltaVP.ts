/**
 * Delta + Volume Profile aggregation for the "Delta + VP" rectangle drawing tool.
 *
 * HONESTY: the buy/sell (ask/bid) volume per price level is sourced from
 * MainChart's `getBarFootprint`, which uses REAL accumulated tick data where the
 * platform captured it, and a deterministic bar-structure simulation elsewhere —
 * exactly the same source the shipped WM Fixed / WM Session Volume Profile draws
 * from. This module does NOT invent order flow; it only BINS and AGGREGATES the
 * footprint levels it is handed. Codebase-wide convention (kept here):
 *   ask = buyer-initiated  → "buy"
 *   bid = seller-initiated  → "sell"
 *   delta = buy - sell
 *
 * The function is pure (no DOM, no globals) so it can be unit-tested in isolation.
 */

export interface DeltaVPLevel {
  priceLevel: number;
  bid: number; // seller-initiated volume
  ask: number; // buyer-initiated volume
}

export interface DeltaVPRow {
  loPrice: number; // bin bottom edge (inclusive)
  hiPrice: number; // bin top edge
  price: number;   // bin center
  buy: number;     // aggregated ask (buyer-initiated)
  sell: number;    // aggregated bid (seller-initiated)
  delta: number;   // buy - sell
  volume: number;  // buy + sell
}

export interface DeltaVPResult {
  rows: DeltaVPRow[];   // sorted high price → low price (top of chart first)
  pocPrice: number;     // bin-center price of the highest-volume row
  pocVolume: number;
  maxVolume: number;    // largest single-row volume (for bar scaling)
  maxAbsDelta: number;  // largest |row delta| (for bar scaling)
  totalBuy: number;
  totalSell: number;
  totalDelta: number;   // totalBuy - totalSell
  totalVolume: number;
}

const EMPTY: DeltaVPResult = {
  rows: [], pocPrice: 0, pocVolume: 0, maxVolume: 0, maxAbsDelta: 0,
  totalBuy: 0, totalSell: 0, totalDelta: 0, totalVolume: 0,
};

/**
 * Bin `levels` into `nBins` equal-price rows across [loPrice, hiPrice] and
 * aggregate buy/sell per row. Levels outside the price window are ignored (this
 * is what confines the profile to the user-drawn box). Empty rows are dropped so
 * the caller never draws a zero-volume bar.
 */
export function computeDeltaVP(
  levels: DeltaVPLevel[],
  loPrice: number,
  hiPrice: number,
  nBins: number,
): DeltaVPResult {
  const lo = Math.min(loPrice, hiPrice);
  const hi = Math.max(loPrice, hiPrice);
  const span = hi - lo;
  const bins = Math.max(1, Math.floor(nBins));
  if (!(span > 0) || !Array.isArray(levels) || levels.length === 0) return { ...EMPTY };

  const width = span / bins;
  const acc: Array<{ buy: number; sell: number }> = Array.from({ length: bins }, () => ({ buy: 0, sell: 0 }));

  for (const lv of levels) {
    const p = Number(lv?.priceLevel);
    if (!Number.isFinite(p) || p < lo || p > hi) continue;
    let idx = Math.floor((p - lo) / width);
    if (idx >= bins) idx = bins - 1; // the exact-hi edge lands in the top bin
    if (idx < 0) idx = 0;
    acc[idx].buy += Math.max(0, Number(lv.ask) || 0);
    acc[idx].sell += Math.max(0, Number(lv.bid) || 0);
  }

  const rows: DeltaVPRow[] = [];
  let maxVolume = 0, maxAbsDelta = 0, totalBuy = 0, totalSell = 0;
  let pocPrice = lo + width / 2, pocVolume = -1;

  for (let i = 0; i < bins; i++) {
    const { buy, sell } = acc[i];
    const volume = buy + sell;
    if (volume <= 0) continue;
    const rowLo = lo + i * width;
    const rowHi = rowLo + width;
    const price = rowLo + width / 2;
    const delta = buy - sell;
    rows.push({ loPrice: rowLo, hiPrice: rowHi, price, buy, sell, delta, volume });
    if (volume > maxVolume) maxVolume = volume;
    if (Math.abs(delta) > maxAbsDelta) maxAbsDelta = Math.abs(delta);
    if (volume > pocVolume) { pocVolume = volume; pocPrice = price; }
    totalBuy += buy;
    totalSell += sell;
  }

  if (rows.length === 0) return { ...EMPTY };
  rows.sort((a, b) => b.price - a.price);

  return {
    rows,
    pocPrice,
    pocVolume: Math.max(0, pocVolume),
    maxVolume,
    maxAbsDelta,
    totalBuy,
    totalSell,
    totalDelta: totalBuy - totalSell,
    totalVolume: totalBuy + totalSell,
  };
}
