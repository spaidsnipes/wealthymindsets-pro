/**
 * 15 s LIVE AGGREGATION — REPLAY FIXTURE TESTS.
 * Every print below is a HAND-WRITTEN FIXTURE (not market data). The test runs
 * the real hook-side policy (applyTickToLiveBar + noteClosedLiveBar) and the
 * real chart-side fold (foldClosedLiveBars + foldFormingBar) with flushes at
 * fixture-chosen moments, and compares the chart's bars with a reference
 * bucketing of the same prints.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import { applyTickToLiveBar } from "./liveBarPolicy";
import { foldClosedLiveBars, foldFormingBar, liveDespikeApplies, noteClosedLiveBar, CLOSED_LIVE_BARS_MAX } from "./liveBarFold";

type Bar = LegacyOhlcvTuple;
interface Print { t: number; p: number; s: number }
const SEC = 15;
const T0 = 1_760_100_000; // fixture epoch, a multiple of 15

/** Reference: bucket in-order prints (late ones dropped, as the hook does). */
function reference(prints: Print[], history: Bar[]): Bar[] {
  const out = history.map(b => ({ ...b }));
  let lastT = -Infinity;
  for (const pr of prints) {
    if (pr.t < lastT) continue;
    lastT = pr.t;
    const bt = Math.floor(pr.t / 1000 / SEC) * SEC;
    const last = out[out.length - 1];
    if (last && last.time === bt) { last.high = Math.max(last.high, pr.p); last.low = Math.min(last.low, pr.p); last.close = pr.p; }
    else out.push({ time: bt, open: pr.p, high: pr.p, low: pr.p, close: pr.p, volume: 0 });
  }
  return out;
}

/** Hook + chart, flushing only at the given print indexes (and at the end). */
function replay(prints: Print[], history: Bar[], flushAfter: Set<number>, withClosed = true): Bar[] {
  let cur: Bar | null = null; let lastEv: number | null = null;
  const ring: Bar[] = [];
  let bars: Bar[] = history.map(b => ({ ...b }));
  const flush = () => {
    if (!cur) return;
    const closed = withClosed ? ring.slice() : [];
    bars = foldClosedLiveBars(bars, closed).bars;
    const last = bars[bars.length - 1];
    const live = cur;
    if (last && live.time <= last.time) bars = [...bars.slice(0, -1), foldFormingBar(last, live, live.close)];
    else bars = [...bars, { ...live }];
  };
  prints.forEach((pr, i) => {
    const u = applyTickToLiveBar(cur, lastEv, { price: pr.p, size: pr.s, time: pr.t }, SEC);
    if (u.status === "ACCEPTED") { noteClosedLiveBar(ring, cur, u.bar); cur = u.bar; lastEv = u.lastEventAt; }
    if (flushAfter.has(i)) flush();
  });
  flush();
  return bars;
}
const ohlc = (bs: Bar[]) => bs.map(b => [b.time, b.open, b.high, b.low, b.close]);

// FIXTURE: 3 buckets; bucket 0 has a high (104.5) and low (97) between flushes.
const PRINTS: Print[] = [
  { t: (T0 + 1) * 1000, p: 100, s: 1 },
  { t: (T0 + 3) * 1000, p: 104.5, s: 1 }, // high, coalesced into the next flush
  { t: (T0 + 4) * 1000, p: 97, s: 1 },     // low, coalesced
  { t: (T0 + 9) * 1000, p: 101, s: 1 },
  { t: (T0 + 14_999) * 1, p: 102, s: 1 }, // ms timestamps: 14.999 s → still bucket 0? (fixture: T0*1000+14999)
  { t: (T0 + 15) * 1000, p: 103, s: 1 },  // exactly the boundary → bucket 1
  { t: (T0 + 20) * 1000, p: 104, s: 1 },
  { t: (T0 + 18) * 1000, p: 999, s: 1 },  // LATE print → never moves the close
  { t: (T0 + 31) * 1000, p: 105, s: 1 },
  { t: (T0 + 44) * 1000, p: 99, s: 1 },
];
PRINTS[4] = { t: T0 * 1000 + 14_999, p: 102, s: 1 };
const HISTORY: Bar[] = [{ time: T0 - SEC, open: 98, high: 99, low: 97, close: 98.5, volume: 3 }];

