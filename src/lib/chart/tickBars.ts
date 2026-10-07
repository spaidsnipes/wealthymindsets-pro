/**
 * TICK (N-TRADE) BARS — built from real signed prints, never from candles.
 *
 * Constitution OPEN item "TICK (N-trade) bars are not built" (closed by this
 * module + its MainChart door, 2026-10-07). The registry owns WHICH counts
 * exist (TICK_BAR_COUNTS in src/lib/timeframes.ts); this module owns HOW a bar
 * is made from prints:
 *
 *   one bar = N consecutive prints, in market-time order
 *   open/high/low/close = the prints' own prices
 *   volume = the sum of the prints' sizes
 *
 * SIDES ARE NOT FOLDED HERE (one flow brain, oneFlowLadder.sentinel): the
 * chart's ONE ladder (`tickAccRef`, MainChart's `foldPrint`) buckets every
 * print by THIS module's bar time on a tick timeframe, so a tick bar's
 * buy/sell volume is read from the ladder, where every other order-flow
 * reading already reads it. A second side-fold here would be a second copy.
 *
 * ── WHERE THE PAST BEGINS ───────────────────────────────────────────────────
 * Bars are anchored at the FIRST HELD PRINT. A tick bar's boundaries depend on
 * where counting started, and nothing in this product holds the session's
 * first print, so the honest anchor is the first one we do hold — and the
 * chart says so ("TICK BARS · from <time> · <n> prints"). When a backfill
 * brings OLDER prints, the anchor moves and the bars are rebuilt once (one
 * reset, never per frame).
 *
 * ── SMOOTHNESS (Founder #1) ─────────────────────────────────────────────────
 * A print that arrives in order is folded in O(1): it replaces the forming
 * bar or opens the next one. Only an OLDER print (a backfill) marks the bars
 * dirty from the bar it lands in, and the rebuild happens once, lazily, on the
 * next read. `drain()` tells the painter exactly which bars changed, so the
 * painter calls `series.update` on the tail instead of `setData` on everything.
 *
 * ── TIME ON THE AXIS ────────────────────────────────────────────────────────
 * A bar's chart time is its first print's epoch time in SECONDS WITH
 * MILLISECOND PRECISION (the chart library accepts fractional timestamps).
 * Several 100T bars can open in one second; when two would open in the same
 * millisecond the later one is placed 1 ms after the earlier, so the axis stays
 * strictly increasing. The bar's true first-print time stays in `firstPrintMs`
 * and in its identity.
 *
 * PURE: no React, no DOM, no clock reads.
 */

