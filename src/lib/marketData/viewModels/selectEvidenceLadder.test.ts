/**
 * THE BAR AND THE SENTENCE MUST BE THE SAME LEDGER.
 *
 * Every test here exists to stop one specific way a drawn ledger can start
 * lying while still looking correct: a denominator that shrinks when evidence
 * goes missing, a WATCH node smuggled into the bar, or a "next" marker that
 * points at more than one thing.
 */

import { describe, expect, it } from "vitest";

import { selectEvidenceLadder } from "./selectEvidenceLadder";
import type { EvidenceDebt } from "./decisionPermissionCompiler";

function debt(partial: Partial<EvidenceDebt>): EvidenceDebt {
  return {
    payable: 0,
    watch: 0,
    resolved: 0,
    missing: 0,
    warn: 0,
    missingLabels: [],
    warnLabels: [],
    ...partial,
  };
}

describe("selectEvidenceLadder", () => {
  it("draws nothing when there is no ledger to draw", () => {
    expect(selectEvidenceLadder(null)).toBeNull();
    expect(selectEvidenceLadder(debt({}))).toBeNull();
  });

  it("emits exactly one segment per payable node — the bar's width IS the denominator", () => {
    const ladder = selectEvidenceLadder(
      debt({ payable: 9, resolved: 2, warn: 1, missing: 6 }),
    );
    expect(ladder).not.toBeNull();
    expect(ladder!.segments).toHaveLength(9);
    expect(ladder!.payable).toBe(9);
  });

  it("does not shrink its denominator as evidence goes missing", () => {
    // 0 paid of 9 must still draw nine segments. A bar that drew only the
    // paid ones would render an empty ledger and a complete one identically.
    const ladder = selectEvidenceLadder(debt({ payable: 9, missing: 9 }));
    expect(ladder!.segments).toHaveLength(9);
    expect(ladder!.segments.every((s) => s.state === "MISSING")).toBe(true);
  });

  it("keeps WATCH nodes out of the ledger bar entirely", () => {
    // The live defect this guards: "0 of 9 paid" over "8 unpaid" — the ninth
    // node was a WATCH node sitting in a denominator it could never enter.
    const ladder = selectEvidenceLadder(
      debt({ payable: 8, watch: 1, resolved: 0, missing: 8 }),
    );
    expect(ladder!.segments).toHaveLength(8);
    expect(ladder!.segments.some((s) => s.state === "WATCH")).toBe(false);
    expect(ladder!.watch).toHaveLength(1);
  });

  it("marks at most one segment as the next thing, and only a missing one", () => {
    const ladder = selectEvidenceLadder(
      debt({ payable: 9, resolved: 2, warn: 1, missing: 6 }),
    );
    const marked = ladder!.segments.filter((s) => s.isNext);
    expect(marked).toHaveLength(1);
    expect(marked[0].state).toBe("MISSING");
  });

  it("names no next evidence when nothing is outstanding", () => {
    const ladder = selectEvidenceLadder(debt({ payable: 4, resolved: 4 }));
    expect(ladder!.segments.some((s) => s.isNext)).toBe(false);
  });

  it("draws a WATCH-only chain rather than vanishing", () => {
    const ladder = selectEvidenceLadder(debt({ payable: 0, watch: 3 }));
    expect(ladder!.segments).toHaveLength(0);
    expect(ladder!.watch).toHaveLength(3);
  });

  it("orders the ledger settled → flagged → outstanding", () => {
    const ladder = selectEvidenceLadder(
      debt({ payable: 4, resolved: 2, warn: 1, missing: 1 }),
    );
    expect(ladder!.segments.map((s) => s.state)).toEqual([
      "RESOLVED",
      "RESOLVED",
      "WARN",
      "MISSING",
    ]);
  });
});