describe("15 s live aggregation — replay fixtures", () => {
  it("a flush that coalesces several prints keeps the bucket's high and low (wick between flushes)", () => {
    const got = replay(PRINTS, HISTORY, new Set([0, 3, 5, 6, 8]));
    expect(ohlc(got)).toEqual(ohlc(reference(PRINTS, HISTORY)));
    expect(got[1]).toMatchObject({ time: T0, open: 100, high: 104.5, low: 97, close: 102 });
  });

  it("bucket boundaries: 14.999 s stays in the bar, 15.000 s opens the next", () => {
    const got = replay(PRINTS, HISTORY, new Set(PRINTS.map((_, i) => i)));
    expect(got.map(b => b.time)).toEqual([T0 - SEC, T0, T0 + 15, T0 + 30]);
    expect(got[1].close).toBe(102);
    expect(got[2].open).toBe(103);
  });

  it("a late print never rewinds the close", () => {
    const got = replay(PRINTS, HISTORY, new Set(PRINTS.map((_, i) => i)));
    expect(got[2].close).toBe(104);
    expect(got[2].high).toBe(104);
  });

  it("HIDDEN TAB: no flush for three buckets — every closed bar is still drawn, in order", () => {
    const got = replay(PRINTS, HISTORY, new Set([0]));
    expect(ohlc(got)).toEqual(ohlc(reference(PRINTS, HISTORY)));
    // Without the closed-bar list the chart lost the middle buckets entirely.
    const lossy = replay(PRINTS, HISTORY, new Set([0]), false);
    expect(lossy.length).toBeLessThan(got.length);
  });

  it("a bucket that rolled between two flushes keeps its final prints", () => {
    // flush at print 3 (bucket 0 high/low seen) then not again until bucket 2.
    const got = replay(PRINTS, HISTORY, new Set([3]));
    expect(got[1].close).toBe(102); // the 14.999 s print reached the closed bar
  });

  it("the same closed list folds to the same bars however often it arrives (idempotent; reconnect replay)", () => {
    const closed: Bar[] = [{ time: T0, open: 100, high: 110, low: 95, close: 102, volume: 5 }, { time: T0 + 15, open: 103, high: 104, low: 103, close: 104, volume: 2 }];
    const once = foldClosedLiveBars(HISTORY, closed).bars;
    const twice = foldClosedLiveBars(once, closed);
    expect(twice.updates).toEqual([]);
    expect(twice.bars).toEqual(once);
    expect(once.map(b => b.time)).toEqual([T0 - SEC, T0, T0 + 15]);
  });

  it("history/live handoff: a closed bar for the history's own last bucket widens it, never reopens it", () => {
    const hist: Bar[] = [{ time: T0, open: 100, high: 101, low: 99, close: 100.5, volume: 10 }];
    const r = foldClosedLiveBars(hist, [{ time: T0, open: 100.4, high: 103, low: 100.4, close: 102, volume: 4 }]);
    expect(r.bars).toEqual([{ time: T0, open: 100, high: 103, low: 99, close: 102, volume: 10 }]);
  });

  it("a closed bar >8% from the last close is refused (the live guard), and stale ones are skipped", () => {
    const r = foldClosedLiveBars(HISTORY, [{ time: T0 - 2 * SEC, open: 1, high: 1, low: 1, close: 1, volume: 1 }, { time: T0, open: 150, high: 150, low: 150, close: 150, volume: 1 }]);
    expect(r.updates).toEqual([]);
  });

  it("forming fold from a provider bar stamped ahead (different bucket) trusts only the price", () => {
    const last: Bar = { time: T0 + 15, open: 100, high: 101, low: 99, close: 100, volume: 5 };
    const live: Bar = { time: T0, open: 90, high: 120, low: 80, close: 100.2, volume: 1 };
    expect(foldFormingBar(last, live, 100.2)).toMatchObject({ high: 101, low: 99, close: 100.2 });
  });

  it("the closed ring is bounded and the live de-spike is off for sub-minute clocks", () => {
    const ring: Bar[] = [];
    for (let i = 0; i < CLOSED_LIVE_BARS_MAX + 10; i++) noteClosedLiveBar(ring, { time: i, open: 1, high: 1, low: 1, close: 1, volume: 0 }, { time: i + 1, open: 1, high: 1, low: 1, close: 1, volume: 0 });
    expect(ring.length).toBe(CLOSED_LIVE_BARS_MAX);
    expect(liveDespikeApplies(5)).toBe(false);
    expect(liveDespikeApplies(15)).toBe(false);
    expect(liveDespikeApplies(60)).toBe(true);
  });

  it("MainChart and the hook use the fold (wiring)", () => {
    const mc = readFileSync("src/components/chart/MainChart.tsx", "utf8");
    expect(mc.length).toBeGreaterThan(100000);
    expect(mc).toContain("foldClosedLiveBars(prevBars, closedLiveBars");
    expect(mc).toContain("bar = foldFormingBar(lastBar, liveBar, price);");
    expect(mc).toContain("if (liveDespikeApplies(intervalSec)) {");
    const hook = readFileSync("src/hooks/useWebSocket.ts", "utf8");
    expect(hook.length).toBeGreaterThan(10000);
    expect(hook.match(/noteClosedLiveBar\(closedBarsRef\.current, barRef\.current, barUpdate\.bar\)/g)?.length).toBe(2);
    // Unsigned observations publish once per frame, never setState per print.
    const obs = hook.slice(hook.indexOf("const processUnsignedObservation"), hook.indexOf("/* ── Mount / symbol change"));
    expect(obs.length).toBeGreaterThan(500);
    expect(obs).toContain("obsRafRef.current = requestAnimationFrame(");
    expect(obs.indexOf("setState(")).toBeGreaterThan(obs.indexOf("requestAnimationFrame("));
    // Caught-up closed bars carry their volume; the fold receipt is debug-only.
    expect(mc).toContain("if (volReal) for (const u of caught.updates) {");
    expect(mc).toContain("if (foldDebugRef.current && canvasRef.current) {");
    // ONE VENUE IN THE BAR: Coinbase speaking closes the Binance.US fallback and
    // the fallback's ticks are dropped while Coinbase is speaking (serving
    // c4d4d4c: Binance mids at 83039.6x painted into Coinbase 15 s bars).
    expect(hook).toContain("(tick, isReal) => { if (Date.now() - coinbaseHeardAt < 15_000) return; processTick(tick, isReal); },");
    expect(hook).toContain("if (cryptoFallback && !fallbackClosed) {");
    expect(hook).toContain("cleanupFns.current.push(closeFallback);");
    // Once a print is heard, quotes/mids no longer build the bar.
    expect(hook).toContain("if (tick.trade === true) tradeHeardRef.current = true;\n    else if (tradeHeardRef.current) return;");
    // The parent hears the forming bar at most every LIVE_EMIT_MS; a new bar at once.
    expect(mc).toContain("const LIVE_EMIT_MS = 250;");
    expect(mc).toContain("if (grew || nowMs - liveEmitAtRef.current >= LIVE_EMIT_MS) emit();");
  });
});
