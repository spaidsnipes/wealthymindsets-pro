import { describe, expect, it } from "vitest";

import selectRiskOnPrice, { planFromDrawing, RISK_REFUSALS } from "./selectRiskOnPrice";

const bar = (time: number, low: number, high: number) => ({ time, low, high });

describe("H-1001 · risk on price", () => {
  it("no position drawn → nothing bracketed, said plainly", () => {
    const v = selectRiskOnPrice([], [], 100);
    expect(v.drawn).toBe(false);
    expect(v.reason).toBe("NO_POSITION_DRAWN");
  });

  it("brackets the newest plan: risk per unit, % of entry, R", () => {
    const v = selectRiskOnPrice(
      [
        { side: "LONG", entry: 50, stop: 49, target: 52, placedAt: 1 },
        { side: "LONG", entry: 100, stop: 98, target: 105, placedAt: 10 },
      ],
      [], 101,
    );
    expect(v.reason).toBe("BRACKETED");
    expect(v.plans).toBe(2);
    expect([v.entry, v.stop, v.target]).toEqual([100, 98, 105]);
    expect(v.riskPerUnit).toBe(2);
    expect(v.riskPct).toBeCloseTo(2, 10);
    expect(v.rr).toBeCloseTo(2.5, 10);
    expect(v.live).toEqual({ price: 101, r: 0.5, toStop: 3 });
  });

  it("a stop on the reward side is refused, not flipped", () => {
    expect(selectRiskOnPrice([{ side: "LONG", entry: 100, stop: 101, target: 105, placedAt: 1 }], [], 100).reason).toBe("STOP_ON_WRONG_SIDE");
    expect(selectRiskOnPrice([{ side: "SHORT", entry: 100, stop: 99, target: 95, placedAt: 1 }], [], 100).reason).toBe("STOP_ON_WRONG_SIDE");
    expect(selectRiskOnPrice([{ side: "LONG", entry: 100, stop: null, target: 105, placedAt: 1 }], [], 100).reason).toBe("NO_STOP_ON_DRAWING");
  });

  it("reads the bars since the plan: entry first, then stop or target", () => {
    const plan = [{ side: "LONG" as const, entry: 100, stop: 98, target: 104, placedAt: 10 }];
    expect(selectRiskOnPrice(plan, [bar(10, 101, 103)], 102).state).toBe("WAITING_FOR_ENTRY");
    expect(selectRiskOnPrice(plan, [bar(10, 99.5, 101), bar(11, 100, 102)], 101).state).toBe("LIVE_ON_PRICE");
    const stop = selectRiskOnPrice(plan, [bar(10, 99.5, 101), bar(11, 97.9, 100)], 98.5);
    expect(stop.state).toBe("STOP_TOUCHED");
    expect(stop.stopAt).toBe(11);
    expect(selectRiskOnPrice(plan, [bar(10, 99.5, 101), bar(11, 100, 104.2)], 104).state).toBe("TARGET_TOUCHED");
    // Both levels inside one bar: this timeframe cannot order them.
    expect(selectRiskOnPrice(plan, [bar(10, 99.5, 101), bar(11, 97, 105)], 100).state).toBe("AMBIGUOUS_BAR");
    // Bars before the plan was placed are not its history.
    expect(selectRiskOnPrice(plan, [bar(5, 90, 110)], 102).state).toBe("WAITING_FOR_ENTRY");
  });

  it("names what it refuses to estimate: size, equity risk, fill", () => {
    const v = selectRiskOnPrice([{ side: "SHORT", entry: 100, stop: 102, target: 96, placedAt: 1 }], [], 99);
    expect(v.refusals).toBe(RISK_REFUSALS);
    expect(v.refusals.join(" ")).toMatch(/SIZE.*EQUITY RISK.*FILL/);
    expect(JSON.stringify(Object.keys(v))).not.toMatch(/equity"|size"|fillPrice|probab|score/i);
    expect(v.live).toEqual({ price: 99, r: 0.5, toStop: 3 });
  });

  it("reads Draw's position anchors as [entry, target, stop]", () => {
    expect(planFromDrawing({ tool: "short-position", pts: [{ price: 10, time: 5 }, { price: 8, time: 6 }, { price: 11, time: 6 }] }))
      .toEqual({ side: "SHORT", entry: 10, target: 8, stop: 11, placedAt: 5 });
    expect(planFromDrawing({ tool: "trend-line", pts: [{ price: 10, time: 5 }] })).toBeNull();
  });
});
