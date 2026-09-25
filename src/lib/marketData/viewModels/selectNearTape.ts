/**
 * NEAR TAPE — canon plate H-501 (WM_A_H501_SEMANTIC_ZOOM), right panel:
 * "TAPE TICKS". At NEAR the last executions this chart captured stand beside
 * the live candle: price and which side initiated.
 *
 * WHO INITIATED IS ONLY AS TRUE AS ITS METHOD. A venue stamp (PROVIDER, or the
 * maker side inverted) is OBSERVED. A tick-rule or quote-test guess is
 * INFERRED — the equity relay tape is TICK_RULE for every print — and a print
 * with no disclosed method is UNKNOWN. Each row carries its fidelity and a
 * glyph that says it (`+` / `~+` / `?+`), and the column carries a legend
 * whenever any row is not observed: the same OBSERVED / INFERRED / UNKNOWN
 * vocabulary the Inspect ticket and the print tickets use, so one frame never
 * shows a guessed side as a fact beside a ticket that says SIDE INFERRED.
 *
 * NEVER A PER-FRAME HISTORY SORT. The accumulator keeps every print of every
 * bar (no per-bar cap), and a busy tape holds tens of thousands in the last
 * two bars. Prints are appended but NOT in time order (each flush pushes a
 * newest-first batch), so the tail is not "the newest ten". The cache below
 * is exact and cheap: nothing new → the previous result; new prints appended
 * to the same two bars → merge only those into the previous top rows; a new
 * bar (or a reset tape) → one bounded scan of the two newest bars.
 *
 * PURE apart from the cache object the caller hands back each frame.
 */

import type { BigTradeTick } from "@/lib/bigTradeLevels";
import { formatBubblePrice } from "@/lib/bubbleClaim";
import type { AggressorMethod } from "@/lib/marketData/marketEvent";

export const NEAR_TAPE_ROWS = 10;

export type SideFidelity = "OBSERVED" | "INFERRED" | "UNKNOWN";

export interface NearTapeRow {
  readonly timeMs: number;
  /** Formatted with the house price formatter (sub-dollar keeps its digits). */
  readonly price: string;
  readonly buy: boolean;
  readonly fidelity: SideFidelity;
  /** `+`/`−` observed · `~+`/`~−` inferred · `?+`/`?−` method undisclosed. */
  readonly glyph: string;
}

export interface NearTapeVM {
  /** Newest first. */
  readonly rows: readonly NearTapeRow[];
  /** The legend the column must print; null only when every side is observed. */
  readonly fidelityNote: string | null;
}

export type TapeAccumulator = ReadonlyMap<number, readonly BigTradeTick[]>;

export interface NearTapeCache {
  readonly acc: TapeAccumulator;
  readonly k1: number;
  readonly k2: number;
  readonly a1: readonly BigTradeTick[] | undefined;
  readonly a2: readonly BigTradeTick[] | undefined;
  readonly n1: number;
  readonly n2: number;
  readonly top: readonly BigTradeTick[];
  readonly vm: NearTapeVM;
}

export function sideFidelity(method: AggressorMethod | undefined): SideFidelity {
  if (method === "PROVIDER" || method === "MAKER_SIDE_INVERTED") return "OBSERVED";
  if (method === "TICK_RULE" || method === "QUOTE_TEST") return "INFERRED";
  return "UNKNOWN";
}

const GLYPH_PREFIX: Readonly<Record<SideFidelity, string>> = { OBSERVED: "", INFERRED: "~", UNKNOWN: "?" };

/** Insert arr[from..to) into `top` (newest first, at most `limit`). */
function mergeNewest(top: BigTradeTick[], arr: readonly BigTradeTick[] | undefined, from: number, to: number, limit: number): void {
  if (!arr) return;
  for (let i = from; i < to; i++) {
    const t = arr[i];
    const ms = t?.timeMs;
    if (ms == null || !Number.isFinite(ms)) continue;
    if (top.length >= limit && ms <= (top[top.length - 1].timeMs as number)) continue;
    let j = top.length;
    while (j > 0 && (top[j - 1].timeMs as number) < ms) j--;
    top.splice(j, 0, t);
    if (top.length > limit) top.pop();
  }
}

function project(top: readonly BigTradeTick[]): NearTapeVM {
  let inferred = 0, unknown = 0;
  const rows = top.map((t): NearTapeRow => {
    const fidelity = sideFidelity(t.aggressorMethod);
    if (fidelity === "INFERRED") inferred++;
    if (fidelity === "UNKNOWN") unknown++;
    const buy = t.ask > t.bid;
    return { timeMs: t.timeMs as number, price: formatBubblePrice(t.price), buy, fidelity, glyph: `${GLYPH_PREFIX[fidelity]}${buy ? "+" : "−"}` };
  });
  const fidelityNote = inferred > 0 && unknown > 0 ? "~ INFERRED · ? UNKNOWN"
    : inferred > 0 ? "~ = SIDE INFERRED"
    : unknown > 0 ? "? = SIDE UNKNOWN"
    : null;
  return { rows, fidelityNote };
}

