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
import { calculateAvailableR } from "@/lib/riskKernel";

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

  it("charges costs to BOTH sides, as the risk kernel does", () => {
    // UPDATED, WITH THE REASON. This pinned 1.94, which came from
    // (reward - costs) / risk — costs charged only to the reward.
    //
    // A trade that is stopped out loses the stop distance AND the round trip,
    // so the risk denominator carries them too. riskKernel has always said so;
    // this selector had a second copy of the formula that did not.
    //
    //   totalCostPerUnit = (0.05 + 0.05) * 2 + 0.1 = 0.3
    //   OLD  (110 - 100 - 0.3) / 5           = 1.94   <- 6% more edge
    //   NEW  (110 - 100 - 0.3) / (5 + 0.3)   = 1.83
    //
    // The old number was not merely displayed: selectPermission gates entry on
    // conservativeR, so the inflation loosened the capital-protection gate.
    const vm = selectAvailableR({
      side: "LONG",
      entryPrice: 100,
      structuralStop: 95,
      destination: dest(110, 120),
      costs: { halfSpread: 0.05, slippagePerSide: 0.05, feesPerUnit: 0.1 },
    });
    expect(vm.conservativeR).toBeCloseTo(1.83, 2);
    // Cost drag is now a fraction of the SAME denominator the R uses.
    expect(vm.costDragR).toBeCloseTo(0.3 / 5.3, 3);
  });

  it("agrees with the risk kernel exactly — there is one formula now", () => {
    const kernel = calculateAvailableR({
      side: "LONG", entry: 100, structuralStop: 95, barrier: 110,
      pointValue: 1, spreadPoints: 0.1, slippagePoints: 0.1, feesPerUnit: 0.1,
    });
    const vm = selectAvailableR({
      side: "LONG", entryPrice: 100, structuralStop: 95,
      destination: dest(110, 120),
      costs: { halfSpread: 0.05, slippagePerSide: 0.05, feesPerUnit: 0.1 },
    });
    expect(kernel.status).toBe("AVAILABLE");
    // The VM rounds for display; the value underneath is the kernel's.
    expect(vm.conservativeR).toBe(
      kernel.status === "AVAILABLE" ? Number(kernel.value.toFixed(3)) : null,
    );
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

  it("REFUSES when costs consume the reward space — it does not warn and resolve", () => {
    // UPDATED, WITH THE REASON. This pinned a WARNING, which meant the VM came
    // back resolution "RESOLVED" carrying conservativeR -0.8.
    //
    // A resolved negative R is a contradiction: the number says there is no
    // trade here and the resolution says WM worked it out and is confident.
    // §14.1 — an unresolvable state must not settle on the reassuring answer,
    // and "RESOLVED" is the reassuring one. riskKernel has always refused this
    // case outright; the selector's private formula did not.
    //
    // It matters because selectPermission reads conservativeR: a negative
    // number compares as "below threshold" the same way a modest positive one
    // does, so the gate's behaviour depended on a value that should never have
    // been emitted.
    //
    // halfSpread=1 per side, slip=1 per side, fees=0.5 → round-trip cost 4.5
    // against 0.5 of reward space.
    const vm = selectAvailableR({
      side: "LONG",
      entryPrice: 100,
      structuralStop: 95,
      destination: dest(100.5, 120),
      costs: { halfSpread: 1, slippagePerSide: 1, feesPerUnit: 0.5 },
    });
    expect(vm.resolution).toBe("UNKNOWN");
    expect(vm.conservativeR).toBe("UNKNOWN");
    expect(vm.reason).toMatch(/costs consume the available reward space/i);
    // §8: this is a designed boundary, not a failure. No alarm vocabulary.
    expect(vm.reason).not.toMatch(/ERROR|FAILED|INVALID/);
  });
});
