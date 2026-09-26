/**
 * F06A · "SESSION FOOTPRINT" — buy and sell by price, from the tape actually
 * heard, for the rail beneath ORDER FLOW CONTEXT.
 *
 * The plate calls it a SESSION footprint. This room holds the tape only since
 * it began listening (MainChart's accumulator, retained for up to 400 bars),
 * so the owner says so: `sinceSec` travels with the rows and the rail prints
 * "since hh:mm" — never "session" over a partial session.
 *
 * Sides are the venue's (or the declared tick rule's): a print with no stated
 * side adds to neither column — the accumulator already refuses to guess.
 *
 * PURE.
 */

export interface TapeFootprintRow {
  readonly priceLo: number;
  readonly priceHi: number;
  /** Aggressor-buy size (lifted the ask). */
  readonly buy: number;
  /** Aggressor-sell size (hit the bid). */
  readonly sell: number;
}

export interface TapeFootprintVM {
  /** Highest price first, like the price axis. */
  readonly rows: readonly TapeFootprintRow[];
  readonly buy: number;
  readonly sell: number;
  /** Epoch seconds of the first print held. */
  readonly sinceSec: number;
}

export const TAPE_FOOTPRINT_ROWS = 10;

export function selectTapeFootprint(
  acc: ReadonlyMap<number, ReadonlyMap<number, { readonly bid: number; readonly ask: number }>>,
  sinceSec: number | null,
  rows: number = TAPE_FOOTPRINT_ROWS,
): TapeFootprintVM | null {
  if (sinceSec == null || !Number.isFinite(sinceSec)) return null;
  const levels: { price: number; buy: number; sell: number }[] = [];
  for (const lvl of acc.values()) {
    for (const [price, v] of lvl) {
      if (!Number.isFinite(price) || (!(v.ask > 0) && !(v.bid > 0))) continue;
      levels.push({ price, buy: v.ask > 0 ? v.ask : 0, sell: v.bid > 0 ? v.bid : 0 });
    }
  }
  if (levels.length === 0) return null;
  let lo = Infinity, hi = -Infinity, buy = 0, sell = 0;
  for (const l of levels) { lo = Math.min(lo, l.price); hi = Math.max(hi, l.price); buy += l.buy; sell += l.sell; }
  if (!(buy + sell > 0)) return null;
  const n = Math.max(1, Math.round(rows));
  const span = hi - lo;
  const out: TapeFootprintRow[] = [];
  if (span <= 0) {
    out.push({ priceLo: lo, priceHi: hi, buy, sell });
  } else {
    const step = span / n;
    const buckets = Array.from({ length: n }, (_, i) => ({ priceLo: lo + i * step, priceHi: lo + (i + 1) * step, buy: 0, sell: 0 }));
    for (const l of levels) {
      const i = Math.min(n - 1, Math.floor((l.price - lo) / step));
      buckets[i].buy += l.buy;
      buckets[i].sell += l.sell;
    }
    out.push(...buckets.reverse());
  }
  return { rows: out, buy, sell, sinceSec };
}