/**
 * The newest `limit` captured prints of the two newest bars in the
 * accumulator. Hand the returned cache back on the next frame.
 */
export function selectNearTape(acc: TapeAccumulator, cache: NearTapeCache | null, limit: number = NEAR_TAPE_ROWS): NearTapeCache {
  // The two newest bar keys: one pass over at most a few hundred numbers,
  // no key array, no sort.
  let k1 = -Infinity, k2 = -Infinity;
  for (const k of acc.keys()) {
    if (k > k1) { k2 = k1; k1 = k; } else if (k > k2) k2 = k;
  }
  const a1 = acc.get(k1), a2 = acc.get(k2);
  const n1 = a1?.length ?? 0, n2 = a2?.length ?? 0;

  if (cache && cache.acc === acc && cache.k1 === k1 && cache.k2 === k2 && cache.a1 === a1 && cache.a2 === a2
    && n1 >= cache.n1 && n2 >= cache.n2) {
    if (n1 === cache.n1 && n2 === cache.n2) return cache;
    // Bars only ever gain prints, so the newest rows are the old top rows
    // plus whatever arrived since — nothing older can re-enter.
    const top = cache.top.slice();
    mergeNewest(top, a1, cache.n1, n1, limit);
    mergeNewest(top, a2, cache.n2, n2, limit);
    return { acc, k1, k2, a1, a2, n1, n2, top, vm: project(top) };
  }

  const top: BigTradeTick[] = [];
  mergeNewest(top, a1, 0, n1, limit);
  mergeNewest(top, a2, 0, n2, limit);
  return { acc, k1, k2, a1, a2, n1, n2, top, vm: project(top) };
}

/* ══════════════════════════════════════════════════════════════════════════
   TAPE PATHS ON THE CANDLES — H-501 NEAR ("tape paths, candle components"),
   H-701 ("big trade cluster ON THE WICK, executions stacked in size";
   "response hatch INSIDE the bar … built around fair value"), F06B ("raw
   tape lives in Inspect for the selected object, camera alive").

   The NEAR tape used to be a TEXT LIST in a box on the glass ("TAPE · LAST 10
   PRINTS"): a card, not geometry. Here each bar's held prints become
   geometry in the price/time domain — the painter only projects:

     · DOTS   the bar's largest held prints at their own execution time and
              price, sized by size (the H-701 cluster lands where it traded).
     · PATH   the forming bar's tape, time-ordered, as one thin line — every
              held print contributes; decimated to fixed time buckets keeping
              each bucket's first, low, high and last, so no extreme is lost.
     · VALUE  the bar's own traded value area (70% of its held volume around
              its POC): the H-701 response hatch's extent. Held tape only.

   Raw rows are NOT painted on the glass. `selectPrintRawTape` hands the
   selected print's neighbours in its own bar to Inspect.

   INCREMENTAL. A bar only ever gains prints; the cache reads only prints that
   arrived since the last frame, and a closed bar is computed once. No
   per-frame sort of the tape.
   ══════════════════════════════════════════════════════════════════════════ */

/** The fraction of a bar's held volume its value area covers. */
export const BAR_VALUE_AREA_SHARE = 0.7;
/** Time buckets the forming bar's path is decimated to. */
export const TAPE_PATH_BUCKETS = 120;

export interface NearTapeDot {
  readonly timeMs: number;
  readonly price: number;
  /** Executed size (buyer- plus seller-initiated; one of them is zero). */
  readonly size: number;
  readonly buy: boolean;
  readonly fidelity: SideFidelity;
  readonly printKey?: string;
  readonly aggressorMethod?: AggressorMethod;
}

export interface TapePathPoint {
  readonly timeMs: number;
  readonly price: number;
}

export interface BarValueArea {
  readonly low: number;
  readonly high: number;
  readonly poc: number;
}

export interface BarTapeVM {
  readonly barTime: number;
  /** Prints with a finite time, price and size — what the tape actually held. */
  readonly held: number;
  /** Largest first, at most `maxDots`. */
  readonly dots: readonly NearTapeDot[];
  /** Time-ordered; null unless the path was asked for (the forming bar). */
  readonly path: readonly TapePathPoint[] | null;
  readonly valueArea: BarValueArea | null;
}

