/**
 * The compiler behind Asset 06 as a full view.
 *
 * These tests are written against the two failures the Founder's canon calls
 * out by name, not against the happy path:
 *
 *   1. A zero that was never counted. On an unsigned tape the buyer-initiated
 *      total must be `null`, so the surface can render an em dash. Every
 *      earlier version of this reading shipped `0` and asserted a measurement.
 *   2. A conviction percentage. The mockup prints 82%. Nothing here may
 *      produce a number shaped like that from a window with no model behind it.
 */

import { describe, expect, it } from "vitest";
import {
  ladderFillOf,
  selectAbsorptionAnatomyView,
} from "@/lib/marketData/viewModels/selectAbsorptionAnatomyView";
import type { AnatomyBarInput } from "@/lib/marketData/selectAbsorptionAnatomy";

/** A bar that spends `volume` and moves price by `move`. */
function bar(time: number, price: number, move: number, volume: number): AnatomyBarInput {
  const close = price + move;
  return {
    time,
    open: price,
    high: Math.max(price, close) + 0.25,
    low: Math.min(price, close) - 0.25,
    close,
    volume,
  };
}

/** Three quiet bars, then a run of high-volume bars that barely move price. */
function absorbingWindow(): AnatomyBarInput[] {
  const out: AnatomyBarInput[] = [];
  for (let i = 0; i < 6; i += 1) out.push(bar(i, 100 + i, 4, 100));
  for (let i = 6; i < 12; i += 1) out.push(bar(i, 106, 0.05, 5000));
  return out;
}