import { mintTickBarId, BAR_PROVENANCES, SESSION_UNKNOWN, SESSION_CONTINUOUS, type CanonicalBarIdentity, type LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import { MARKET_FIDELITIES } from "@/lib/marketData/marketFidelityAlgebra";
import type { CanonicalMarketEvent } from "@/lib/marketData/marketEvent";
import type { BarCountdown } from "@/lib/chart/chartBarCountdown";

/** One real print, as the tick-bar builder holds it. */
export interface TickPrint {
  readonly timeMs: number;
  readonly price: number;
  readonly size: number;
  /** Dedupe identity (eventId where the adapter mints one). */
  readonly key: string;
  /** Provider sequence, when the print carries a numeric one. */
  readonly seq: number | null;
  /** False = arrived by backfill (REST history), not heard on the live socket. */
  readonly heardLive: boolean;
  /** The shared-tape print it came from (refolded into THE ladder on a re-cut). */
  readonly origin: TapeTickLike;
}

/**
 * The artery's own six numbers (time = first print's epoch seconds, ms
 * precision, strictly increasing) plus where the bar's prints came from. No
 * private OHLC shape (canonicalBarAdoption census).
 */
export interface TickBar extends LegacyOhlcvTuple {
  /** Prints in this bar (N for every bar but the forming one). */
  readonly prints: number;
  readonly firstPrintMs: number;
  readonly lastPrintMs: number;
  /** Provider seq of the opening print, else its ordinal within its millisecond. */
  readonly firstSeq: number;
  /** True when every print in the bar was heard on the live socket. */
  readonly heardLive: boolean;
}

/** The minimal print shape the shared tape (`useWebSocket` Tick) carries. */
export interface TapeTickLike {
  readonly price: number;
  readonly size: number;
  readonly side: "buy" | "sell";
  readonly time: number;
  readonly trade?: boolean;
  readonly marketEvent?: Pick<CanonicalMarketEvent, "eventId" | "sequenceId">;
}

/**
 * Adapt one shared-tape print. Null when it is not a real executed trade with a
 * finite positive price and size and a finite time — a quote, a synthetic
 * direction tick or a REST snapshot never becomes a tick-bar print.
 */
export function printFromTapeTick(tick: TapeTickLike, heardLive: boolean): TickPrint | null {
  if (!tick.trade) return null;
  if (!Number.isFinite(tick.price) || tick.price <= 0) return null;
  if (!Number.isFinite(tick.size) || tick.size <= 0) return null;
  if (!Number.isFinite(tick.time) || tick.time <= 0) return null;
  const ev = tick.marketEvent;
  const eventId = ev?.eventId?.trim();
  // The same identity the chart's one fold dedupes on (marketTickDedupeKey).
  const key = eventId ? `event:${eventId}` : `legacy:${tick.time}|${tick.price}|${tick.size}|${tick.side}`;
  const seqRaw = ev?.sequenceId;
  const seq = typeof seqRaw === "number" && Number.isFinite(seqRaw) ? seqRaw
    : typeof seqRaw === "string" && /^\d+$/.test(seqRaw) ? Number(seqRaw) : null;
  return { timeMs: tick.time, price: tick.price, size: tick.size, key, seq, heardLive, origin: tick };
}

/** Market-time order: time, then provider sequence where both carry one. */
function before(a: TickPrint, b: TickPrint): boolean {
  if (a.timeMs !== b.timeMs) return a.timeMs < b.timeMs;
  if (a.seq != null && b.seq != null) return a.seq < b.seq;
  return false; // same ms, no sequence: arrival order stands
}

function compare(a: TickPrint, b: TickPrint): number {
  if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
  if (a.seq != null && b.seq != null) return a.seq - b.seq;
  return 0;
}

/** What changed since the last drain. */
export type TickBarChange =
  | { readonly kind: "none" }
  /** Bars at index >= fromIndex changed or were added; everything before is as painted. */
  | { readonly kind: "tail"; readonly fromIndex: number }
  /** The set was rebuilt (older prints arrived, or the oldest bars were shed). Repaint all. */
  | { readonly kind: "reset" };

export interface TickBarCoverage {
  /** First held print (epoch ms), null when nothing is held. */
  readonly fromMs: number | null;
  readonly toMs: number | null;
  readonly prints: number;
  readonly bars: number;
  /** Prints that arrived by backfill rather than live. */
  readonly backfilledPrints: number;
}

export interface TickBarBuilderOptions {
  /** Hard bound on held prints. Shed oldest in WHOLE bars so boundaries hold. */
  readonly maxPrints?: number;
}

/** Default bound: ~200k prints — ~100 2000T bars, ~2000 100T bars, a few MB. */
export const TICK_BAR_MAX_PRINTS = 200_000;

export type TickIngest = "dup" | "append" | "insert";

export class TickBarBuilder {
  readonly ticks: number;
  private readonly maxPrints: number;
  private prints: TickPrint[] = [];
  private keys = new Set<string>();
  private barList: TickBar[] = [];
  /** First bar index that no longer matches `prints`, or null when clean. */
  private dirtyFrom: number | null = null;
  /** Lowest bar index changed since the last drain, or null. */
  private changedFrom: number | null = null;
  private resetPending = false;
  private backfilled = 0;

  constructor(ticks: number, opts: TickBarBuilderOptions = {}) {
    if (!Number.isInteger(ticks) || ticks < 1) throw new Error(`Tick bars need a positive integer print count, got ${ticks}`);
    this.ticks = ticks;
    this.maxPrints = Math.max(ticks, opts.maxPrints ?? TICK_BAR_MAX_PRINTS);
  }

  /** Fold one print. O(1) when it is not older than the newest held print. */
  ingest(p: TickPrint): TickIngest {
    if (this.keys.has(p.key)) return "dup";
    this.keys.add(p.key);
    if (!p.heardLive) this.backfilled++;
    const n = this.prints.length;
    if (n === 0 || !before(p, this.prints[n - 1])) {
      this.prints.push(p);
      if (this.dirtyFrom == null) this.foldTail(n);
      this.shed();
      return "append";
    }
    // Older than the newest held print: binary-search its place (after equals).
    let lo = 0, hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (before(p, this.prints[mid])) hi = mid; else lo = mid + 1;
    }
    this.prints.splice(lo, 0, p);
    const bar = Math.floor(lo / this.ticks);
    this.dirtyFrom = this.dirtyFrom == null ? bar : Math.min(this.dirtyFrom, bar);
    this.resetPending = true;
    this.shed();
    return "insert";
  }

  /**
   * Fold a BACKFILL batch (any order, e.g. newest-first REST pages) in one
   * merge — O(held + batch), never a splice per print. Returns prints added.
   */
  ingestBatch(batch: readonly TickPrint[]): number {
    const fresh: TickPrint[] = [];
    for (const p of batch) {
      if (this.keys.has(p.key)) continue;
      this.keys.add(p.key);
      if (!p.heardLive) this.backfilled++;
        fresh.push(p);
    }
    if (!fresh.length) return 0;
    fresh.sort(compare); // stable: same ms, no seq keeps arrival order
    const held = this.prints;
    const n = held.length;
    if (n === 0 || !before(fresh[0], held[n - 1])) {
      // All newer than what is held: plain appends.
      for (const p of fresh) {
        held.push(p);
        if (this.dirtyFrom == null) this.foldTail(held.length - 1);
      }
      this.shed();
      return fresh.length;
    }
    // First held print the batch's oldest lands before (after equals).
    let lo = 0, hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (before(fresh[0], held[mid])) hi = mid; else lo = mid + 1;
    }
    const merged = held.slice(0, lo);
    let i = lo, j = 0;
    while (i < n && j < fresh.length) merged.push(before(fresh[j], held[i]) ? fresh[j++] : held[i++]);
    while (i < n) merged.push(held[i++]);
    while (j < fresh.length) merged.push(fresh[j++]);
    this.prints = merged;
    const bar = Math.floor(lo / this.ticks);
    this.dirtyFrom = this.dirtyFrom == null ? bar : Math.min(this.dirtyFrom, bar);
    this.resetPending = true;
    this.shed();
    return fresh.length;
  }

  /** The bars, oldest first. Rebuilds lazily (once) after older prints arrived. */
  bars(): readonly TickBar[] {
    if (this.dirtyFrom != null) this.rebuildFrom(this.dirtyFrom);
    return this.barList;
  }

  /** What changed since the last drain; resets the change record. */
  drain(): TickBarChange {
    this.bars();
    const out: TickBarChange = this.resetPending ? { kind: "reset" }
      : this.changedFrom != null ? { kind: "tail", fromIndex: this.changedFrom }
      : { kind: "none" };
    this.resetPending = false;
    this.changedFrom = null;
    return out;
  }

  /** The chart time of the bar holding a held print at this index (for bucketing). */
  barTimeAtPrintIndex(i: number): number | null {
    const bars = this.bars();
    const b = bars[Math.floor(i / this.ticks)];
    return b ? b.time : null;
  }

  /** Visit every held print with the chart time of its bar, oldest first. */
  forEachPrint(cb: (p: TickPrint, barTime: number) => void): void {
    const bars = this.bars();
    for (let i = 0; i < this.prints.length; i++) cb(this.prints[i], bars[Math.floor(i / this.ticks)].time);
  }

  /** Chart time of the newest (forming) bar, or null when nothing is held. */
  formingBarTime(): number | null {
    const bars = this.bars();
    return bars.length ? bars[bars.length - 1].time : null;
  }

  /** Prints still needed to close the forming bar (N when none is forming). */
  printsToClose(): number {
    const bars = this.bars();
    const last = bars[bars.length - 1];
    return last && last.prints < this.ticks ? this.ticks - last.prints : this.ticks;
  }

  coverage(): TickBarCoverage {
    const n = this.prints.length;
    return {
      fromMs: n ? this.prints[0].timeMs : null,
      toMs: n ? this.prints[n - 1].timeMs : null,
      prints: n,
      bars: this.bars().length,
      backfilledPrints: this.backfilled,
    };
  }

  /* ── internals ─────────────────────────────────────────────────────────── */

  /** Fold the print at index i (the newest) into the bar list. */
  private foldTail(i: number): void {
    const p = this.prints[i];
    const barIdx = Math.floor(i / this.ticks);
    const list = this.barList;
    if (barIdx < list.length) {
      const b = list[barIdx];
      list[barIdx] = {
        ...b,
        high: Math.max(b.high, p.price),
        low: Math.min(b.low, p.price),
        close: p.price,
        volume: b.volume + p.size,
        prints: b.prints + 1,
        lastPrintMs: p.timeMs,
        heardLive: b.heardLive && p.heardLive,
      };
    } else {
      list.push(this.openBar(i, list.length ? list[list.length - 1].time : null));
    }
    this.changedFrom = this.changedFrom == null ? barIdx : Math.min(this.changedFrom, barIdx);
  }

  /** A one-print bar opened by the print at index i. */
  private openBar(i: number, prevTime: number | null): TickBar {
    const p = this.prints[i];
    let ord = 0;
    for (let j = i - 1; j >= 0 && this.prints[j].timeMs === p.timeMs; j--) ord++;
    const own = p.timeMs / 1000;
    const time = prevTime != null && own <= prevTime ? Math.round(prevTime * 1000 + 1) / 1000 : own;
    return {
      time,
      open: p.price, high: p.price, low: p.price, close: p.price,
      volume: p.size,
      prints: 1,
      firstPrintMs: p.timeMs,
      lastPrintMs: p.timeMs,
      firstSeq: p.seq ?? ord,
      heardLive: p.heardLive,
    };
  }

  private rebuildFrom(barIdx: number): void {
    this.barList.length = Math.min(this.barList.length, barIdx);
    const start = this.barList.length * this.ticks;
    for (let i = start; i < this.prints.length; i++) {
      if (i % this.ticks === 0) {
        this.barList.push(this.openBar(i, this.barList.length ? this.barList[this.barList.length - 1].time : null));
      } else {
        this.foldTail(i);
      }
    }
    this.dirtyFrom = null;
    this.changedFrom = null; // a rebuild is reported as a reset, not a tail
  }

  /** Shed the oldest prints in whole bars once over the bound. */
  private shed(): void {
    const over = this.prints.length - this.maxPrints;
    if (over <= 0) return;
    const bars = Math.ceil(over / this.ticks);
    const drop = bars * this.ticks;
    const gone = this.prints.splice(0, drop);
    for (const g of gone) {
      this.keys.delete(g.key);
      if (!g.heardLive) this.backfilled--;
    }
    if (this.dirtyFrom == null) this.barList.splice(0, bars);
    else this.dirtyFrom = 0;
    this.resetPending = true;
  }
}

