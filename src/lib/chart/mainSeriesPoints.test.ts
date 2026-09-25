/**
 * The price series' data has ONE owner, shared by MainChart's bootstrap and the
 * bar-replay camera. These pin the shapes the bootstrap used to build inline,
 * and the property replay depends on: computed over the bars it is given, so a
 * replay window is never shaded by bars that have not happened yet.
 */
import { describe, expect, it } from "vitest";

import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import {
  baselineBasePrice,
  mainSeriesPoints,
  toHeikinAshi,
  volumeSeriesPoints,
} from "./mainSeriesPoints";

const INK = { up: "#UP0000", down: "#DN0000", base: 100, intervalSec: 300 };
const T0 = 1_758_204_000;

function series(n: number, volumeAt: (i: number) => number = i => 1_000 + i * 10): LegacyOhlcvTuple[] {
  return Array.from({ length: n }, (_, i) => {
    const open = 100 + Math.sin(i / 2) * 2;
    const close = open + (i % 3 === 0 ? -0.4 : 0.5);
    return {
      time: T0 + i * INK.intervalSec,
      open,
      high: Math.max(open, close) + 0.3,
      low: Math.min(open, close) - 0.3,
      close,
      volume: volumeAt(i),
    };
  });
}
const frozen = (bs: LegacyOhlcvTuple[]) => Object.freeze(bs.map(b => Object.freeze({ ...b })));

describe("mainSeriesPoints — one owner for the price series' data", () => {
  it("line / area / baseline take the close as a value", () => {
    const bs = series(5);
    for (const t of ["line", "area", "baseline"]) {
      const pts = mainSeriesPoints(t, bs, INK);
      expect(pts).toEqual(bs.map(b => ({ time: b.time, value: b.close })));
    }
  });

  it("OHLC types hand LWC COPIES, never the (possibly frozen) bars themselves", () => {
    const bs = frozen(series(4));
    for (const t of ["candles", "bars", "hlc-bars", "hollow", "orderflow-candles"]) {
      const pts = mainSeriesPoints(t, bs, INK);
      expect(pts).toEqual(bs.map(b => ({ ...b })));
      pts.forEach((p, i) => expect(p, `${t}: bar ${i} handed through by reference`).not.toBe(bs[i]));
      pts.forEach(p => expect(Object.isFrozen(p)).toBe(false));
    }
  });

  it("columns keep the column shape (open = low for bull, high for bear)", () => {
    const bs = series(6);
    const pts = mainSeriesPoints("columns", bs, INK);
    pts.forEach((p, i) => {
      const b = bs[i];
      expect(p).toEqual({ time: b.time, open: b.close > b.open ? b.low : b.high, high: b.high, low: b.low, close: b.close });
    });
  });

  it("Heikin Ashi is causal — a window's HA is the prefix of the whole chart's HA", () => {
    const bs = series(40);
    const whole = toHeikinAshi(bs);
    for (const k of [1, 2, 10, 39]) {
      expect(toHeikinAshi(bs.slice(0, k))).toEqual(whole.slice(0, k));
      expect(mainSeriesPoints("heikin-ashi", bs.slice(0, k), INK)).toEqual(whole.slice(0, k).map(b => ({ ...b })));
    }
  });

  it("volume candles are shaded over the bars GIVEN — a replay window never sees a future volume", () => {
    // The biggest volume of the day arrives at bar 30. A window ending at bar
    // 20 must shade bar 20 as the heaviest bar IT has seen, not as a fraction
    // of a spike that has not happened yet.
    const bs = series(40, i => (i === 30 ? 1_000_000 : 1_000 + i * 10));
    const window = bs.slice(0, 21);
    const inWindow = mainSeriesPoints("volume-candles", window, INK);
    const fromWhole = mainSeriesPoints("volume-candles", bs, INK).slice(0, 21);
    const alpha = (c: unknown) => String(c).slice(-2);
    expect(alpha(inWindow[20].color)).toBe("f2"); // (0.25 + 1.0 * 0.70) * 255 → 242
    expect(alpha(fromWhole[20].color)).not.toBe("f2");
  });

  it("VP candles take their POC threshold from the bars given", () => {
    const bs = series(10, i => i * 100);
    const pts = mainSeriesPoints("vp-candles", bs, INK);
    // top 20% by volume of 10 bars = bars 8 and 9 → gold border
    expect(pts.filter(p => p.borderColor === "#F0B429").map(p => p.time)).toEqual([bs[8].time, bs[9].time]);
  });

  it("Renko and range bars are built from the bars given, on evenly-spaced synthetic time", () => {
    const bs = series(60);
    for (const t of ["renko", "range-bars"]) {
      const pts = mainSeriesPoints(t, bs, INK);
      expect(pts.length, `${t} produced nothing`).toBeGreaterThan(0);
      pts.forEach((p, i) => expect(p.time).toBe(bs[0].time + i * INK.intervalSec));
    }
    expect(mainSeriesPoints("renko", [], INK)).toEqual([]);
    expect(mainSeriesPoints("range-bars", [], INK)).toEqual([]);
  });

  it("works on frozen input — the replay camera hands it the frozen ancestry", () => {
    const bs = frozen(series(30));
    for (const t of ["candles", "heikin-ashi", "line", "columns", "volume-candles", "vp-candles", "renko", "range-bars"]) {
      expect(() => mainSeriesPoints(t, bs, INK), t).not.toThrow();
    }
    expect(() => volumeSeriesPoints(bs, "u", "d")).not.toThrow();
  });
});

describe("volumeSeriesPoints / baselineBasePrice", () => {
  it("volume is raw bars coloured by direction", () => {
    const bs = series(6);
    expect(volumeSeriesPoints(bs, "U", "D")).toEqual(
      bs.map(b => ({ time: b.time, value: b.volume, color: b.close >= b.open ? "U" : "D" })),
    );
  });

  it("the baseline sits on the middle bar's close of the bars given, or the fallback", () => {
    const bs = series(9);
    expect(baselineBasePrice(bs, 7)).toBe(bs[4].close);
    expect(baselineBasePrice(bs.slice(0, 3), 7)).toBe(bs[1].close);
    expect(baselineBasePrice([], 7)).toBe(7);
  });
});
