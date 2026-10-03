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

/** One price level of a bar's row, as plate 75's LOCAL FOOTPRINT prints it. */
export interface FlowLadderLevelRow {
  readonly price: number;
  readonly bid: number;
  readonly ask: number;
  /** ask − bid at this level. */
  readonly delta: number;
  /** The level carrying the most volume in the row (the bar's own POC). */
  readonly poc: boolean;
}

/**
 * The row's levels, highest price first — read off the row, never off the
 * tape. More levels than `max` keeps the `max` nearest the POC (the plate's
 * ladder is a window around where the bar traded most), and says so.
 */
export function readLadderLevels(
  row: FlowLadderBar | null | undefined,
  max = 9,
): { readonly levels: readonly FlowLadderLevelRow[]; readonly hidden: number } | null {
  if (!row) return null;
  const all: { price: number; bid: number; ask: number }[] = [];
  for (const [price, v] of row) {
    if (!Number.isFinite(price)) continue;
    const ask = Number.isFinite(v.ask) && v.ask > 0 ? v.ask : 0;
    const bid = Number.isFinite(v.bid) && v.bid > 0 ? v.bid : 0;
    if (ask + bid <= 0) continue;
    all.push({ price, bid, ask });
  }
  if (!all.length) return null;
  all.sort((a, b) => b.price - a.price);
  let pocIdx = 0;
  for (let i = 1; i < all.length; i++) {
    if (all[i].bid + all[i].ask > all[pocIdx].bid + all[pocIdx].ask) pocIdx = i;
  }
  const keep = Math.max(1, Math.floor(max));
  let lo = 0;
  if (all.length > keep) lo = Math.min(Math.max(0, pocIdx - Math.floor(keep / 2)), all.length - keep);
  const hi = Math.min(all.length, lo + keep);
  const levels = all.slice(lo, hi).map((l, i) => ({ ...l, delta: l.ask - l.bid, poc: lo + i === pocIdx }));
  return { levels, hidden: all.length - levels.length };
}

/** The fastest the ladder is handed to the room: at most ~4× a second. */
export const FLOW_LADDER_PUBLISH_MS = 250;

export interface FlowLadderPublisher {
  /** Call at the end of every fold that changed the ladder. */
  changed(): void;
  /** Drop a pending trailing publish (ladder rebuilt, chart unmounted). */
  cancel(): void;
}

/**
 * The publish rule for the ladder reader. A throttle alone left the Inspect
 * Ticket one batch behind the prints it held: a fold landing inside the 250 ms
 * window changed the ladder but told no one, and nothing arrived to publish it
 * until the NEXT batch. Here every change is published — at once when the last
 * publish is at least `minMs` old, otherwise by ONE trailing publish at the
 * throttle edge. The ladder can lag its prints by at most `minMs`, never by a
 * batch, and at rest it always ends caught up.
 */
export function createFlowLadderPublisher(
  publish: () => void,
  minMs: number = FLOW_LADDER_PUBLISH_MS,
): FlowLadderPublisher {
  let lastAt = -Infinity;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const fire = () => {
    timer = null;
    lastAt = Date.now();
    publish();
  };
  return {
    changed() {
      if (timer != null) return; // a trailing publish is due; it reads the live ladder
      const wait = minMs - (Date.now() - lastAt);
      if (wait <= 0) fire();
      else timer = setTimeout(fire, wait);
    },
    cancel() {
      if (timer != null) clearTimeout(timer);
      timer = null;
    },
  };
}