/* ── IDENTITY ────────────────────────────────────────────────────────────── */

/**
 * The CanonicalBar identity of a tick bar, so zones / inspect / object births
 * can name the exact bar. Provenance LIVE_STREAM only when every print was
 * heard live; a bar holding any backfilled print is REST_BACKFILL. Fidelity is
 * INDICATIVE — a tape is observation, never an execution price.
 */
export function tickBarIdentity(bar: TickBar, ctx: {
  readonly source: string;
  readonly symbolId: string;
  readonly ticks: number;
  readonly receivedAt: number;
  readonly continuousVenue: boolean;
}): CanonicalBarIdentity | null {
  const barId = mintTickBarId({ source: ctx.source, symbolId: ctx.symbolId, ticks: ctx.ticks, firstPrintMs: bar.firstPrintMs, firstSeq: bar.firstSeq });
  if (!barId) return null;
  return {
    barId,
    symbolId: ctx.symbolId,
    sessionId: ctx.continuousVenue ? SESSION_CONTINUOUS : SESSION_UNKNOWN,
    timeframe: `${ctx.ticks}T`,
    asOf: bar.firstPrintMs,
    receivedAt: ctx.receivedAt,
    fidelity: MARKET_FIDELITIES.INDICATIVE,
    source: ctx.source,
    provenance: bar.heardLive ? BAR_PROVENANCES.LIVE_STREAM : BAR_PROVENANCES.REST_BACKFILL,
    truthEpoch: 0,
  };
}

