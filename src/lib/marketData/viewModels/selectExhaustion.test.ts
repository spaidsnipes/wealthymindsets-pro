import { describe, expect, it } from "vitest";

import selectExhaustion, { FT_BARS, MIN_PUSH_BARS } from "./selectExhaustion";
import type { AbsorptionAnatomyVM, AnatomyBar } from "@/lib/marketData/selectAbsorptionAnatomy";

const b = (time: number, close: number, effortNorm: number, range = 1): AnatomyBar => ({
  time, open: close - 0.5, high: close + range / 2, low: close - range / 2, close,
  effort: effortNorm * 100, effortNorm, delta: null,
  displacement: 0.5, displacementNorm: 0.5, absorbing: false,
});
const vm = (bars: AnatomyBar[], over: Partial<AbsorptionAnatomyVM> = {}): AbsorptionAnatomyVM => ({
  basis: "VOLUME", measured: true, bars, zones: [], windowBars: bars.length,
  effortConcentration: null, effortQualifyingBars: 0, zoneQualificationPossible: true,
  effortSpreadNote: null, ...over,
} as AbsorptionAnatomyVM);

/** Base, then a 6-bar up push whose effort fades, then FT bars that stall. */
function fadingPush(ftHighs: number[]) {
  const bars = [b(0, 100, 0.5)];
  const efforts = [1, 0.95, 0.9, 0.4, 0.3, 0.25];
  efforts.forEach((e, k) => bars.push(b(60 * (k + 1), 101 + k, e)));
  ftHighs.forEach((c, k) => bars.push(b(60 * (7 + k), c, 0.3)));
  return bars;
}

describe("refusals", () => {
  it("no effort basis is UNMEASURED, never a flat verdict", () => {
    expect(selectExhaustion(null).reason).toBe("UNMEASURED_EFFORT");
    expect(selectExhaustion(vm([], { measured: false, basis: "UNMEASURED" })).reason).toBe("UNMEASURED_EFFORT");
    expect(selectExhaustion(vm([b(0, 1, 1)])).reason).toBe("TOO_FEW_BARS");
  });
});

