import { describe, expect, it } from "vitest";
import { applyTickToLiveBar } from "./liveBarPolicy";

describe("forward-only live bar policy", () => {
  it("creates the containing interval bar", () => {
    const result = applyTickToLiveBar(null, null, { price: 100, size: 2, time: 61_500 }, 60);
    expect(result).toEqual({
      status: "ACCEPTED",
      bar: { time: 60, open: 100, high: 100, low: 100, close: 100, volume: 2 },
      lastEventAt: 61_500,
    });
  });

  it("updates a current bar with a later event", () => {
    const current = { time: 60, open: 100, high: 100, low: 100, close: 100, volume: 2 };
    const result = applyTickToLiveBar(current, 61_500, { price: 103, size: 1, time: 62_000 }, 60);
    expect(result.status).toBe("ACCEPTED");
    expect(result.bar).toMatchObject({ time: 60, high: 103, low: 100, close: 103, volume: 3 });
  });

  it("opens a new bar only when time moves forward", () => {
    const current = { time: 60, open: 100, high: 103, low: 100, close: 103, volume: 3 };
    const result = applyTickToLiveBar(current, 62_000, { price: 104, size: 1, time: 120_100 }, 60);
    expect(result).toMatchObject({
      status: "ACCEPTED",
      bar: { time: 120, open: 104, high: 104, low: 104, close: 104, volume: 1 },
    });
  });

  it("does not let an older bar move the chart backward", () => {
    const current = { time: 120, open: 104, high: 104, low: 104, close: 104, volume: 1 };
    const result = applyTickToLiveBar(current, 120_100, { price: 99, size: 10, time: 61_900 }, 60);
    expect(result).toEqual({ status: "LATE_EVENT_IGNORED", bar: current, lastEventAt: 120_100 });
  });

  it("does not let an out-of-order event overwrite a bar close", () => {
    const current = { time: 120, open: 104, high: 106, low: 103, close: 106, volume: 4 };
    const result = applyTickToLiveBar(current, 125_000, { price: 103, size: 1, time: 124_000 }, 60);
    expect(result).toEqual({ status: "LATE_EVENT_IGNORED", bar: current, lastEventAt: 125_000 });
  });
});

import { shouldFoldChartLiveBar } from "./liveBarPolicy";

describe("shouldFoldChartLiveBar", () => {
  it("folds a non-advancing update into the last candle", () => {
    expect(shouldFoldChartLiveBar(1_000, 1_000, false)).toBe(true);
    expect(shouldFoldChartLiveBar(1_000, 990, false)).toBe(true);
  });
  it("folds an out-of-hours update on a regular-hours chart", () => {
    expect(shouldFoldChartLiveBar(1_000, 1_060, true)).toBe(true);
  });
  it("a later update after a gap keeps its own candle — gaps are not folded", () => {
    expect(shouldFoldChartLiveBar(1_000, 1_060, false)).toBe(false);
    expect(shouldFoldChartLiveBar(1_000, 1_000 + 3_600, false)).toBe(false);
  });
});

// ── applyTickToClock (2026-09-26) — a print on an id with no clock builds no bar.
import { applyTickToClock } from "./liveBarPolicy";

describe("applyTickToClock — fail closed when the registry has no clock", () => {
  const cur = { time: 60, open: 100, high: 100, low: 100, close: 100, volume: 2 };

  it("with a clock it IS applyTickToLiveBar, byte for byte", () => {
    for (const [current, last, tick, sec] of [
      [null, null, { price: 100, size: 2, time: 61_500 }, 60],
      [cur, 61_500, { price: 101, size: 1, time: 62_000 }, 60],
      [cur, 61_500, { price: 102, size: 1, time: 125_000 }, 60],
      [cur, 61_500, { price: 99, size: 1, time: 61_000 }, 60],
    ] as const) {
      expect(applyTickToClock(current, last, tick, sec)).toEqual(applyTickToLiveBar(current, last, tick, sec));
    }
  });

  it("× THE SIXTY-SECOND GUESS: with no clock, no bar is built — not a one-minute one", () => {
    const r = applyTickToClock(null, null, { price: 100, size: 2, time: 61_500 }, null);
    expect(r).toEqual({ status: "ACCEPTED", bar: null, lastEventAt: 61_500 });
  });

  it("still forward-only without a clock: a late print cannot rewind the price", () => {
    const r = applyTickToClock(null, 61_500, { price: 90, size: 1, time: 61_000 }, null);
    expect(r).toEqual({ status: "LATE_EVENT_IGNORED", bar: null, lastEventAt: 61_500 });
  });

  it("still refuses an invalid print without a clock", () => {
    expect(() => applyTickToClock(null, null, { price: 0, size: 1, time: 61_000 }, null)).toThrow();
    expect(() => applyTickToClock(null, null, { price: 1, size: 1, time: Number.NaN }, null)).toThrow();
  });
});
