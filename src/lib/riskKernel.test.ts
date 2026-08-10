import { describe, expect, it } from "vitest";
import { calculateAvailableR, calculatePositionSize } from "./riskKernel";

describe("Risk Kernel Available R", () => {
  it("calculates long reward space net of explicit round-trip costs", () => {
    expect(calculateAvailableR({
      side: "LONG", entry: 100, structuralStop: 98, barrier: 106,
      pointValue: 1, spreadPoints: 0.1, slippagePoints: 0.1, feesPerUnit: 0.2,
    })).toMatchObject({
      status: "AVAILABLE", value: 5.6 / 2.4, riskPerUnit: 2.4, netRewardPerUnit: 5.6,
      formulaVersion: "wm.risk-kernel.v1",
    });
  });

  it("uses the same structural geometry for a short thesis", () => {
    expect(calculateAvailableR({
      side: "SHORT", entry: 100, structuralStop: 102, barrier: 94,
      pointValue: 1, spreadPoints: 0, slippagePoints: 0, feesPerUnit: 0,
    })).toMatchObject({ status: "AVAILABLE", value: 3, riskPerUnit: 2, netRewardPerUnit: 6 });
  });

  it("fails closed when costs are missing or geometry is invalid", () => {
    expect(calculateAvailableR({
      side: "LONG", entry: 100, structuralStop: 98, barrier: 106,
      pointValue: 1, spreadPoints: null, slippagePoints: 0, feesPerUnit: 0,
    }).status).toBe("UNKNOWN");
    expect(calculateAvailableR({
      side: "LONG", entry: 100, structuralStop: 101, barrier: 106,
      pointValue: 1, spreadPoints: 0, slippagePoints: 0, feesPerUnit: 0,
    })).toMatchObject({ status: "UNAVAILABLE" });
  });

  it("rejects a target whose reward is consumed by costs", () => {
    expect(calculateAvailableR({
      side: "LONG", entry: 100, structuralStop: 99, barrier: 100.1,
      pointValue: 1, spreadPoints: 0.1, slippagePoints: 0.1, feesPerUnit: 0,
    })).toMatchObject({ status: "UNAVAILABLE" });
  });
});

describe("Risk Kernel position sizing", () => {
  it("rounds down to the permitted quantity step and never exceeds risk", () => {
    expect(calculatePositionSize({ accountRiskBudget: 100, riskPerUnit: 30, quantityStep: 1 })).toEqual({
      status: "AVAILABLE",
      formulaVersion: "wm.risk-kernel.v1",
      quantity: 3,
      riskPerUnit: 30,
      plannedDollarRisk: 90,
      unusedRiskBudget: 10,
    });
  });

  it("fails closed when the minimum quantity exceeds the budget", () => {
    expect(calculatePositionSize({ accountRiskBudget: 10, riskPerUnit: 25, quantityStep: 1 })).toMatchObject({
      status: "UNAVAILABLE",
    });
  });
});
