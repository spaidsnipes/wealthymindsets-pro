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
  pushStartTime: -120, pushEndTime: 180, followThroughTimes: [240, 300, 360],
  followBars: [{ time: 240, reach: 104, beyond: false }, { time: 300, reach: 104.5, beyond: false }, { time: 360, reach: 103, beyond: false }],
  originPrice: 99, effortFirstHalf: 0.9, effortSecondHalf: 0.36,
  followThrough: 0, energyTransfer: 3.81, exhausted: true, ...over,
});
const exVM = (marks: ExhaustionReading[], latest: ExhaustionReading | null): ExhaustionVM =>
  ({ version: 1, measured: true, basis: "VOLUME", reason: "MEASURED", marks, pushes: latest ? [latest] : [], latestPush: latest });

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

  it("a target zone reads that zone; the newest zone as target reads exactly what the default reads", () => {
    const older: AbsorptionZone = { ...zone, startTime: 0, endTime: 0, barCount: 1, efficiencyRatio: 1.5, strength: "WEAK" };
    const a = anatomy({ zones: [older, zone] });
    expect(selectAnatomyCards(a, exVM([], null), { zone }).absorption)
      .toEqual(selectAnatomyCards(a, exVM([], null)).absorption);
    const onOlder = selectAnatomyCards(a, exVM([], null), { zone: older }).absorption;
    // bar 0 alone: effort 30%, displacement 80%.
    expect(onOlder.metrics.map(m => m.value)).toEqual(["30%", "80%", "1.5×", "267%"]);
    expect(onOlder.metrics[2].word).toBe("WEAK");
  });

  it("a target push reads that push even when a newer mark exists", () => {
    const older = push({ time: 60, exhausted: false, followThrough: null, extension: 4 });
    const v = selectAnatomyCards(anatomy(), exVM([push()], push()), { push: older });
    expect(v.exhaustion.outcome).toBe("NOT EXHAUSTED · 2 OF 3");
    expect(v.exhaustion.metrics[2]).toMatchObject({ value: "—", word: "PENDING" });
    expect(v.exhaustion.time).toBe(60);
  });

  it("builds no integrity score, probability or body-metaphor units", () => {
    const v = selectAnatomyCards(anatomy(), exVM([push()], push()));
    const s = JSON.stringify(v);
    expect(s).not.toMatch(/INTEGRITY|probab|score|\bcm\b/i);
  });
});
