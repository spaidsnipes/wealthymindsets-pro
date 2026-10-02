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

describe("liveBarStartSec — calendar-true weeks and months", () => {
  it("a week opens Monday 00:00 UTC, never on the epoch's Thursday", async () => {
    const { liveBarStartSec } = await import("./liveBarPolicy");
    // Thu 2026-10-01 06:00Z belongs to the week of Mon 2026-09-28 (tastytrade's weekly candle).
    const thu = Date.UTC(2026, 9, 1, 6) / 1000;
    expect(liveBarStartSec(thu, 7 * 86_400)).toBe(Date.UTC(2026, 8, 28) / 1000);
    // Sunday evening still belongs to the week that started the Monday before.
    expect(liveBarStartSec(Date.UTC(2026, 9, 4, 23) / 1000, 7 * 86_400)).toBe(Date.UTC(2026, 8, 28) / 1000);
    expect(liveBarStartSec(Date.UTC(2026, 9, 5, 0) / 1000, 7 * 86_400)).toBe(Date.UTC(2026, 9, 5) / 1000);
  });

  it("a month opens on the 1st; clocks that divide the day still floor", async () => {
    const { liveBarStartSec } = await import("./liveBarPolicy");
    expect(liveBarStartSec(Date.UTC(2026, 9, 17, 12) / 1000, 30 * 86_400)).toBe(Date.UTC(2026, 9, 1) / 1000);
    expect(liveBarStartSec(Date.UTC(2026, 9, 1, 6, 7, 30) / 1000, 300)).toBe(Date.UTC(2026, 9, 1, 6, 5) / 1000);
    expect(liveBarStartSec(Date.UTC(2026, 9, 1, 6, 7, 30) / 1000, 86_400)).toBe(Date.UTC(2026, 9, 1) / 1000);
  });
});

import { liveBarIsStale } from "./liveBarPolicy";
describe("a stale live bar is dropped, not folded (TSLA premarket, 2026-10-02)", () => {
  it("earlier interval → stale; same interval or later → not", () => {
    const last = 1_790_928_960; // newest candle open (s)
    expect(liveBarIsStale(last, last - 4 * 3600, 60)).toBe(true);   // yesterday's close snapshot
    expect(liveBarIsStale(last, last - 60, 60)).toBe(true);         // the previous minute
    expect(liveBarIsStale(last, last - 30, 60)).toBe(false);        // provider stamp inside the interval
    expect(liveBarIsStale(last, last, 60)).toBe(false);
    expect(liveBarIsStale(last, last + 60, 60)).toBe(false);
  });
});
