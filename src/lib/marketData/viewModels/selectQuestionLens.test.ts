import { describe, expect, it } from "vitest";

import selectQuestionLens from "./selectQuestionLens";
import type { AbsorptionAnatomyVM, AnatomyBar, AbsorptionZone } from "@/lib/marketData/selectAbsorptionAnatomy";
import type { ExhaustionVM } from "./selectExhaustion";

const b = (time: number, low: number, high: number, effortNorm = 0.5, delta: number | null = null): AnatomyBar => ({
  time, open: low, high, low, close: high, effort: effortNorm * 100, effortNorm, delta,
  displacement: high - low, displacementNorm: 0.5, absorbing: false,
});
const zone: AbsorptionZone = { startTime: 60, endTime: 120, priceLo: 100, priceHi: 101, barCount: 2,
  efficiencyRatio: 3, unbounded: false, strength: "MODERATE" };
const anatomy = (bars: AnatomyBar[], over: Partial<AbsorptionAnatomyVM> = {}) => ({
  basis: "VOLUME", measured: true, bars, zones: [zone], windowBars: bars.length,
  effortConcentration: null, effortQualifyingBars: 0, zoneQualificationPossible: true, effortSpreadNote: null, ...over,
} as AbsorptionAnatomyVM);
const noEx: ExhaustionVM = { version: 1, measured: true, basis: "VOLUME", reason: "MEASURED", marks: [], latestPush: null };

describe("no reading, no question", () => {
  it("nothing material → inactive, nothing quieted", () => {
    expect(selectQuestionLens({ absorption: null, exhaustion: null, livingPoc: null, pivots: [] }).active).toBe(false);
    const v = selectQuestionLens({ absorption: anatomy([b(0, 99, 100)], { zones: [] }), exhaustion: noEx, livingPoc: null, pivots: [] });
    expect(v.active).toBe(false);
  });
});

describe("absorption question", () => {
  const bars = [b(0, 99, 100), b(60, 100, 101, 0.9), b(120, 100.2, 100.9, 0.9), b(180, 100.5, 101.2, 0.3)];

  it("on VOLUME it asks about EFFORT, never guesses a side", () => {
    const v = selectQuestionLens({ absorption: anatomy(bars), exhaustion: noEx, livingPoc: null, pivots: [] });
    expect(v.question).toBe("Is effort being absorbed at 100.00–101.00?");
    expect(v.focus).toMatch(/side unknown/);
  });

  it("on a delta basis it names the side from the zone's own delta", () => {
    const sided = bars.map(x => ({ ...x, delta: -50 }));
    const v = selectQuestionLens({ absorption: anatomy(sided, { basis: "SIGNED_DELTA" }), exhaustion: noEx, livingPoc: null, pivots: [] });
    expect(v.question).toMatch(/^Is seller effort being absorbed/);
  });

  it("every debt item is measured; unpaid items mean WAIT", () => {
    const v = selectQuestionLens({ absorption: anatomy(bars), exhaustion: noEx, livingPoc: 105, pivots: [] });
    expect(v.debt.map(d => d.label)).toEqual(["CLEAR DISPLACEMENT", "SUSTAINED AGGRESSION", "STRUCTURE CONFIRMATION", "VOLUME ACCEPTANCE"]);
    expect(v.openDebt).toBe(4);
    expect(v.posture).toBe("WAIT · LET THE MARKET PAY");
    for (const d of v.debt) expect(d.evidence.length).toBeGreaterThan(5);
  });

  it("paying items: POC inside the zone and a confirmed swing inside it", () => {
    const v = selectQuestionLens({ absorption: anatomy(bars), exhaustion: noEx, livingPoc: 100.5, pivots: [{ time: 180, price: 100.5 }] });
    expect(v.debt.find(d => d.label === "VOLUME ACCEPTANCE")!.paid).toBe(true);
    expect(v.debt.find(d => d.label === "STRUCTURE CONFIRMATION")!.paid).toBe(true);
  });

  it("carries no probability or confidence field", () => {
    const v = selectQuestionLens({ absorption: anatomy(bars), exhaustion: noEx, livingPoc: null, pivots: [] });
    expect(Object.keys(v).some(k => /prob|confidence|score/i.test(k))).toBe(false);
  });
});

describe("exhaustion wins when it is newer", () => {
  it("asks the exhaustion question with its own debt", () => {
    const bars = [b(0, 99, 100), b(60, 100, 101), b(120, 100, 101), b(180, 101, 102), b(240, 102, 103), b(300, 103, 104), b(360, 103.5, 104.5)];
    const ex: ExhaustionVM = { ...noEx, marks: [{ direction: "UP", time: 300, price: 104, pushBars: 4,
      aggressionLevel: 0.4, extension: 5, followThrough: 0, energyTransfer: 1, exhausted: true }] };
    const v = selectQuestionLens({ absorption: anatomy(bars), exhaustion: ex, livingPoc: null, pivots: [] });
    expect(v.kind).toBe("EXHAUSTION");
    expect(v.question).toBe("Is this up-push exhausted at 104.00?");
    expect(v.debt.find(d => d.label === "FOLLOW-THROUGH LOST")!.paid).toBe(true);
  });
});
