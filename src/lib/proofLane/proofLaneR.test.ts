import { describe, it, expect } from "vitest";
import {
  realizedR,
  contractReturnPct,
  evaluateShutdown,
  classifyDayModel,
  cumulativeRPath,
  DAY_MODEL_LABELS,
} from "./proofLaneR";

describe("proofLaneR — canon §24 R math", () => {
  it("$100 contract with $20 planned R and +$20 P&L is +1R", () => {
    expect(realizedR({ plannedRDollars: 20, realizedPnlDollars: 20 })).toBe(1);
  });
  it("$100 contract with $20 planned R and +$100 P&L (+100% contract) is +5R", () => {
    expect(realizedR({ plannedRDollars: 20, realizedPnlDollars: 100 })).toBe(5);
  });
  it("full structural loss on the entry premium is -1R", () => {
    expect(realizedR({ plannedRDollars: 20, realizedPnlDollars: -20 })).toBe(-1);
  });
  it("throws when plannedR is not defined — canon §4 requires 1R before entry", () => {
    expect(() => realizedR({ plannedRDollars: 0, realizedPnlDollars: 10 })).toThrow(/canon §4/);
    expect(() => realizedR({ plannedRDollars: -5, realizedPnlDollars: 10 })).toThrow();
  });
  it("R and contract return % are separate measurements (canon §6)", () => {
    // +20% contract with 1R = 20% of contract cost → +1R
    const r = realizedR({ plannedRDollars: 20, realizedPnlDollars: 20 });
    const pct = contractReturnPct({ entryPremiumPerContract: 100, exitPremiumPerContract: 120 });
    expect(r).toBe(1);
    expect(pct).toBeCloseTo(0.2, 6);
    // They agree here BY DESIGN of the plan, not by definition.
    // Change plannedR alone → R changes, contract % doesn't.
    const rSmaller = realizedR({ plannedRDollars: 10, realizedPnlDollars: 20 });
    expect(rSmaller).toBe(2);
    expect(pct).toBeCloseTo(0.2, 6); // unchanged
  });
});

describe("proofLaneR — canon §4 shutdown gate", () => {
  it("OPEN when cumulative R is inside window", () => {
    const r = evaluateShutdown({ closedRs: [1, -0.5, 0.5] });
    expect(r.state).toBe("OPEN");
    expect(r.cumulativeR).toBe(1);
  });
  it("AT_TWO_R_STOP at exactly -2R", () => {
    const r = evaluateShutdown({ closedRs: [-1, -1] });
    expect(r.state).toBe("AT_TWO_R_STOP");
    expect(r.reason).toContain("hard daily-loss stop");
  });
  it("AT_TWO_R_STOP past -2R (e.g. -2.5R)", () => {
    const r = evaluateShutdown({ closedRs: [-1, -1.5] });
    expect(r.state).toBe("AT_TWO_R_STOP");
  });
  it("AT_THREE_R_TARGET at +3R exactly (baseline objective, not quota)", () => {
    const r = evaluateShutdown({ closedRs: [1.5, 1.5] });
    expect(r.state).toBe("AT_THREE_R_TARGET");
    expect(r.reason).toContain("no daily quota");
  });
});

describe("proofLaneR — canon §3 Model classifier", () => {
  it("M0 when regime unclear (canon rejection: no trade authorization)", () => {
    expect(
      classifyDayModel({
        fullChainAligned: true, availableRunwayR: 5, regime: "UNCLEAR", atRangeEdge: false, clcSufficient: true,
      }),
    ).toBe("M0");
  });
  it("M0 when CLC insufficient (canon: location earns observation)", () => {
    expect(
      classifyDayModel({
        fullChainAligned: true, availableRunwayR: 5, regime: "TREND", atRangeEdge: false, clcSufficient: false,
      }),
    ).toBe("M0");
  });
  it("M0 when chain not aligned (any missing link → no permission)", () => {
    expect(
      classifyDayModel({
        fullChainAligned: false, availableRunwayR: 5, regime: "TREND", atRangeEdge: false, clcSufficient: true,
      }),
    ).toBe("M0");
  });
  it("M1 only when TREND + ≥3R runway (canon §3 Model 1 baseline)", () => {
    expect(
      classifyDayModel({
        fullChainAligned: true, availableRunwayR: 3, regime: "TREND", atRangeEdge: false, clcSufficient: true,
      }),
    ).toBe("M1");
    expect(
      classifyDayModel({
        fullChainAligned: true, availableRunwayR: 2.9, regime: "TREND", atRangeEdge: false, clcSufficient: true,
      }),
    ).toBe("M0"); // insufficient runway falls through to M0
  });
  it("M2 only from a legitimate range edge (canon: middle-of-range guessing is NOT M2)", () => {
    expect(
      classifyDayModel({
        fullChainAligned: true, availableRunwayR: 1, regime: "CHOP", atRangeEdge: true, clcSufficient: true,
      }),
    ).toBe("M2");
    expect(
      classifyDayModel({
        fullChainAligned: true, availableRunwayR: 1, regime: "CHOP", atRangeEdge: false, clcSufficient: true,
      }),
    ).toBe("M0");
  });
});

describe("proofLaneR — cumulative path + labels", () => {
  it("cumulativeRPath produces a running total", () => {
    expect(cumulativeRPath([1, -0.5, 2])).toEqual([1, 0.5, 2.5]);
    expect(cumulativeRPath([])).toEqual([]);
  });
  it("DAY_MODEL_LABELS carry canon-verbatim baselines", () => {
    expect(DAY_MODEL_LABELS.M0.toLowerCase()).toContain("no trade");
    expect(DAY_MODEL_LABELS.M1).toContain("3R baseline");
    expect(DAY_MODEL_LABELS.M2).toContain("1R baseline");
  });
});