interface PathBucket { first: BigTradeTick; last: BigTradeTick; lo: BigTradeTick; hi: BigTradeTick }

export interface BarTapeCache {
  readonly arr: readonly BigTradeTick[];
  readonly n: number;
  readonly maxDots: number;
  readonly withPath: boolean;
  readonly held: number;
  readonly top: readonly BigTradeTick[];
  /** Owned by the cache and grown in place; never shared with the caller. */
  readonly vol: Map<number, number>;
  readonly buckets: readonly (PathBucket | undefined)[] | null;
  readonly vm: BarTapeVM;
}

const sizeOf = (t: BigTradeTick) => (t.bid > 0 ? t.bid : 0) + (t.ask > 0 ? t.ask : 0);
const usable = (t: BigTradeTick | undefined): t is BigTradeTick & { timeMs: number } =>
  !!t && t.timeMs != null && Number.isFinite(t.timeMs) && Number.isFinite(t.price) && t.price > 0 && sizeOf(t) > 0;

function toDot(t: BigTradeTick): NearTapeDot {
  return {
    timeMs: t.timeMs as number, price: t.price, size: sizeOf(t), buy: t.ask > t.bid,
    fidelity: sideFidelity(t.aggressorMethod), printKey: t.printKey, aggressorMethod: t.aggressorMethod,
  };
}

/** Value area by exact printed price: POC, then the heavier neighbour, until the share is reached. */
export function barValueArea(vol: ReadonlyMap<number, number>, share: number = BAR_VALUE_AREA_SHARE): BarValueArea | null {
  if (vol.size === 0) return null;
  const prices = [...vol.keys()].sort((a, b) => a - b);
  let total = 0, pocI = 0;
  for (let i = 0; i < prices.length; i++) {
    const v = vol.get(prices[i]) as number;
    total += v;
    if (v > (vol.get(prices[pocI]) as number)) pocI = i;
  }
  if (!(total > 0)) return null;
  let lo = pocI, hi = pocI, acc = vol.get(prices[pocI]) as number;
  while (acc < total * share && (lo > 0 || hi < prices.length - 1)) {
    const up = hi < prices.length - 1 ? (vol.get(prices[hi + 1]) as number) : -1;
    const dn = lo > 0 ? (vol.get(prices[lo - 1]) as number) : -1;
    if (up >= dn) { hi++; acc += up; } else { lo--; acc += dn; }
  }
  return { low: prices[lo], high: prices[hi], poc: prices[pocI] };
}

function pathOf(buckets: readonly (PathBucket | undefined)[]): TapePathPoint[] {
  const out: TapePathPoint[] = [];
  const push = (t: BigTradeTick) => {
    const p = out[out.length - 1];
    if (p && p.timeMs === t.timeMs && p.price === t.price) return;
    out.push({ timeMs: t.timeMs as number, price: t.price });
  };
  for (const b of buckets) {
    if (!b) continue;
    const mid = (b.lo.timeMs as number) <= (b.hi.timeMs as number) ? [b.lo, b.hi] : [b.hi, b.lo];
    for (const t of [b.first, ...mid, b.last]) push(t);
  }
  return out;
}

/**
 * One bar's held tape as geometry. Hand the returned cache back next frame;
 * a new array (bar re-keyed, tape reset) or fewer prints starts over.
 */
export function selectBarTape(
  prints: readonly BigTradeTick[],
  cache: BarTapeCache | null,
  opts: { barTime: number; intervalSec: number; maxDots: number; withPath: boolean },
): BarTapeCache {
  const n = prints.length;
  const reuse = cache != null && cache.arr === prints && cache.n <= n && cache.maxDots === opts.maxDots && cache.withPath === opts.withPath;
  if (reuse && cache.n === n) return cache;
  const from = reuse ? cache.n : 0;
  const top = reuse ? cache.top.slice() : [];
  const vol = reuse ? cache.vol : new Map<number, number>();
  const buckets: (PathBucket | undefined)[] | null = opts.withPath
    ? (reuse && cache.buckets ? cache.buckets.slice() : new Array<PathBucket | undefined>(TAPE_PATH_BUCKETS))
    : null;
  let held = reuse ? cache.held : 0;
  const span = Math.max(1, opts.intervalSec) * 1000, t0 = opts.barTime * 1000;
  for (let i = from; i < n; i++) {
    const t = prints[i];
    if (!usable(t)) continue;
    held++;
    const s = sizeOf(t);
    vol.set(t.price, (vol.get(t.price) ?? 0) + s);
    if (top.length < opts.maxDots || s > sizeOf(top[top.length - 1])) {
      let j = top.length;
      while (j > 0 && sizeOf(top[j - 1]) < s) j--;
      top.splice(j, 0, t);
      if (top.length > opts.maxDots) top.pop();
    }
    if (buckets) {
      const k = Math.max(0, Math.min(TAPE_PATH_BUCKETS - 1, Math.floor(((t.timeMs - t0) / span) * TAPE_PATH_BUCKETS)));
      const b = buckets[k];
      if (!b) buckets[k] = { first: t, last: t, lo: t, hi: t };
      else {
        const nb = { ...b };
        if (t.timeMs < (b.first.timeMs as number)) nb.first = t;
        if (t.timeMs >= (b.last.timeMs as number)) nb.last = t;
        if (t.price < b.lo.price) nb.lo = t;
        if (t.price > b.hi.price) nb.hi = t;
        buckets[k] = nb;
      }
    }
  }
  const vm: BarTapeVM = {
    barTime: opts.barTime,
    held,
    dots: top.map(toDot),
    path: buckets ? pathOf(buckets) : null,
    valueArea: barValueArea(vol),
  };
  return { arr: prints, n, maxDots: opts.maxDots, withPath: opts.withPath, held, top, vol, buckets, vm };
}

