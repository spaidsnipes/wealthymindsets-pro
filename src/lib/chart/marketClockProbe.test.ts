import { beforeEach, describe, expect, it } from "vitest";
import { marketClockReceipt, marketClockStats, noteArrival, noteFlush, notePaint, noteSeries, resetMarketClock } from "./marketClockProbe";

describe("market clock → paint probe", () => {
  beforeEach(() => resetMarketClock());

  it("measures each leg from the OLDEST unfolded print, and folds a burst into one snapshot", () => {
    noteArrival(100); noteArrival(104); noteArrival(109);
    noteFlush(116, 3);
    noteSeries(118);
    notePaint(130);
    const s = marketClockStats();
    expect(s.eventToState.p50).toBe(16);
    expect(s.stateToSeries.p50).toBe(2);
    expect(s.seriesToPaint.p50).toBe(12);
    expect(s.coalesced.max).toBe(3);
  });

  it("a paint counts a candle update once; backlog is what is still unfolded at paint time", () => {
    noteArrival(0); noteFlush(5, 1); noteSeries(6);
    notePaint(10); notePaint(40);
    expect(marketClockStats().seriesToPaint.n).toBe(1);
    noteArrival(41); noteArrival(42);
    notePaint(43);
    expect(marketClockStats().backlogMax).toBe(2);
    noteFlush(44, 2);
    notePaint(50);
    expect(marketClockReceipt()).toContain("backlog max 2");
  });

  it("reset starts a fresh measurement (symbol / timeframe change)", () => {
    noteArrival(0); noteFlush(9, 1);
    resetMarketClock();
    expect(marketClockStats().eventToState.n).toBe(0);
    expect(marketClockReceipt()).toContain("evt→state —/—");
  });
});
