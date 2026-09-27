/**
 * LIQUIDITY LIFECYCLE ON THE OBSERVED BOOK — the Founder's Liquidity Weather
 * plate (WM_NewMockup_52: APPEARED → GREW → PERSISTED → TOUCHED → CONSUMED)
 * read from resting size that was actually SEEN, not inferred from candles.
 *
 * Garden 16 §30: "Liquidity Weather must be market intelligence. Not colored
 * fog. Use lawful liquidity persistence/response." The candle reading
 * (selectLiquidityLifecycle) can only guess a pool from volume-at-price and
 * must refuse PULLED. Where a real bid/ask book is observed — Kraken's public
 * book for crypto — a pool is resting size, and every stage is an observation:
 *
 *   APPEARED   a price bucket's resting size first reaches WALL_MULTIPLE × the
 *              median non-empty bucket on its side of the book
 *   GREW       its resting size rose ≥ GROWTH above the size it was born with
 *   PERSISTED  it has stood as a wall continuously for PERSIST_MS
 *   TOUCHED    a trade printed inside the bucket while the wall stood
 *   REFILLED   after a touch, resting size rose ≥ GROWTH above the post-touch size
 *   CONSUMED   the wall left the book AND trades inside the bucket account for
 *              ≥ CONSUME_SHARE of the size that left
 *   PULLED     the wall left the book with less than that traded, while the
 *              bucket was still inside the observed book (so its absence is
 *              seen, not a level that scrolled out of the depth window)
 *
 * A wall that leaves by scrolling past the observed depth is dropped with no
 * claim — absence outside the window is not evidence. PULLED is a statement
 * that size left without trading; it is NEVER called spoofing or intent.
 *
 * Venue honesty: the book is ONE venue's book. The VM carries the venue and
 * the surfaces say it; it is not the consolidated market.
 *
 * PURE except for the caller-supplied clock values. Deterministic.
 */

import { krakenWsPair } from "@/lib/api/kraken";
import type { LifecycleStage, LiquidityLifecycleVM, LiquidityPool } from "./viewModels/selectLiquidityLifecycle";
import { LIQUIDITY_LIFECYCLE_VERSION, MAX_POOLS } from "./viewModels/selectLiquidityLifecycle";

export const WALL_MULTIPLE = 3;
export const GROWTH = 0.3;
export const PERSIST_MS = 60_000;
/** A wall must be missing this long before its leaving is judged (book updates flicker). */
export const ABSENCE_MS = 2_000;
export const CONSUME_SHARE = 0.5;
/** Trades older than this cannot explain a wall leaving. */
export const TRADE_MEMORY_MS = 15_000;
/** Ended pools are memory; they are kept this long. */
export const ENDED_MEMORY_MS = 30 * 60_000;

export interface BookLevel { readonly price: number; readonly size: number }

interface Track {
  readonly key: string;
  readonly side: "bid" | "ask";
  readonly bucket: number;
  readonly bornSize: number;
  readonly bornMs: number;
  size: number;
  lastSeenMs: number;
  missingSinceMs: number | null;
  touched: boolean;
  touchSize: number;
  lastTouchMs: number;
  events: { stage: LifecycleStage; atMs: number }[];
  ended: "CONSUMED" | "PULLED" | null;
}