/** How the painter marks a dot's side: ink only where the side is lawful. */
export type DotSideInk = "SOLID" | "RING" | "NEUTRAL";
export function dotSideInk(f: SideFidelity): DotSideInk {
  return f === "OBSERVED" ? "SOLID" : f === "INFERRED" ? "RING" : "NEUTRAL";
}

/** The one legend the dots need, or null when every side shown was observed. */
export function tapeDotLegend(sawInferred: boolean, sawUnknown: boolean): string | null {
  return sawInferred && sawUnknown ? "TAPE · ○ SIDE INFERRED · GREY SIDE UNKNOWN"
    : sawInferred ? "TAPE · ○ = SIDE INFERRED"
    : sawUnknown ? "TAPE · GREY = SIDE UNKNOWN"
    : null;
}

export interface RawTapeRow {
  readonly timeMs: number;
  readonly price: number;
  readonly size: number;
  readonly buy: boolean;
  readonly fidelity: SideFidelity;
  /** `+`/`−` observed · `~+`/`~−` inferred · `?+`/`?−` undisclosed (the NEAR vocabulary). */
  readonly glyph: string;
  readonly selected: boolean;
  readonly printKey?: string;
}

export interface RawTapeVM {
  readonly barTime: number;
  /** Held prints in the bar. */
  readonly held: number;
  /** Newest first: the selected print and its neighbours in time. */
  readonly rows: readonly RawTapeRow[];
  /** 1 = the bar's largest held print. Null when the print was not found. */
  readonly sizeRank: number | null;
  readonly fidelityNote: string | null;
}

export const RAW_TAPE_ROWS = 10;

/**
 * F06B · the raw tape of ONE selected object: the selected print and its
 * neighbours in its own bar, newest first. Run once per click, never per frame.
 * A print is found by its execution identity; failing that, by its time and
 * price. Not found → rows are the bar's newest prints and nothing is marked.
 */
export function selectPrintRawTape(
  prints: readonly BigTradeTick[] | undefined,
  target: { barTime: number; printKey?: string; timeMs?: number | null; price: number },
  limit: number = RAW_TAPE_ROWS,
): RawTapeVM {
  const held = (prints ?? []).filter(usable).sort((a, b) => (a.timeMs as number) - (b.timeMs as number));
  let at = target.printKey ? held.findIndex(t => t.printKey === target.printKey) : -1;
  if (at < 0 && target.timeMs != null) at = held.findIndex(t => t.timeMs === target.timeMs && t.price === target.price);
  let lo: number, hi: number;
  if (at < 0) { hi = held.length; lo = Math.max(0, hi - limit); }
  else {
    lo = Math.max(0, at - Math.floor(limit / 2));
    hi = Math.min(held.length, lo + limit);
    lo = Math.max(0, hi - limit);
  }
  const sel = at >= 0 ? held[at] : null;
  const window = held.slice(lo, hi);
  const rows = window.slice().reverse().map((t): RawTapeRow => {
    const fidelity = sideFidelity(t.aggressorMethod);
    const buy = t.ask > t.bid;
    return {
      timeMs: t.timeMs as number, price: t.price, size: sizeOf(t), buy, fidelity,
      glyph: `${GLYPH_PREFIX[fidelity]}${buy ? "+" : "−"}`, selected: t === sel, printKey: t.printKey,
    };
  });
  const sizeRank = sel ? 1 + held.filter(t => sizeOf(t) > sizeOf(sel)).length : null;
  return { barTime: target.barTime, held: held.length, rows, sizeRank, fidelityNote: project(window).fidelityNote };
}