describe("the anatomy", () => {
  it("fading effort + extension + no new extreme after → EXHAUSTED at the push extreme", () => {
    const v = selectExhaustion(vm(fadingPush([105, 104.5, 104])));
    expect(v.marks).toHaveLength(1);
    const m = v.marks[0];
    expect(m.direction).toBe("UP");
    expect(m.aggressionLevel).toBeLessThan(0.75);
    expect(m.extension).toBeGreaterThanOrEqual(3);
    expect(m.followThrough).toBe(0);
    expect(m.time).toBe(360);
    expect(m.price).toBe(106.5); // the push's own high — a real price
  });

  it("follow-through present → not exhausted, but the reading is still published", () => {
    const v = selectExhaustion(vm(fadingPush([104, 107.5, 106.9])));
    expect(v.marks).toEqual([]);
    expect(v.latestPush).not.toBeNull();
  });

  it("fewer than FT_BARS after the push → PENDING, never a premature verdict", () => {
    const v = selectExhaustion(vm(fadingPush([105])));
    const p = v.latestPush!;
    expect(p.followThrough).toBeNull();
    expect(p.exhausted).toBe(false);
    expect(FT_BARS).toBeGreaterThan(1);
  });

  it("steady effort through the push → not declining → not exhausted", () => {
    const bars = [b(0, 100, 0.5)];
    for (let k = 0; k < 6; k++) bars.push(b(60 * (k + 1), 101 + k, 0.9));
    [105, 104.5, 104].forEach((c, k) => bars.push(b(60 * (7 + k), c, 0.3)));
    expect(selectExhaustion(vm(bars)).marks).toEqual([]);
  });

  it("a push shorter than MIN_PUSH_BARS is not a push", () => {
    const bars = [b(0, 100, 0.5)];
    for (let k = 0; k < MIN_PUSH_BARS - 1; k++) bars.push(b(60 * (k + 1), 101 + k, 1 - k * 0.3));
    [102, 101.5, 101].forEach((c, k) => bars.push(b(600 + 60 * k, c, 0.3)));
    expect(selectExhaustion(vm(bars)).marks).toEqual([]);
  });

  it("publishes the push's own span and the bars follow-through was measured on", () => {
    const m = selectExhaustion(vm(fadingPush([105, 104.5, 104]))).marks[0];
    expect(m.pushStartTime).toBe(60);
    expect(m.pushEndTime).toBe(360);
    expect(m.followThroughTimes).toEqual([420, 480, 540]);
  });

  it("an extreme short of the push's last bar does not move the push or its follow-through", () => {
    // Up push on bars 60..360, closes rising; bar 300 has the highest high
    // (range 4 → 107) and bar 360 closes higher on a lower high (106.5).
    const bars = fadingPush([105, 104.5, 104]).map(x =>
      x.time === 300 ? { ...x, high: x.close + 2, low: x.close - 2 } : x);
    const m = selectExhaustion(vm(bars)).marks[0];
    expect(m.time).toBe(300);
    expect(m.price).toBe(107);
    // Fuel is on the push's bars (not the origin bar at 0), including the
    // faded last bar the extreme is not on.
    expect([m.pushStartTime, m.pushEndTime]).toEqual([60, 360]);
    // Follow-through was measured on the bars after the push end.
    expect(m.followThroughTimes).toEqual([420, 480, 540]);
  });

  it("while PENDING, only the follow-through bars that exist are published", () => {
    const p = selectExhaustion(vm(fadingPush([105]))).latestPush!;
    expect(p.followThrough).toBeNull();
    expect(p.followThroughTimes).toEqual([420]);
  });

  it("every mark failed on all of its measured follow-through bars", () => {
    // A mark requires followThrough === 0 over FT_BARS existing bars, so the
    // chart has nothing to fill: each slot it draws is a bar that failed.
    const v = selectExhaustion(vm(fadingPush([105, 104.5, 104])));
    expect(v.marks.length).toBeGreaterThan(0);
    for (const m of v.marks) {
      expect(m.followThrough).toBe(0);
      expect(m.followThroughTimes).toHaveLength(FT_BARS);
    }
  });

  it("publishes the halves, the origin and the follow bars it already measured, and they agree with the metrics", () => {
    const v = selectExhaustion(vm(fadingPush([105, 104.5, 107])));
    const p = v.latestPush!;
    expect(p.effortSecondHalf / p.effortFirstHalf).toBeCloseTo(p.aggressionLevel, 12);
    expect(p.effortFirstHalf).toBeCloseTo((1 + 0.95 + 0.9) / 3, 12);
    // UP: the origin is the prior bar's LOW, and extension runs origin → extreme.
    expect(p.originPrice).toBe(99.5);
    expect(p.followBars.map(f => f.time)).toEqual(p.followThroughTimes);
    expect(p.followBars.map(f => f.reach)).toEqual([105.5, 105, 107.5]);
    expect(p.followBars.filter(f => f.beyond).length).toBe(p.followThrough);
    expect(p.followThrough).toBe(1);
  });

  it("publishes every push in the window, uncapped, beside the capped marks", () => {
    const v = selectExhaustion(vm(fadingPush([104, 107.5, 106.9])));
    expect(v.marks).toEqual([]);
    expect(v.pushes).toHaveLength(1);
    expect(v.pushes[0]).toEqual(v.latestPush);
    expect(v.pushes[0].exhausted).toBe(false);
    const m = selectExhaustion(vm(fadingPush([105, 104.5, 104])));
    expect(m.pushes.filter(p => p.exhausted)).toEqual(m.marks);
  });

  it("carries the effort basis through and no probability field", () => {
    const v = selectExhaustion(vm(fadingPush([105, 104.5, 104])));
    expect(v.basis).toBe("VOLUME");
    expect(Object.keys(v.marks[0]).some(k => /prob|score|confidence/i.test(k))).toBe(false);
  });
});