export interface BookLifecycleTracker {
  /** The whole observed book at `atMs` (after the caller applied its deltas). */
  applyBook(atMs: number, bids: readonly BookLevel[], asks: readonly BookLevel[]): void;
  applyTrade(atMs: number, price: number, qty: number): void;
  /** The reading, event times in ms. */
  read(atMs: number): LiquidityLifecycleVM;
  readonly step: number;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

export function createBookLifecycleTracker(opts: { readonly step: number; readonly venue: string }): BookLifecycleTracker {
  const step = opts.step;
  if (!(Number.isFinite(step) && step > 0)) throw new Error("book lifecycle needs a positive price step");
  const bucketOf = (p: number) => Math.floor(p / step);
  const tracks = new Map<string, Track>();
  const trades: { atMs: number; bucket: number; qty: number }[] = [];

  const add = (t: Track, stage: LifecycleStage, atMs: number) => {
    if (stage === "TOUCHED" || stage === "REFILLED" || !t.events.some(e => e.stage === stage)) t.events.push({ stage, atMs });
  };

  const bucketize = (levels: readonly BookLevel[]) => {
    const m = new Map<number, number>();
    for (const l of levels) {
      if (!(Number.isFinite(l.price) && Number.isFinite(l.size) && l.size > 0)) continue;
      const b = bucketOf(l.price);
      m.set(b, (m.get(b) ?? 0) + l.size);
    }
    return m;
  };

  function applySide(atMs: number, side: "bid" | "ask", levels: readonly BookLevel[]) {
    const buckets = bucketize(levels);
    const med = median([...buckets.values()]);
    const wallAt = med * WALL_MULTIPLE;
    const seen = new Set<string>();
    if (med > 0) {
      for (const [b, size] of buckets) {
        if (size < wallAt) continue;
        const key = `${side}:${b}`;
        seen.add(key);
        const t = tracks.get(key);
        if (!t || t.ended) {
          if (t?.ended) tracks.delete(key);
          tracks.set(key, {
            key, side, bucket: b, bornSize: size, bornMs: atMs, size, lastSeenMs: atMs, missingSinceMs: null,
            touched: false, touchSize: 0, lastTouchMs: -Infinity, events: [{ stage: "APPEARED", atMs }], ended: null,
          });
          continue;
        }
        t.size = size;
        t.lastSeenMs = atMs;
        t.missingSinceMs = null;
        if (size >= t.bornSize * (1 + GROWTH)) add(t, "GREW", atMs);
        if (atMs - t.bornMs >= PERSIST_MS) add(t, "PERSISTED", atMs);
        if (t.touched && t.touchSize > 0 && size >= t.touchSize * (1 + GROWTH)) { add(t, "REFILLED", atMs); t.touchSize = size; }
      }
    }
    const lo = buckets.size ? Math.min(...buckets.keys()) : NaN;
    const hi = buckets.size ? Math.max(...buckets.keys()) : NaN;
    for (const t of tracks.values()) {
      if (t.side !== side || t.ended || seen.has(t.key)) continue;
      if (t.missingSinceMs == null) { t.missingSinceMs = atMs; continue; }
      if (atMs - t.missingSinceMs < ABSENCE_MS) continue;
      const traded = trades
        .filter(x => x.bucket === t.bucket && x.atMs >= t.lastSeenMs - TRADE_MEMORY_MS && x.atMs <= atMs)
        .reduce((s, x) => s + x.qty, 0);
      if (traded >= t.size * CONSUME_SHARE) {
        add(t, "CONSUMED", t.missingSinceMs); t.ended = "CONSUMED";
      } else if (Number.isFinite(lo) && t.bucket >= lo && t.bucket <= hi) {
        // Still inside the observed book on its side, and the size is gone without trading.
        add(t, "PULLED", t.missingSinceMs); t.ended = "PULLED";
      } else {
        tracks.delete(t.key); // scrolled out of the observed depth — no claim
      }
    }
  }

  return {
    step,
    applyBook(atMs, bids, asks) {
      applySide(atMs, "bid", bids);
      applySide(atMs, "ask", asks);
      while (trades.length && trades[0].atMs < atMs - TRADE_MEMORY_MS * 2) trades.shift();
      for (const t of [...tracks.values()]) {
        if (t.ended && atMs - (t.events[t.events.length - 1]?.atMs ?? atMs) > ENDED_MEMORY_MS) tracks.delete(t.key);
      }
    },
    applyTrade(atMs, price, qty) {
      if (!(Number.isFinite(price) && Number.isFinite(qty) && qty > 0)) return;
      const b = bucketOf(price);
      trades.push({ atMs, bucket: b, qty });
      for (const t of tracks.values()) {
        if (t.ended || t.bucket !== b) continue;
        if (atMs - t.lastTouchMs < 5_000) continue; // one touch per burst
        add(t, "TOUCHED", atMs);
        t.touched = true;
        t.touchSize = t.size;
        t.lastTouchMs = atMs;
      }
    },
    read(atMs) {
      void atMs;
      const pools: (LiquidityPool & { readonly side: "bid" | "ask" })[] = [...tracks.values()]
        .map(t => {
          const events = [...t.events].sort((a, z) => a.atMs - z.atMs).map(e => ({ stage: e.stage, time: e.atMs }));
          return {
            price: (t.bucket + 0.5) * step, low: t.bucket * step, high: (t.bucket + 1) * step,
            stage: events[events.length - 1].stage, events, volume: t.size, side: t.side,
          };
        })
        .sort((a, z) => {
          const la = a.stage !== "CONSUMED" && a.stage !== "PULLED" ? 1 : 0;
          const lz = z.stage !== "CONSUMED" && z.stage !== "PULLED" ? 1 : 0;
          if (la !== lz) return lz - la;
          if (!la) return (z.events[z.events.length - 1]?.time ?? 0) - (a.events[a.events.length - 1]?.time ?? 0);
          return z.volume - a.volume;
        })
        .slice(0, MAX_POOLS * 2);
      return {
        version: LIQUIDITY_LIFECYCLE_VERSION,
        drawn: pools.length > 0,
        reason: pools.length ? "DRAWN" : "NO_POOLS",
        pools,
        step,
        basis: "OBSERVED_BOOK",
        venue: opts.venue,
        pulledRefusal: null,
      };
    },
  };
}

/**
 * Book events carry wall-clock ms; the chart places marks on BAR times
 * (seconds). Each event moves to the bar that contains it — the newest bar
 * whose open time is ≤ the event — and an event before the first loaded bar
 * sits on the first bar. Returns a new VM; the input is not touched. PURE.
 */
export function placeBookEventsOnBars(vm: LiquidityLifecycleVM, barTimesSec: readonly number[]): LiquidityLifecycleVM {
  const times = barTimesSec.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (times.length === 0) return { ...vm, drawn: false, reason: "TOO_FEW_BARS", pools: [] };
  const snap = (ms: number) => {
    const s = ms / 1000;
    let lo = 0, hi = times.length - 1, ans = times[0];
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (times[mid] <= s) { ans = times[mid]; lo = mid + 1; } else hi = mid - 1;
    }
    return ans;
  };
  return { ...vm, pools: vm.pools.map(p => ({ ...p, events: p.events.map(e => ({ stage: e.stage, time: snap(e.time) })) })) };
}

/**
 * The Kraken book pair for a chart symbol, or null. Only a USD quote maps:
 * BTCUSD / BTC-USD / BTC/USD → "BTC/USD". A USDT pair is a different
 * instrument (its own book, its own price) and gets no book here. PURE.
 */
export function krakenBookPairForChart(symbol: string): string | null {
  const m = /^([A-Z0-9]{2,10})USD$/.exec(symbol.toUpperCase().replace(/[-/\s]/g, ""));
  return m ? krakenWsPair(m[1]) : null;
}

/** The candle reading's bucket: a third of the median bar range. PURE. */
export function bookBucketStep(bars: readonly { readonly high: number; readonly low: number }[]): number {
  const r = bars.map(b => b.high - b.low).filter(x => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  return r.length ? r[Math.floor(r.length / 2)] / 3 : 0;
}
