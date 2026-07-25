// ─────────────────────────────────────────────────────────────────────────────
// WM Pro — Canonical Volume Profile Engine (v2)
//
// Company Bible principles enforced here:
//   • Truth over appearance · Calculations before cosmetics
//   • Every visualization must represent MEASURABLE information
//   • Never fabricate data — the profile is a pure function of its input events
//
// This is a PURE, deterministic, timeframe-INDEPENDENT calculation. Given the
// same input events + settings it always returns the same immutable snapshot.
// It knows nothing about canvas size, zoom, pan, or the displayed chart
// timeframe — those may change candle aggregation but must never change the
// distribution (directive §2 / §13).
//
// Two entry points, honestly labeled by data quality (directive §29):
//   • computeProfileFromTrades() → "trade-based"   (exact volume-at-price)
//   • computeProfileFromBars()   → "candle-estimated" (volume spread across the
//                                   bar's high–low; the honest fallback for feeds
//                                   that only provide OHLCV — today's equities)
// ─────────────────────────────────────────────────────────────────────────────

export type AggressorSide = "buy" | "sell" | "unknown";

export interface NormalizedTradeLite {
  price: number;
  size: number;
  side: AggressorSide;
}

export interface ProfileBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ProfileRow {
  /** Bucket LOW edge price (bucket covers [price, price + tickSize)). */
  price: number;
  /** Volume classified buy-side (ask-executed / up). */
  up: number;
  /** Volume classified sell-side (bid-executed / down). */
  down: number;
  /** up + down. */
  total: number;
}

export type ProfileQuality = "trade-based" | "candle-estimated";

export interface ProfileSnapshot {
  rows: ProfileRow[]; // ascending by price, ONLY populated rows
  tickSize: number;
  poc: number; // price (bucket low edge) of the highest-volume row
  vah: number; // value-area high (bucket low edge)
  val: number; // value-area low (bucket low edge)
  totalVolume: number;
  delta: number; // Σ up − Σ down
  valueAreaPct: number;
  quality: ProfileQuality;
  /** Rows that received no volume are omitted; this is the count that DID. */
  populatedRows: number;
}

export interface ProfileOptions {
  /** Force a tick/bucket size. If omitted, chooseTickSize() derives one. */
  tickSize?: number;
  /** Value-area fraction in [0,1]. Default 0.70. */
  valueAreaPct?: number;
  /** Target number of buckets when tickSize is auto-derived. Default 320. */
  targetRows?: number;
}

/** Round to a bucket LOW edge for a given tick size (floor to the grid). */
function bucketFloor(price: number, tick: number): number {
  // Work in integer tick units to avoid float drift, then scale back.
  return Math.floor(price / tick + 1e-9) * tick;
}

/**
 * Derive a deterministic bucket size from a price range. Fine-grained by design
 * (directive §12): base resolution is the finest trustworthy step; DISPLAY
 * aggregation is a separate concern the renderer applies, never this engine.
 */
export function chooseTickSize(range: number, targetRows = 320): number {
  if (!(range > 0)) return 1;
  const raw = range / Math.max(1, targetRows);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  // Snap to the NEAREST clean increment so bucket edges are readable prices,
  // but never coarser than the target implies.
  const cands = [1, 2, 2.5, 5, 10].map((m) => m * mag);
  return cands.reduce((best, v) => (Math.abs(v - raw) < Math.abs(best - raw) ? v : best), cands[0]);
}

/** Build a snapshot from an already-accumulated bucket map. Shared core. */
function finalize(
  buckets: Map<number, { up: number; down: number }>,
  tickSize: number,
  valueAreaPct: number,
  quality: ProfileQuality,
): ProfileSnapshot {
  const rows: ProfileRow[] = [...buckets.entries()]
    .map(([price, v]) => ({ price, up: v.up, down: v.down, total: v.up + v.down }))
    .filter((r) => r.total > 0)
    .sort((a, b) => a.price - b.price);

  if (rows.length === 0) {
    return {
      rows: [], tickSize, poc: 0, vah: 0, val: 0, totalVolume: 0, delta: 0,
      valueAreaPct, quality, populatedRows: 0,
    };
  }

  const totalVolume = rows.reduce((s, r) => s + r.total, 0);
  const delta = rows.reduce((s, r) => s + (r.up - r.down), 0);

  // POC = highest-volume row. Deterministic tie-break: LOWER price wins
  // (rows is ascending, so the first max encountered is the lowest-price max).
  let pocIdx = 0;
  for (let i = 1; i < rows.length; i++) if (rows[i].total > rows[pocIdx].total) pocIdx = i;

  // ── Value area (directive §11): expand outward from POC, each step adding the
  // side (above vs below) with MORE volume, until cumulative ≥ pct·total.
  // Tie-break when above==below: prefer the ABOVE side (documented, deterministic).
  const target = valueAreaPct * totalVolume;
  let lo = pocIdx, hi = pocIdx;
  let acc = rows[pocIdx].total;
  while (acc < target && (lo > 0 || hi < rows.length - 1)) {
    const above = hi < rows.length - 1 ? rows[hi + 1].total : -1;
    const below = lo > 0 ? rows[lo - 1].total : -1;
    if (above < 0 && below < 0) break;
    if (above >= below) { hi += 1; acc += rows[hi].total; }
    else { lo -= 1; acc += rows[lo].total; }
  }

  return {
    rows, tickSize,
    poc: rows[pocIdx].price,
    vah: rows[hi].price,
    val: rows[lo].price,
    totalVolume, delta, valueAreaPct, quality,
    populatedRows: rows.length,
  };
}

