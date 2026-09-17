/**
 * A BAR THAT DRAWS "UNKNOWN" AS FLAT HAS TOLD A LIE WITH GEOMETRY.
 *
 * Most of these tests are about refusal: the cases where the honest output is
 * no picture at all.
 */

import { describe, expect, it } from "vitest";

import { selectRiskReachBar } from "./selectRiskReachBar";
import type { AvailableRVM } from "./selectAvailableR";

function vm(partial: Partial<AvailableRVM>): AvailableRVM {
  return {
    resolution: "RESOLVED",
    conservativeR: "UNKNOWN",
    optimisticR: "UNKNOWN",
    riskPerUnit: "UNKNOWN",
    costDragR: "UNKNOWN",
    destination: null,
    missingInputs: [],
    warnings: [],
    ...partial,
  } as AvailableRVM;
}

describe("selectRiskReachBar", () => {
  it("refuses to draw when the conservative figure is UNKNOWN", () => {
    expect(selectRiskReachBar(null)).toBeNull();
    expect(selectRiskReachBar(vm({}))).toBeNull();
    // Not zero. Not flat. Nothing.
    expect(selectRiskReachBar(vm({ optimisticR: 3, costDragR: 0.2 }))).toBeNull();
  });

  it("draws reward wider than risk when R exceeds 1", () => {
    const bar = selectRiskReachBar(vm({ conservativeR: 3, riskPerUnit: 1.5 }))!;
    expect(bar.conservativePct).toBeGreaterThan(bar.riskPct);
    // 1 risk unit + 3 reward units = 4; risk is a quarter of the axis.
    expect(bar.riskPct).toBeCloseTo(25);
    expect(bar.conservativePct).toBeCloseTo(75);
  });

  it("does not let a sub-1R setup swallow the axis with its risk block", () => {
    const bar = selectRiskReachBar(vm({ conservativeR: 0.2 }))!;
    // Axis floors reward at 1R, so risk stays at half rather than 83%.
    expect(bar.riskPct).toBeCloseTo(50);
    expect(bar.conservativePct).toBeCloseTo(10);
  });

  it("flags an adverse destination instead of drawing negative reach", () => {
    const bar = selectRiskReachBar(vm({ conservativeR: -0.8 }))!;
    expect(bar.adverse).toBe(true);
    expect(bar.conservativePct).toBe(0);
    expect(bar.conservativeR).toBe(-0.8);
  });

  it("draws the optimistic figure as an extension, not a second full span", () => {
    const bar = selectRiskReachBar(vm({ conservativeR: 2, optimisticR: 4 }))!;
    // Axis = 1 + 4 = 5. Conservative 2/5, extension (4-2)/5.
    expect(bar.conservativePct).toBeCloseTo(40);
    expect(bar.optimisticPct).toBeCloseTo(40);
  });

  it("omits the optimistic extension when it does not exceed the conservative reach", () => {
    expect(selectRiskReachBar(vm({ conservativeR: 2, optimisticR: 2 }))!.optimisticPct).toBeNull();
    expect(selectRiskReachBar(vm({ conservativeR: 2 }))!.optimisticPct).toBeNull();
  });

  it("never lets cost drag eat more than the reach it is deducted from", () => {
    const bar = selectRiskReachBar(vm({ conservativeR: 1, costDragR: 9 }))!;
    expect(bar.costDragPct).toBeLessThanOrEqual(bar.conservativePct);
  });

  it("omits cost drag when it is UNKNOWN or zero", () => {
    expect(selectRiskReachBar(vm({ conservativeR: 2 }))!.costDragPct).toBeNull();
    expect(selectRiskReachBar(vm({ conservativeR: 2, costDragR: 0 }))!.costDragPct).toBeNull();
  });
});