/* ── WORDS ON THE GLASS ──────────────────────────────────────────────────── */

/** "TICK BARS · from 13:02:11 · 41,250 prints" — the coverage the chart states. */
export function tickBarCoverageLabel(cov: TickBarCoverage, fmtTime: (ms: number) => string): string {
  if (cov.fromMs == null || cov.prints === 0) return "TICK BARS · waiting for the first print";
  return `TICK BARS · from ${fmtTime(cov.fromMs)} · ${cov.prints.toLocaleString("en-US")} prints`;
}

/**
 * Why this symbol cannot have tick bars, in words — or null when it can.
 *
 *   spot FX                         no trades exist to count
 *   no tape / unreviewed tape       no per-trade source on this path
 *   a tape with no stamped prints   a delayed REST / quote feed, not prints
 */
export function tickBarRefusal(input: {
  readonly assetClass: string;
  readonly tapeSource: string | null;
  /** Does the reviewed capability registry certify this tape as executed trades? */
  readonly perTradeTape: boolean;
}): string | null {
  if (input.assetClass === "forex") return "No trades — tick bars need prints. Spot FX has quotes, not a tape.";
  if (!input.tapeSource || input.tapeSource === "unavailable") return "No per-trade tape on this symbol — tick bars need prints.";
  if (!input.perTradeTape) return "Delayed REST feed here, not a live per-trade tape — tick bars need prints.";
  return null;
}

/**
 * A tick bar closes on PRINTS, not on the clock. The chart's countdown reads
 * this instead of a minute clock on a tick timeframe ("312T left").
 */
export function tickBarCountdown(printsLeft: number, ticks: number): BarCountdown {
  const left = Math.max(0, Math.min(ticks, Math.round(printsLeft)));
  return {
    glyph: `${left}T left`,
    kind: "LIVE_BAR",
    title: `${left} of ${ticks} prints still to trade before this bar closes. Tick bars close on prints, not on the clock.`,
    spoken: `${left} prints until this ${ticks}-trade bar closes`,
    closing: false,
  };
}
