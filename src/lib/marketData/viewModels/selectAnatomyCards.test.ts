import { describe, expect, it } from "vitest";

import selectAnatomyCards from "./selectAnatomyCards";
import type { AbsorptionAnatomyVM, AnatomyBar, AbsorptionZone } from "@/lib/marketData/selectAbsorptionAnatomy";
import type { ExhaustionReading, ExhaustionVM } from "./selectExhaustion";

const b = (time: number, effortNorm: number, displacementNorm: number): AnatomyBar => ({
  time, open: 100, high: 101, low: 99, close: 100.5, effort: effortNorm * 100, effortNorm, delta: null,
  displacement: 0.5, displacementNorm, absorbing: effortNorm >= 0.6 && displacementNorm <= 0.35,
});
const zone: AbsorptionZone = { startTime: 60, endTime: 120, priceLo: 99, priceHi: 101, barCount: 2,
  efficiencyRatio: 4, unbounded: false, strength: "MODERATE" };
const anatomy = (over: Partial<AbsorptionAnatomyVM> = {}) => ({
  basis: "VOLUME", measured: true, bars: [b(0, 0.3, 0.8), b(60, 0.9, 0.2), b(120, 0.8, 0.2), b(180, 0.4, 0.6)],
  zones: [zone], windowBars: 4, effortConcentration: null, effortQualifyingBars: 2,
  zoneQualificationPossible: true, effortSpreadNote: null, ...over,
} as AbsorptionAnatomyVM);
const push = (over: Partial<ExhaustionReading> = {}): ExhaustionReading => ({
  direction: "UP", time: 180, price: 105, pushBars: 6, aggressionLevel: 0.4, extension: 7.7,
  followThrough: 0, energyTransfer: 3.81, exhausted: true, ...over,
});
const exVM = (marks: ExhaustionReading[], latest: ExhaustionReading | null): ExhaustionVM =>
  ({ version: 1, measured: true, basis: "VOLUME", reason: "MEASURED", marks, latestPush: latest });

describe("the plate's two KEY METRICS columns, from the owners on the chart", () => {
  it("absorption card reads the newest zone's own bars", () => {
    const v = selectAnatomyCards(anatomy(), exVM([], null));
    expect(v.absorption.metrics.map(m => m.label)).toEqual(["EFFORT LEVEL", "DISPLACEMENT", "EFFICIENCY RATIO", "ENERGY TRANSFER"]);
    expect(v.absorption.metrics[0]).toMatchObject({ value: "85%", word: "HIGH" });
    expect(v.absorption.metrics[1]).toMatchObject({ value: "20%", word: "WEAK" });
    expect(v.absorption.metrics[2]).toMatchObject({ value: "4.0×", word: "MODERATE" });
    expect(v.absorption.outcome).toBe("ABSORBED");
  });

  it("exhaustion card carries the plate's four metrics", () => {
    const v = selectAnatomyCards(anatomy(), exVM([push()], push()));
    expect(v.exhaustion.metrics.map(m => `${m.label}:${m.value}:${m.word}`)).toEqual([
      "EFFORT 2ND ÷ 1ST:40%:DECLINING", "EXTENSION:7.7×:EXTENDED", "FOLLOW-THROUGH:0/3:LOST", "ENERGY TRANSFER:381%:EFFICIENT",
    ]);
    expect(v.exhaustion.outcome).toBe("EXHAUSTED");
  });

  it("a near miss is shown as NOT EXHAUSTED with the conditions it met", () => {
    const near = push({ exhausted: false, followThrough: 2, extension: 1.2 });
    const v = selectAnatomyCards(anatomy(), exVM([], near));
    expect(v.exhaustion.outcome).toBe("NOT EXHAUSTED · 1 OF 3");
  });

  it("empty is said, not drawn as calm", () => {
    const v = selectAnatomyCards(anatomy({ zones: [] }), exVM([], null));
    expect(v.absorption.metrics).toEqual([]);
    expect(v.absorption.empty).toMatch(/no run of bars/);
    expect(v.exhaustion.empty).toMatch(/no push/);
    expect(selectAnatomyCards(null, null).measured).toBe(false);
  });

  it("builds no integrity score, probability or body-metaphor units", () => {
    const v = selectAnatomyCards(anatomy(), exVM([push()], push()));
    const s = JSON.stringify(v);
    expect(s).not.toMatch(/INTEGRITY|probab|score|\bcm\b/i);
  });
});
