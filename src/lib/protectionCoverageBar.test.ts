/**
 * THE BAR MAY NEVER LOOK SAFER THAN THE COUNTS.
 */

import { describe, expect, it } from "vitest";

import { selectProtectionCoverageBar } from "./protectionCoverageBar";
import { selectProtectionState } from "./protectionState";

describe("selectProtectionCoverageBar", () => {
  it("draws nothing when nothing is held", () => {
    expect(selectProtectionCoverageBar(null)).toBeNull();
    // FLAT: an empty track would read as "nothing is covered" rather than
    // "nothing is held", and those are opposite facts.
    const flat = selectProtectionState({ filledQty: 0, brokerAckedProtectedQty: 0 });
    expect(selectProtectionCoverageBar(flat)).toBeNull();
  });

  it("splits the filled size into covered and uncovered shares", () => {
    const state = selectProtectionState({ filledQty: 4, brokerAckedProtectedQty: 3 });
    const bar = selectProtectionCoverageBar(state)!;
    expect(bar.protectedPct).toBeCloseTo(75);
    expect(bar.uncoveredPct).toBeCloseTo(25);
    expect(bar.positionQty).toBe(4);
    expect(bar.uncoveredQty).toBe(1);
  });

  it("always has the two shares sum to the whole — no unowned gap", () => {
    for (const [filled, prot] of [[3, 1], [7, 2], [9, 8], [11, 11], [5, 0]] as const) {
      const bar = selectProtectionCoverageBar(
        selectProtectionState({ filledQty: filled, brokerAckedProtectedQty: prot }),
      )!;
      expect(bar.protectedPct + bar.uncoveredPct).toBeCloseTo(100);
    }
  });

  it("draws a wholly uncovered position as fully uncovered", () => {
    const bar = selectProtectionCoverageBar(
      selectProtectionState({ filledQty: 5, brokerAckedProtectedQty: 0 }),
    )!;
    expect(bar.uncoveredPct).toBeCloseTo(100);
    expect(bar.protectedPct).toBe(0);
  });

  it("cannot render over-covered even when the input claims it", () => {
    // Reconciliation lag reporting more protection than position is the
    // reassuring direction, so the state clamps it — and the bar inherits that.
    const bar = selectProtectionCoverageBar(
      selectProtectionState({ filledQty: 2, brokerAckedProtectedQty: 9 }),
    )!;
    expect(bar.protectedPct).toBeLessThanOrEqual(100);
    expect(bar.uncoveredPct).toBeGreaterThanOrEqual(0);
  });

  it("marks a read that failed this cycle rather than smoothing over it", () => {
    const state = selectProtectionState({
      filledQty: 3,
      brokerAckedProtectedQty: 3,
      brokerStateUnverified: true,
    });
    expect(state.grade).toBe("UNVERIFIED — LAST KNOWN");
    expect(selectProtectionCoverageBar(state)!.stale).toBe(true);

    const fresh = selectProtectionState({ filledQty: 3, brokerAckedProtectedQty: 3 });
    expect(selectProtectionCoverageBar(fresh)!.stale).toBe(false);
  });
});
