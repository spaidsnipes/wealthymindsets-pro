import { describe, it, expect } from "vitest";
import {
  WOW_RELEASE_GATES,
  WOW_RELEASE_GATE_BY_KEY,
  evaluateReleaseGates,
  type WowGateResult,
} from "./wowReleaseGates";

/**
 * canon §THE WOW RELEASE GATES (ATHOS Master Manual v2.0) — the eight
 * gates are locked in canon order. Any addition, removal, or renaming
 * requires a canon amendment.
 */
describe("wowReleaseGates — canon §The WOW Release Gates", () => {
  const EXPECTED_ORDER = [
    "PURPOSE",
    "PRODUCT",
    "ENGINEERING",
    "EXPERIENCE",
    "TRUST",
    "CUSTOMER",
    "EVIDENCE",
    "FOUNDER",
  ];

  it("exports exactly eight gates in canon order", () => {
    expect(WOW_RELEASE_GATES.length).toBe(8);
    expect(WOW_RELEASE_GATES.map((g) => g.key)).toEqual(EXPECTED_ORDER);
  });

  it("each gate carries order 1..8 matching canon numbering", () => {
    for (let i = 0; i < WOW_RELEASE_GATES.length; i++) {
      expect(WOW_RELEASE_GATES[i].order).toBe(i + 1);
    }
  });

  it("every gate has a non-empty question + at least one check", () => {
    for (const g of WOW_RELEASE_GATES) {
      expect(g.question.length).toBeGreaterThan(0);
      expect(g.title.length).toBeGreaterThan(0);
      expect(g.checks.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("WOW_RELEASE_GATE_BY_KEY covers all eight keys", () => {
    for (const g of WOW_RELEASE_GATES) {
      expect(WOW_RELEASE_GATE_BY_KEY[g.key]).toBe(g);
    }
  });

  it("collections are frozen (Sentinel lock)", () => {
    expect(Object.isFrozen(WOW_RELEASE_GATES)).toBe(true);
    expect(Object.isFrozen(WOW_RELEASE_GATE_BY_KEY)).toBe(true);
  });
});

describe("evaluateReleaseGates — canon completion contract", () => {
  const passAll: readonly WowGateResult[] = WOW_RELEASE_GATES.map((g) => ({
    key: g.key,
    passed: true,
  }));

  it("returns allPassed=true when every gate passes", () => {
    const r = evaluateReleaseGates(passAll);
    expect(r.allPassed).toBe(true);
    expect(r.firstBlockedGate).toBeNull();
    expect(r.passedCount).toBe(8);
  });

  it("returns firstBlockedGate at the earliest failing gate", () => {
    const results: WowGateResult[] = passAll.map((r, i) =>
      i === 2 ? { ...r, passed: false, notes: "tests failing" } : r,
    );
    const evaluation = evaluateReleaseGates(results);
    expect(evaluation.allPassed).toBe(false);
    expect(evaluation.firstBlockedGate).toBe("ENGINEERING");
    expect(evaluation.passedCount).toBe(7);
  });

  it("treats a missing gate result as blocked (canon: cannot be called complete)", () => {
    // partial = gates 1..5 passed (PURPOSE, PRODUCT, ENGINEERING,
    // EXPERIENCE, TRUST). Gates 6..8 (CUSTOMER, EVIDENCE, FOUNDER)
    // have no result → first blocked is gate 6 CUSTOMER.
    const partial = passAll.slice(0, 5);
    const evaluation = evaluateReleaseGates(partial);
    expect(evaluation.allPassed).toBe(false);
    expect(evaluation.firstBlockedGate).toBe("CUSTOMER");
    expect(evaluation.passedCount).toBe(5);
  });

  it("respects canon order — earliest gate blocks first even if later ones also fail", () => {
    const results: WowGateResult[] = passAll.map((r, i) =>
      i === 3 || i === 6 ? { ...r, passed: false } : r,
    );
    const evaluation = evaluateReleaseGates(results);
    expect(evaluation.firstBlockedGate).toBe("EXPERIENCE"); // gate 4 blocks before gate 7
  });

  it("empty results → first gate blocked", () => {
    const evaluation = evaluateReleaseGates([]);
    expect(evaluation.allPassed).toBe(false);
    expect(evaluation.firstBlockedGate).toBe("PURPOSE");
    expect(evaluation.passedCount).toBe(0);
  });
});
