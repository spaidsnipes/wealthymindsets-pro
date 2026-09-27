/**
 * flowLadder — the SHAPE of the one flow ladder, and the one way to read a bar
 * row of it (Garden 16 §15: one owner per truth).
 *
 * The ladder itself is folded once, in MainChart (`tickAccRef`): every real
 * executed trade on a verified aggressor tape lands in bar → price level →
 * {bid, ask}. Footprint cells, Delta Bubbles, Tape CVD and the rail footprint
 * read it. The Inspect Ticket used to fold the held prints a SECOND time to get
 * the same bar's delta — two computations of one fact, which agree until one
 * of them is edited (and which already differed: the second fold summed sides
 * on tapes the ladder refuses as unverified). The ticket now reads the bar's
 * row through `readLadderBar`, published by MainChart as a `FlowLadderReader`.
 *
 * `oneFlowLadder.sentinel.test.ts` scans production code for any other fold of
 * buy/sell side into an accumulator and names every allowed one with its owner.
 */

/** One price level of the ladder: aggressor volume by the side that crossed. */
export interface FlowLadderLevel {
  /** Seller crossed (hit the bid). */
  readonly bid: number;
  /** Buyer crossed (lifted the ask). */
  readonly ask: number;
}

/** One bar's row of the ladder: price level → {bid, ask}. */
export type FlowLadderBar = ReadonlyMap<number, FlowLadderLevel>;

/** The whole ladder: bar open (epoch SECONDS) → that bar's row. */
export type FlowLadder = ReadonlyMap<number, FlowLadderBar>;

/**
 * Reads one bar's row from the live ladder. `barTimeSec` is epoch SECONDS —
 * the ladder is keyed on the chart's bar time, never on tick milliseconds.
 */
export type FlowLadderReader = (barTimeSec: number) => FlowLadderBar | null;

export interface FlowLadderBarTotals {
  /** Σ ask across the row — buyer-crossed volume. */
  readonly buy: number;
  /** Σ bid across the row — seller-crossed volume. */
  readonly sell: number;
  /** buy − sell. */
  readonly delta: number;
  /** Price levels carrying any volume. */
  readonly levels: number;
}

/**
 * The bar's totals, read off its ladder row. Not a fold of the tape: the row
 * already holds the tape folded once; this only adds up its levels. Null when
 * the row is missing or holds no signed volume.
 */
export function readLadderBar(row: FlowLadderBar | null | undefined): FlowLadderBarTotals | null {
  if (!row) return null;
  let buy = 0;
  let sell = 0;
  let levels = 0;
  for (const [price, v] of row) {
    if (!Number.isFinite(price)) continue;
    const a = Number.isFinite(v.ask) && v.ask > 0 ? v.ask : 0;
    const b = Number.isFinite(v.bid) && v.bid > 0 ? v.bid : 0;
    if (a + b <= 0) continue;
    buy += a;
    sell += b;
    levels += 1;
  }
  if (!(buy + sell > 0)) return null;
  return { buy, sell, delta: buy - sell, levels };
}
