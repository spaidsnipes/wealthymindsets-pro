import { describe, expect, it } from "vitest";
import { exhaustionEffortResult } from "./exhaustionEffortResult";
import { selectExhaustion } from "@/lib/marketData/viewModels/selectExhaustion";
import { selectAbsorptionAnatomy } from "@/lib/marketData/selectAbsorptionAnatomy";

describe("exhaustionEffortResult — FL-06 ④ for one mark", () => {
  it("UP push: RESULT is the follow bar with the highest high, and its shortfall below the extreme", () => {
    const r = exhaustionEffortResult({
      direction: "UP",
      price: 110,
      effortFirstHalf: 0.62,
      followBars: [
        { time: 4, reach: 107, beyond: false },
        { time: 5, reach: 109.5, beyond: false },
        { time: 6, reach: 108, beyond: false },
      ],
    });
    expect(r.effortFrac).toBe(0.62);
    expect(r.resultBar).toEqual({ time: 5, reach: 109.5 });
    expect(r.shortfall).toBeCloseTo(0.5, 10);
  });

  it("DOWN push: RESULT is the follow bar with the lowest low", () => {
    const r = exhaustionEffortResult({
      direction: "DOWN",
      price: 90,
      effortFirstHalf: 0.4,
      followBars: [
        { time: 4, reach: 91, beyond: false },
        { time: 5, reach: 93, beyond: false },
        { time: 6, reach: 90.25, beyond: false },
      ],
    });
    expect(r.resultBar).toEqual({ time: 6, reach: 90.25 });
    expect(r.shortfall).toBeCloseTo(0.25, 10);
  });

  it("no follow-through measured → no RESULT, never a guessed one", () => {
    const r = exhaustionEffortResult({ direction: "UP", price: 110, effortFirstHalf: 0.5, followBars: [] });
    expect(r.resultBar).toBeNull();
    expect(r.shortfall).toBeNull();
  });

  it("clamps the effort share to 0..1 and treats a non-finite share as none", () => {
    expect(exhaustionEffortResult({ direction: "UP", price: 1, effortFirstHalf: 1.7, followBars: [] }).effortFrac).toBe(1);
    expect(exhaustionEffortResult({ direction: "UP", price: 1, effortFirstHalf: Number.NaN, followBars: [] }).effortFrac).toBe(0);
  });

  it("reads a real owner mark end to end: the result bar is one of the mark's own follow-through bars", () => {
    // A fading, extended up push (effort falls bar by bar) and three bars
    // that never beat its high.
    const bars = [
      { time: 1, open: 100, high: 100.5, low: 99.5, close: 100, volume: 50 },
      { time: 2, open: 100, high: 102, low: 99.8, close: 101.8, volume: 1000 },
      { time: 3, open: 101.8, high: 104, low: 101.6, close: 103.8, volume: 900 },
      { time: 4, open: 103.8, high: 106, low: 103.6, close: 105.8, volume: 300 },
      { time: 5, open: 105.8, high: 108, low: 105.6, close: 107.8, volume: 200 },
      { time: 6, open: 107.8, high: 107.5, low: 106, close: 106.2, volume: 150 },
      { time: 7, open: 106.2, high: 107.9, low: 105.5, close: 106.6, volume: 150 },
      { time: 8, open: 106.6, high: 107, low: 105, close: 105.2, volume: 150 },
      { time: 9, open: 105.2, high: 105.6, low: 104.8, close: 105, volume: 150 },
    ].map(b => ({ ...b, askVol: null, bidVol: null }));
    const anatomy = selectAbsorptionAnatomy(bars, { windowBars: bars.length });
    const ex = selectExhaustion(anatomy);
    // The fixture is built to exhaust: effort 2nd÷1st ≈ 26%, extension ≈ 3.9×,
    // follow-through 0/3 (measured 2026-09-25 against the owner).
    expect(ex.marks).toHaveLength(1);
    const mark = ex.marks[0]!;
    const r = exhaustionEffortResult(mark);
    // Bar 7 reached 107.9, the furthest of the three; the push topped at 108.
    expect(r.resultBar).toEqual({ time: 7, reach: 107.9 });
    expect(mark.followThroughTimes).toContain(r.resultBar!.time);
    expect(r.shortfall).toBeCloseTo(0.1, 10);
    expect(r.effortFrac).toBeCloseTo(Math.min(1, mark.effortFirstHalf), 10);
  });
});