describe("selectAbsorptionAnatomyView", () => {
  it("returns an unmeasured view when nothing observable backs the window", () => {
    const vm = selectAbsorptionAnatomyView([]);
    expect(vm.measured).toBe(false);
    expect(vm.basis).toBe("UNMEASURED");
    expect(vm.bars).toEqual([]);
    expect(vm.conviction.strength).toBeNull();
    expect(vm.reason).not.toBe("");
  });

  it("measures on volume alone and says so", () => {
    const vm = selectAbsorptionAnatomyView(absorbingWindow());
    expect(vm.measured).toBe(true);
    expect(vm.basis).toBe("VOLUME");
    expect(vm.reason).toContain("never stated an aggressor side");
  });

  it("NEVER reports a buyer-initiated ZERO on an unsigned tape", () => {
    const vm = selectAbsorptionAnatomyView(absorbingWindow());
    // This is the whole point of the module. A zero here is a measurement
    // claim about a count that was never taken.
    expect(vm.aggression.buyInitiated).toBeNull();
    expect(vm.aggression.sellInitiated).toBeNull();
    expect(vm.aggression.netDelta).toBeNull();
    expect(vm.aggression.buyShare).toBeNull();
    expect(vm.aggression.deltaSeries.every(d => d === null)).toBe(true);
    // Volume, by contrast, WAS observed, so it is a number.
    expect(vm.aggression.totalVolume).toBeGreaterThan(0);
  });

  it("refuses a window-wide aggression total when only SOME bars carried a side", () => {
    const input = absorbingWindow().map((b, i) =>
      i % 2 === 0 ? { ...b, askVol: 10, bidVol: 5, aggressorProvenance: "PROVIDER" as const } : b,
    );
    const vm = selectAbsorptionAnatomyView(input);
    // Summing the bars that happened to carry a split and labelling it
    // "buyer initiated" would answer a narrower question than the one asked.
    expect(vm.aggression.buyInitiated).toBeNull();
    expect(vm.basis).toBe("VOLUME");
  });

  it("reports a real signed rail when every bar carried a provider-stated side", () => {
    const input = absorbingWindow().map(b => ({
      ...b,
      askVol: 70,
      bidVol: 30,
      aggressorProvenance: "PROVIDER" as const,
    }));
    const vm = selectAbsorptionAnatomyView(input);
    expect(vm.basis).toBe("SIGNED_DELTA");
    expect(vm.aggression.buyInitiated).toBe(70 * input.length);
    expect(vm.aggression.sellInitiated).toBe(30 * input.length);
    expect(vm.aggression.netDelta).toBe(40 * input.length);
    expect(vm.aggression.buyShare).toBeCloseTo(0.7, 6);
  });

  it("finds the absorption zone and states conviction as the real strength word", () => {
    const vm = selectAbsorptionAnatomyView(absorbingWindow());
    expect(vm.zones.length).toBeGreaterThan(0);
    expect(vm.focusZone).not.toBeNull();
    expect(["STRONG", "MODERATE", "WEAK"]).toContain(vm.conviction.strength);
    // The mockup's 82% has no model behind it and must not appear in any form.
    expect(vm.conviction).not.toHaveProperty("percent");
    expect(vm.conviction).not.toHaveProperty("confidence");
  });

  it("describes the MOST RECENT zone, not the strongest one in the window", () => {
    const vm = selectAbsorptionAnatomyView(absorbingWindow());
    const last = vm.zones[vm.zones.length - 1]!;
    expect(vm.focusZone).toBe(last);
    expect(vm.conviction.strength).toBe(last.strength);
  });

  it("marks imbalance persistence UNMEASURED — not failed — on an unsigned tape", () => {
    const vm = selectAbsorptionAnatomyView(absorbingWindow());
    const item = vm.checklist.find(c => c.label === "Imbalance persistence")!;
    expect(item.state).toBe("UNMEASURED");
    expect(item.basis).toContain("cannot be run");
  });

  it("measures the volume shelf from the window actually in hand", () => {
    const vm = selectAbsorptionAnatomyView(absorbingWindow());
    const item = vm.checklist.find(c => c.label === "Volume shelf")!;
    // The absorbing run is where all the volume went, so this is a real MET.
    expect(item.state).toBe("MET");
    expect(item.basis).toContain("% of window volume");
  });

  it("publishes all five of the mockup's characteristics, always", () => {
    const vm = selectAbsorptionAnatomyView(absorbingWindow());
    expect(vm.checklist.map(c => c.label)).toEqual([
      "High effort",
      "Weak displacement",
      "Time extension",
      "Imbalance persistence",
      "Volume shelf",
    ]);
    // A criterion never renders without saying what decided it.
    for (const c of vm.checklist) expect(c.basis.length).toBeGreaterThan(0);
  });

  it("reports no zone honestly when price kept following the effort", () => {
    const efficient: AnatomyBarInput[] = [];
    for (let i = 0; i < 12; i += 1) efficient.push(bar(i, 100 + i * 3, 3, 1000 + i * 500));
    const vm = selectAbsorptionAnatomyView(efficient);
    expect(vm.focusZone).toBeNull();
    expect(vm.conviction.strength).toBeNull();
    expect(vm.conviction.ladderFill).toBeNull();
    expect(vm.reason).toContain("no absorption zone");
  });
});

describe("ladderFillOf", () => {
  it("places the ratio on the code's own STRONG/MODERATE/WEAK ladder", () => {
    expect(ladderFillOf(0, false)).toBe(0);
    expect(ladderFillOf(2, false)).toBeCloseTo(1 / 3, 6);
    expect(ladderFillOf(5, false)).toBeCloseTo(2 / 3, 6);
  });

  it("approaches, but never reaches, full — a clamp would erase 5.1 vs 40", () => {
    const a = ladderFillOf(5.1, false)!;
    const b = ladderFillOf(40, false)!;
    expect(a).toBeGreaterThan(2 / 3);
    expect(b).toBeGreaterThan(a);
    expect(b).toBeLessThan(1);
  });

  it("fills completely only when the run displaced price not at all", () => {
    expect(ladderFillOf(null, true)).toBe(1);
  });

  it("has no position for a ratio that does not exist", () => {
    expect(ladderFillOf(null, false)).toBeNull();
  });
});
