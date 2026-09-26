import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import * as path from "node:path";

import type { LegacyOhlcvTuple } from "./canonicalBar";
import { ingestExchangeCandles, toLegacySecondsTuple } from "./exchangeCandleIngress";
import { mergeVenueTail, VENUE_TAIL_INTERVALS } from "./venueTailFill";
import { selectDataGaps } from "./viewModels/selectDataGaps";

/**
 * The serving shape, 2026-09-26 BTC-USD 1m: the history page's newest bar is
 * 09:28 while the clock reads 09:32:21 — 09:29, 09:30, 09:31 closed and absent,
 * 09:32 forming (the tape's).
 */
const M = 60;
const T0 = 1_790_414_880; // 09:28:00 UTC, the stale snapshot's newest
const NOW = T0 + 4 * M + 21; // 09:32:21
const bar = (time: number, over: Partial<LegacyOhlcvTuple> = {}): LegacyOhlcvTuple => ({
  time, open: 84_000, high: 84_020, low: 83_990, close: 84_010, volume: 1, ...over,
});
const history = (n = 20) => Array.from({ length: n }, (_, i) => bar(T0 - (n - 1 - i) * M));
const gaps = (bars: readonly LegacyOhlcvTuple[]) => selectDataGaps({ bars, continuous: true });
/** The chart's view at the live edge: history + the tape's forming bar. */
const withForming = (bars: readonly LegacyOhlcvTuple[]) => [...bars, bar(T0 + 4 * M, { volume: 0.2 })];

describe("mergeVenueTail — closed live-edge minutes from the SAME venue", () => {
  it("reproduces the serving hole when no tail is read (NO BAR · 3 intervals)", () => {
    const r = mergeVenueTail({ history: history(), tail: null, intervalSec: M, nowSec: NOW });
    expect(r.filled).toBe(0);
    const g = gaps(withForming(r.bars));
    expect(g.gaps).toHaveLength(1);
    expect(g.gaps[0].label).toBe("NO BAR · 3 intervals");
  });

  it("closes the gap when the venue's tail holds the closed minutes", () => {
    const tail = [T0 - M, T0, T0 + M, T0 + 2 * M, T0 + 3 * M].map(t => bar(t, { volume: 2 }));
    const r = mergeVenueTail({ history: history(), tail, intervalSec: M, nowSec: NOW });
    expect(r.filled).toBe(3);
    expect(r.refreshed).toBe(2);
    expect(gaps(withForming(r.bars)).gaps).toHaveLength(0);
  });

  it("keeps the gap — and its words — for a minute the venue has no candle for", () => {
    // 09:30 truly had no prints on the venue: it stays absent, never invented.
    const tail = [T0 + M, T0 + 3 * M].map(t => bar(t));
    const r = mergeVenueTail({ history: history(), tail, intervalSec: M, nowSec: NOW });
    expect(r.filled).toBe(2);
    expect(r.bars.some(b => b.time === T0 + 2 * M)).toBe(false);
    const g = gaps(withForming(r.bars));
    expect(g.gaps).toHaveLength(1);
    expect(g.gaps[0]).toMatchObject({ fromTime: T0 + M, toTime: T0 + 3 * M, emptyIntervals: 1, label: "NO BAR · 1 interval" });
  });

  it("never takes the forming interval — that bar is the tape's", () => {
    const tail = [T0 + 3 * M, T0 + 4 * M].map(t => bar(t, { volume: 5 }));
    const r = mergeVenueTail({ history: history(), tail, intervalSec: M, nowSec: NOW });
    expect(r.formingStart).toBe(T0 + 4 * M);
    expect(r.bars.some(b => b.time >= r.formingStart)).toBe(false);
    expect(r.filled).toBe(1);
  });

  it("one bar per instant: overlap is REPLACED by the later venue reading, volume never summed", () => {
    // The stale snapshot caught 09:28 while it was still open (volume 0.4);
    // the tail reads the closed minute (volume 1.1).
    const h = [...history().slice(0, 19), bar(T0, { volume: 0.4, close: 84_001 })];
    const tail = [bar(T0, { volume: 1.1, close: 84_005 }), bar(T0 + M, { volume: 0.7 })];
    const r = mergeVenueTail({ history: h, tail, intervalSec: M, nowSec: NOW });
    const times = r.bars.map(b => b.time);
    expect(new Set(times).size).toBe(times.length);
    expect(times).toEqual([...times].sort((a, z) => a - z));
    const at = r.bars.find(b => b.time === T0)!;
    expect(at.volume).toBe(1.1);
    expect(at.close).toBe(84_005);
    const vol = r.bars.reduce((s, b) => s + b.volume, 0);
    expect(vol).toBeCloseTo(19 * 1 + 1.1 + 0.7, 9);
  });

  it("duplicate tail instants keep the first; a partial tail bar never replaces history", () => {
    const tail = [
      bar(T0 + M, { volume: 3 }),
      bar(T0 + M, { volume: 9 }),
      bar(T0, { close: Number.NaN }),
    ];
    const r = mergeVenueTail({ history: history(), tail, intervalSec: M, nowSec: NOW });
    expect(r.bars.filter(b => b.time === T0 + M)).toHaveLength(1);
    expect(r.bars.find(b => b.time === T0 + M)!.volume).toBe(3);
    expect(Number.isFinite(r.bars.find(b => b.time === T0)!.close)).toBe(true);
    expect(r.refreshed).toBe(0);
  });

  it("merges through the one canonical ingress without a refusal (no duplicate instants reach it)", () => {
    const tail = [T0, T0 + M, T0 + 2 * M, T0 + 3 * M].map(t => bar(t, { volume: 2 }));
    const r = mergeVenueTail({ history: history(), tail, intervalSec: M, nowSec: NOW });
    const ingress = ingestExchangeCandles({ exchange: "coinbase", coin: "BTC", timeframe: "1m", tuples: r.bars, receivedAt: NOW * 1000 });
    expect(ingress.refusals).toHaveLength(0);
    expect(ingress.bars.map(toLegacySecondsTuple).map(b => b.time)).toEqual(r.bars.map(b => b.time));
  });

  it("hands history's own bad rows to the ingress to refuse and count, as before", () => {
    const h = [...history(), bar(Number.NaN)];
    const r = mergeVenueTail({ history: h, tail: [], intervalSec: M, nowSec: NOW });
    const ingress = ingestExchangeCandles({ exchange: "coinbase", coin: "BTC", timeframe: "1m", tuples: r.bars, receivedAt: NOW * 1000 });
    expect(ingress.refusals).toHaveLength(1);
  });

  it("the tail read is bounded and windowed on the same venue (route wiring)", () => {
    expect(VENUE_TAIL_INTERVALS).toBeGreaterThan(0);
    expect(VENUE_TAIL_INTERVALS).toBeLessThanOrEqual(300); // one Coinbase page
    const route = readFileSync(path.resolve(__dirname, "..", "..", "app", "api", "exchange", "route.ts"), "utf8");
    expect(route).toMatch(/candles\?granularity=\$\{sec\}&start=/);
    expect(route).toMatch(/mergeVenueTail\(/);
    expect(route).toMatch(/tailFilled: page\.tailFilled/);
  });
});
