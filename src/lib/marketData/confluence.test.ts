import { describe, it, expect } from "vitest";
import {
  computeConfluence,
  CONFLUENCE_FORMULA_VERSION,
  CONFLUENCE_MIN_MEASURED,
  type ConfluenceFlow,
} from "./confluence";

function flow(overrides: Partial<ConfluenceFlow> = {}): ConfluenceFlow {
  return {
    hasFlow: true,
    vwap: 100,
    cvd: 0,
    askVol: 500,
    bidVol: 500,
    imbRatio: 100,
    askDom: true,
    candleUp: true,
    ...overrides,
  };
}

describe("computeConfluence", () => {
  it("emits INSUFFICIENT and null score when price is 0 (no lenses)", () => {
    const r = computeConfluence(0, flow({ hasFlow: false, askVol: 0, bidVol: 0, vwap: 0 }));
    expect(r.score).toBeNull();
    expect(r.bias).toBe("INSUFFICIENT");
    expect(r.insufficient).toBe(true);
    expect(r.measured).toBeLessThan(CONFLUENCE_MIN_MEASURED);
    expect(r.reason).toContain("Unavailable");
  });

  it("emits INSUFFICIENT when only Candle + VWAP + Band would measure but hasFlow is false (2/5 lenses when inside bands)", () => {
    // Price sits inside VWAP bands and equals VWAP → VWAP dir is 'na', Band is 'na'.
    // Only Candle measures. hasFlow=false → CVD + Imbalance abstain.
    const r = computeConfluence(100, flow({
      hasFlow: false,
      askVol: 0,
      bidVol: 0,
      vwap: 100,
      cvd: 0,
      candleUp: true,
    }));
    expect(r.insufficient).toBe(true);
    expect(r.score).toBeNull();
    expect(r.measured).toBeLessThan(CONFLUENCE_MIN_MEASURED);
  });

  it("emits a real numeric score when >= 3 lenses measure (full aggressor tape)", () => {
    const r = computeConfluence(100.5, flow({
      hasFlow: true,
      vwap: 100,
      cvd: 300,
      askVol: 700,
      bidVol: 300,
      imbRatio: 233,
      askDom: true,
      candleUp: true,
    }));
    expect(r.insufficient).toBe(false);
    expect(r.score).not.toBeNull();
    expect(r.measured).toBeGreaterThanOrEqual(CONFLUENCE_MIN_MEASURED);
    expect(["BULL", "BEAR", "NEUTRAL"]).toContain(r.bias);
  });

  it("clamps score into [2, 98]", () => {
    // Extreme bull: price stretched above upper band, big CVD, imbalance dominant.
    // We test that even at extremes the score does not overflow.
    const bull = computeConfluence(101, flow({
      hasFlow: true,
      vwap: 100,
      cvd: 10_000,
      askVol: 10_500,
      bidVol: 500,
      imbRatio: 500,
      askDom: true,
      candleUp: true,
    }));
    expect(bull.score).not.toBeNull();
    expect(bull.score!).toBeLessThanOrEqual(98);
    expect(bull.score!).toBeGreaterThanOrEqual(2);
  });

  it("is deterministic — same input, same output (byte-equal reason)", () => {
    const input: ConfluenceFlow = flow({ hasFlow: true, vwap: 100, cvd: 100, askVol: 600, bidVol: 400, imbRatio: 150 });
    const a = computeConfluence(100.2, input);
    const b = computeConfluence(100.2, input);
    expect(a).toEqual(b);
  });

  it("carries formula version on every reading (versioning for journal/export)", () => {
    const r = computeConfluence(100.5, flow());
    expect(r.formulaVersion).toBe(CONFLUENCE_FORMULA_VERSION);
    const insufficient = computeConfluence(0, flow({ hasFlow: false, askVol: 0, bidVol: 0, vwap: 0 }));
    expect(insufficient.formulaVersion).toBe(CONFLUENCE_FORMULA_VERSION);
  });

  it("reports per-lens abstention labels in the reason line", () => {
    const r = computeConfluence(100, flow({
      hasFlow: false,
      askVol: 0,
      bidVol: 0,
      vwap: 100,
    }));
    expect(r.reason).toContain("CVD");
    expect(r.reason).toContain("Imbalance");
  });

  it("BULL bias when price > VWAP and buyers dominate the tape", () => {
    const r = computeConfluence(101, flow({
      hasFlow: true,
      vwap: 100,
      cvd: 400,
      askVol: 700,
      bidVol: 300,
      imbRatio: 233,
      askDom: true,
      candleUp: true,
    }));
    expect(r.insufficient).toBe(false);
    expect(r.bias).toBe("BULL");
    expect(r.score!).toBeGreaterThanOrEqual(58);
  });

  it("BEAR bias when price < VWAP and sellers dominate the tape", () => {
    const r = computeConfluence(99, flow({
      hasFlow: true,
      vwap: 100,
      cvd: -400,
      askVol: 300,
      bidVol: 700,
      imbRatio: 233,
      askDom: false,
      candleUp: false,
    }));
    expect(r.insufficient).toBe(false);
    expect(r.bias).toBe("BEAR");
    expect(r.score!).toBeLessThanOrEqual(42);
  });

  it("bull + bear + N/A lens counts sum to totalLenses", () => {
    const r = computeConfluence(100.5, flow());
    const naCount = r.lenses.filter((l) => l.dir === "na").length;
    expect(r.bull + r.bear + naCount).toBe(r.totalLenses);
    expect(r.measured).toBe(r.bull + r.bear);
  });

  it("insufficient reading still exposes lens breakdown (evidence transparency)", () => {
    const r = computeConfluence(0, flow({ hasFlow: false, askVol: 0, bidVol: 0, vwap: 0 }));
    expect(r.insufficient).toBe(true);
    expect(r.lenses).toHaveLength(5);
    expect(r.lenses.every((l) => l.dir === "na")).toBe(true);
    expect(r.lenses.every((l) => l.contribution === 0)).toBe(true);
  });
});