/**
 * EXACT volume-at-price from classified trades. This is the accurate path the
 * engine is built for (directive §0 root-cause fix). Timeframe-independent by
 * construction: it consumes trade events, not candles.
 */
export function computeProfileFromTrades(
  trades: NormalizedTradeLite[],
  opts: ProfileOptions = {},
): ProfileSnapshot {
  const valueAreaPct = opts.valueAreaPct ?? 0.7;
  if (!trades.length) return finalize(new Map(), opts.tickSize ?? 1, valueAreaPct, "trade-based");

  let hi = -Infinity, lo = Infinity;
  for (const t of trades) {
    if (!(t.size > 0) || !Number.isFinite(t.price)) continue;
    if (t.price > hi) hi = t.price;
    if (t.price < lo) lo = t.price;
  }
  const range = hi - lo;
  const tick = opts.tickSize ?? chooseTickSize(range > 0 ? range : Math.abs(hi) || 1, opts.targetRows);

  const buckets = new Map<number, { up: number; down: number }>();
  for (const t of trades) {
    if (!(t.size > 0) || !Number.isFinite(t.price)) continue;
    const key = bucketFloor(t.price, tick);
    const cur = buckets.get(key) ?? { up: 0, down: 0 };
    // Unknown aggressor splits evenly — never invented, just not attributable.
    if (t.side === "buy") cur.up += t.size;
    else if (t.side === "sell") cur.down += t.size;
    else { cur.up += t.size / 2; cur.down += t.size / 2; }
    buckets.set(key, cur);
  }
  return finalize(buckets, tick, valueAreaPct, "trade-based");
}

/**
 * CANDLE-ESTIMATED fallback: spreads each bar's volume evenly across the buckets
 * its high–low touched, up/down split by whole-candle direction. Lower precision
 * — MUST be surfaced to the user as "candle-estimated" (directive §29). This is
 * the current live behavior, extracted here as a pure, testable function so the
 * app can migrate to the trade path without changing render code.
 *
 * IMPORTANT (directive §2/§13): pass the SAME base bar series regardless of the
 * displayed chart timeframe. Feeding different-timeframe candles here yields
 * different distributions — that is the audited root cause, not an engine bug.
 */
export function computeProfileFromBars(
  bars: ProfileBar[],
  opts: ProfileOptions = {},
): ProfileSnapshot {
  const valueAreaPct = opts.valueAreaPct ?? 0.7;
  if (!bars.length) return finalize(new Map(), opts.tickSize ?? 1, valueAreaPct, "candle-estimated");

  let hi = -Infinity, lo = Infinity;
  for (const b of bars) {
    if (!(b.high >= b.low)) continue;
    if (b.high > hi) hi = b.high;
    if (b.low < lo) lo = b.low;
  }
  const range = hi - lo;
  const tick = opts.tickSize ?? chooseTickSize(range > 0 ? range : Math.abs(hi) || 1, opts.targetRows);

  const buckets = new Map<number, { up: number; down: number }>();
  for (const b of bars) {
    if (!(b.volume > 0) || !(b.high >= b.low)) continue;
    const first = bucketFloor(b.low, tick);
    const last = bucketFloor(b.high, tick);
    const nBuckets = Math.max(1, Math.round((last - first) / tick) + 1);
    const per = b.volume / nBuckets;
    const isUp = b.close >= b.open;
    for (let i = 0; i < nBuckets; i++) {
      const key = +(first + i * tick).toFixed(10);
      const cur = buckets.get(key) ?? { up: 0, down: 0 };
      if (isUp) cur.up += per; else cur.down += per;
      buckets.set(key, cur);
    }
  }
  return finalize(buckets, tick, valueAreaPct, "candle-estimated");
}
