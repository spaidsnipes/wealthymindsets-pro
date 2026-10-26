import { MIN_PRINTS_FOR_PERCENTILE } from "@/lib/marketData/viewModels/selectBigTradeIntelligence";
/**
 * BIG-TRADE DISC TIER — the visual weight a print earns from a real statistic.
 *
 * Founder 2026-10-03: "make the bubbles look more wow ath". The disc already
 * encodes size by radius; the tier adds the canon's G04 language (98.7th
 * percentile · top 1.3% of session trades) to the glass itself:
 *   WHALE  ≥ 99th percentile of every print this chart captured this session
 *   CROWN  ≥ 95th
 *   BASE   everything else — and ALWAYS when the percentile is unknown (too few
 *          prints yet): a crown is never awarded on thin evidence.
 */
export type BigTradeTier = "WHALE" | "CROWN" | "BASE";

export function bigTradeTier(pct: number | null | undefined): BigTradeTier {
  if (pct == null || !Number.isFinite(pct)) return "BASE";
  if (pct >= 0.99) return "WHALE";
  if (pct >= 0.95) return "CROWN";
  return "BASE";
}

/**
 * Arrival shockwave: 0 → 1 over one cycle, or null when the print is no longer
 * arriving or motion is off (STILL / reduced motion never ripple).
 */
export function arrivalRipple(nowMs: number, bornMs: number, arriving: boolean, motionOn: boolean, cycleMs = 1600): number | null {
  if (!arriving || !motionOn) return null;
  const t = ((nowMs - bornMs) % cycleMs + cycleMs) % cycleMs;
  return t / cycleMs;
}


/**
 * Every session print's size (bid + ask), ascending — built once per change of print count.
 * A typed-array numeric sort (perf 2026-10-15): on a busy crypto tape the session holds tens of
 * thousands of prints and the comparator sort ran on every new print. Same order, same answer.
 */
export function sortedSessionSizes(bars: Iterable<readonly { bid: number; ask: number }[]>): Float64Array {
  const out: number[] = [];
  for (const prints of bars) for (const p of prints) {
    const s = (Number.isFinite(p.bid) && p.bid > 0 ? p.bid : 0) + (Number.isFinite(p.ask) && p.ask > 0 ? p.ask : 0);
    if (s > 0) out.push(s);
  }
  return Float64Array.from(out).sort();
}

/** The same answer as footprintCanon.sessionSizePercentile (share strictly below), by binary search. */
export function percentileFromSorted(sorted: ArrayLike<number>, size: number): number | null {
  const n = sorted.length;
  if (n < MIN_PRINTS_FOR_PERCENTILE || n === 0) return null;
  let lo = 0, hi = n;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < size) lo = mid + 1; else hi = mid; }
  return lo / n;
}

/**
 * THE SESSION'S SORTED PRINT SIZES, KEPT — not rebuilt (perf P0 2026-10-25).
 *
 * `sortedSessionSizes` re-read and re-sorted EVERY captured print whenever the count moved, and on a
 * live tape the count moves every frame: measured on a local production build (BTC 1m, every
 * invention on, 40 prints/s) the "session size ranks" paint section cost 5.8–8.9 ms of an ~19 ms
 * paint, growing with the session. This index answers the SAME array (same sizes, same ascending
 * order) and only does new work for new prints: each bar's print list is append-only between
 * resets, so the prints past the length already read are merged in (O(n) copy, no re-sort). A bar
 * that left the map, a list that shrank or a new map (symbol / timeframe / re-fold) rebuilds once.
 */
export class SessionSizeIndex {
  private acc: ReadonlyMap<number, readonly { bid: number; ask: number }[]> | null = null;
  private readLen = new Map<number, number>();
  private sorted: Float64Array = new Float64Array(0);
  /** How many full rebuilds ran (test seam / receipt). */
  rebuilds = 0;

  /** Brings the index level with `acc` and returns the ascending sizes (same as sortedSessionSizes). */
  sync(acc: ReadonlyMap<number, readonly { bid: number; ask: number }[]>): Float64Array {
    let rebuild = acc !== this.acc || acc.size < this.readLen.size;
    const fresh: number[] = [];
    if (!rebuild) {
      for (const [t, prints] of acc) {
        const seen = this.readLen.get(t) ?? 0;
        if (prints.length < seen) { rebuild = true; break; }
        for (let i = seen; i < prints.length; i++) {
          const s = sizeOf(prints[i]);
          if (s > 0) fresh.push(s);
        }
      }
      // A bar this index read is gone: its sizes must leave too.
      if (!rebuild && this.readLen.size > 0) for (const t of this.readLen.keys()) if (!acc.has(t)) { rebuild = true; break; }
    }
    if (rebuild) {
      this.rebuilds++;
      this.acc = acc;
      this.readLen = new Map();
      for (const [t, prints] of acc) this.readLen.set(t, prints.length);
      this.sorted = sortedSessionSizes(acc.values());
      return this.sorted;
    }
    for (const [t, prints] of acc) this.readLen.set(t, prints.length);
    if (fresh.length) this.sorted = mergeSorted(this.sorted, Float64Array.from(fresh).sort());
    return this.sorted;
  }
}

function sizeOf(p: { bid: number; ask: number }): number {
  return (Number.isFinite(p.bid) && p.bid > 0 ? p.bid : 0) + (Number.isFinite(p.ask) && p.ask > 0 ? p.ask : 0);
}

function mergeSorted(a: Float64Array, b: Float64Array): Float64Array {
  const out = new Float64Array(a.length + b.length);
  let i = 0, j = 0, k = 0;
  while (i < a.length && j < b.length) out[k++] = a[i] <= b[j] ? a[i++] : b[j++];
  while (i < a.length) out[k++] = a[i++];
  while (j < b.length) out[k++] = b[j++];
  return out;
}
