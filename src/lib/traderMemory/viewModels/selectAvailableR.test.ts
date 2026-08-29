/**
 * selectAvailableR — truth-lock for the M29 Available-R selector.
 * This selector answers "what clean reward exists relative to
 * structural risk?" and the Founder doctrine is stern:
 *   - Stop is an INPUT, never an output.
 *   - Never shrink stop to manufacture prettier R.
 *   - UNKNOWN when inputs are incomplete.
 *
 * Silent drift here would silently change every /command-deck decision
 * chain's Available-R node.
 */

import { describe, it, expect } from "vitest";
import {
  selectAvailableR,
  type DestinationRegion,
} from "./selectAvailableR";

function dest(low: number, high: number, confidence: DestinationRegion["confidence"] = "HIGH"): DestinationRegion {
  return { low, high, basis: "test-region", confidence };
}

describe("selectAvailableR — M29 Available-R selector truth-lock", () => {
  it("UNKNOWN when entryPrice is missing", () => {
    const vm = selectAvailableR({
      side: "LONG",
      entryPrice: null,
      structuralStop: 95,
      destination: dest(110, 120),
    });
    expect(vm.resolution).toBe("UNKNOWN");
    expect(vm.conservativeR).toBe("UNKNOWN");
    expect(vm.missingInputs).toContain("entryPrice");
    expect(vm.reason).toMatch(/Stop is an INPUT/);
  });

  it("UNKNOWN when structuralStop is missing", () => {
    const vm = selectAvailableR({
      side: "LONG",
      entryPrice: 100,
      structuralStop: null,
      destination: dest(110, 120),
    });
    expect(vm.resolution).toBe("UNKNOWN");
    expect(vm.missingInputs).toContain("structuralStop");
  });

  it("UNKNOWN when destination is missing", () => {
    const vm = selectAvailableR({
      side: "LONG",
      entryPrice: 100,
      structuralStop: 95,
      destination: null,
    });
    expect(vm.resolution).toBe("UNKNOWN");
    expect(vm.missingInputs).toContain("destination");
  });

  it("UNKNOWN when structuralStop equals entry (zero risk distance)", () => {
    const vm = selectAvailableR({
      side: "LONG",
      entryPrice: 100,
      structuralStop: 100,
      destination: dest(110, 120),
    });
    expect(vm.resolution).toBe("UNKNOWN");
    expect(vm.reason).toMatch(/no measurable risk distance/i);
  });

  it("UNKNOWN when stop is on the wrong side of entry for a LONG", () => {
    const vm = selectAvailableR({
      side: "LONG",
      entryPrice: 100,
      structuralStop: 105, // above entry for a long — nonsensical
      destination: dest(110, 120),
    });
    expect(vm.resolution).toBe("UNKNOWN");
    expect(vm.reason).toMatch(/wrong side of entry/i);
  });

  it("UNKNOWN when stop is on the wrong side of entry for a SHORT", () => {
    const vm = selectAvailableR({
      side: "SHORT",
      entryPrice: 100,
      structuralStop: 95, // below entry for a short — nonsensical
      destination: dest(85, 90),
    });
    expect(vm.resolution).toBe("UNKNOWN");
  });

  it("UNKNOWN when destination is not ahead of entry for a LONG", () => {
    const vm = selectAvailableR({
      side: "LONG",
      entryPrice: 100,
      structuralStop: 95,
      destination: dest(80, 90), // below entry for a long
    });
    expect(vm.resolution).toBe("UNKNOWN");
    expect(vm.reason).toMatch(/not ahead of entry/i);
  });

  it("computes conservative + optimistic R using near/far edges of destination (LONG)", () => {
    const vm = selectAvailableR({
      side: "LONG",
      entryPrice: 100,
      structuralStop: 95,     // risk = 5
      destination: dest(110, 120),
      costs: { halfSpread: 0, slippagePerSide: 0, feesPerUnit: 0 },
    });
    // conservativeR = (110 - 100) / 5 = 2
    // optimisticR   = (120 - 100) / 5 = 4
    expect(vm.conservativeR).toBeCloseTo(2);
    expect(vm.optimisticR).toBeCloseTo(4);
    expect(vm.riskPerUnit).toBeCloseTo(5);
  });

  it("computes R for SHORT with dest below entry (near = high, far = low)", () => {
    const vm = selectAvailableR({
      side: "SHORT",
      entryPrice: 100,
      structuralStop: 105,    // risk = 5
      destination: dest(85, 90), // high=90 is near, low=85 is far
      costs: { halfSpread: 0, slippagePerSide: 0, feesPerUnit: 0 },
    });
    // conservative = |90 - 100| / 5 = 2
    // optimistic   = |85 - 100| / 5 = 3
    expect(vm.conservativeR).toBeCloseTo(2);
    expect(vm.optimisticR).toBeCloseTo(3);
  });

  it("subtracts cost drag from R when costs are known", () => {
    // halfSpread=0.05 per side, slip=0.05 per side, fees=0.1 per unit
    // totalCostPerUnit = (0.05 + 0.05) * 2 + 0.1 = 0.3
    // conservativeR = (110 - 100 - 0.3) / 5 = 9.7 / 5 = 1.94
    const vm = selectAvailableR({
      side: "LONG",
      entryPrice: 100,
      structuralStop: 95,
      destination: dest(110, 120),
      costs: { halfSpread: 0.05, slippagePerSide: 0.05, feesPerUnit: 0.1 },
    });
    expect(vm.conservativeR).toBeCloseTo(1.94);
    expect(vm.costDragR).toBeCloseTo(0.06); // 0.3 / 5
  });

  it("warns when costs are unknown (R shown gross of spread/slippage/fees)", () => {
    const vm = selectAvailableR({
      side: "LONG",
      entryPrice: 100,
      structuralStop: 95,
      destination: dest(110, 120),
      // no costs
    });
    expect(vm.warnings.some((w) => /cost assumptions incomplete/i.test(w))).toBe(true);
    expect(vm.costDragR).toBe("UNKNOWN");
  });

  it("resolution=RESOLVED only when costs known AND destination confidence=HIGH", () => {
    const resolved = selectAvailableR({
      side: "LONG",
      entryPrice: 100,
      structuralStop: 95,
      destination: dest(110, 120, "HIGH"),
      costs: { halfSpread: 0.05, slippagePerSide: 0.05, feesPerUnit: 0.1 },
    });
    expect(resolved.resolution).toBe("RESOLVED");

    const partialCosts = selectAvailableR({
      side: "LONG",
      entryPrice: 100,
      structuralStop: 95,
      destination: dest(110, 120, "HIGH"),
      // no costs → PARTIAL
    });
    expect(partialCosts.resolution).toBe("PARTIAL");

    const partialConfidence = selectAvailableR({
      side: "LONG",
      entryPrice: 100,
      structuralStop: 95,
      destination: dest(110, 120, "MEDIUM"),
      costs: { halfSpread: 0.05, slippagePerSide: 0.05, feesPerUnit: 0.1 },
    });
    expect(partialConfidence.resolution).toBe("PARTIAL");
  });

  it("warns when destination confidence is LOW", () => {
    const vm = selectAvailableR({
      side: "LONG",
      entryPrice: 100,
      structuralStop: 95,
      destination: dest(110, 120, "LOW"),
      costs: { halfSpread: 0.05, slippagePerSide: 0.05, feesPerUnit: 0.1 },
    });
    expect(vm.warnings.some((w) => /confidence LOW/i.test(w))).toBe(true);
  });

  it("warns when conservative R is non-positive after costs (near edge doesn't clear cost floor)", () => {
    // halfSpread=1 per side, slip=1 per side, fees=0.5 → totalCost = 4.5
    // conservative = (100.5 - 100 - 4.5) / 5 = -4 / 5 = -0.8 (non-positive)
    const vm = selectAvailableR({
      side: "LONG",
      entryPrice: 100,
      structuralStop: 95,
      destination: dest(100.5, 120),
      costs: { halfSpread: 1, slippagePerSide: 1, feesPerUnit: 0.5 },
    });
    expect(vm.warnings.some((w) => /Conservative R is non-positive/i.test(w))).toBe(true);
  });
});
