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
    missingPayableLabels: [],
    missingPayable: 0,
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

/**
 * NAMES ARE CARRIED, NEVER INVENTED.
 *
 * The bar spent its whole life refusing identity because its input had none.
 * Now that the input has names, two failures become possible that were not
 * possible before: a name attached to the wrong standing, and a name conjured
 * for a node the roll never described. Both are tested here.
 */
describe("selectEvidenceLadder — named ledger (canon 123 first-class conditions)", () => {
  const roll = [
    { key: "direction", label: "Direction", standing: "RESOLVED" as const, payableNow: false, venueBlocked: false },
    { key: "location", label: "Location", standing: "RESOLVED" as const, payableNow: false, venueBlocked: false },
    { key: "regime", label: "Regime", standing: "WARN" as const, payableNow: false, venueBlocked: false },
    { key: "aggression", label: "Aggression", standing: "MISSING" as const, payableNow: true, venueBlocked: false },
    { key: "clc", label: "CLC", standing: "MISSING" as const, payableNow: false, venueBlocked: false },
    { key: "depth", label: "Depth", standing: "WATCH" as const, payableNow: false, venueBlocked: false },
  ];
  const named = debt({ payable: 5, resolved: 2, warn: 1, missing: 2, watch: 1, roll });

  it("names every segment, so no owed condition is anonymous", () => {
    const ladder = selectEvidenceLadder(named)!;
    expect(ladder.segments.map((s) => s.label)).toEqual([
      "Direction",
      "Location",
      "Regime",
      "Aggression",
      "CLC",
    ]);
    expect(ladder.watch.map((s) => s.label)).toEqual(["Depth"]);
  });

  it("keeps each name with its own standing", () => {
    const ladder = selectEvidenceLadder(named)!;
    const byLabel = new Map(ladder.segments.map((s) => [s.label, s.state]));
    expect(byLabel.get("Direction")).toBe("RESOLVED");
    expect(byLabel.get("Regime")).toBe("WARN");
    expect(byLabel.get("CLC")).toBe("MISSING");
  });

  it("carries payableNow only on outstanding nodes, and only where the roll says so", () => {
    const ladder = selectEvidenceLadder(named)!;
    const byLabel = new Map(ladder.segments.map((s) => [s.label, s.payableNow]));
    expect(byLabel.get("Aggression")).toBe(true);
    expect(byLabel.get("CLC")).toBe(false);
    // Not an outstanding node — the field must not appear at all rather than
    // appear as `false`, which would read as "settled but unpayable".
    expect(byLabel.get("Direction")).toBeUndefined();
  });

  it("still marks exactly one next, and it is the first outstanding node", () => {
    const ladder = selectEvidenceLadder(named)!;
    const marked = ladder.segments.filter((s) => s.isNext);
    expect(marked).toHaveLength(1);
    expect(marked[0].label).toBe("Aggression");
  });

  it("invents no name when the debt carries no roll", () => {
    // The pre-existing anonymous behaviour is the correct answer to an input
    // with no identity in it — not a bug to paper over with a placeholder.
    const ladder = selectEvidenceLadder(debt({ payable: 3, missing: 3 }))!;
    expect(ladder.segments.every((s) => s.label === undefined)).toBe(true);
  });

  it("falls back to anonymous rather than draw a roll that disagrees with the counts", () => {
    // A roll short of the count would otherwise name three of four owed nodes
    // and leave the fourth as a silent blank — the same invisible gap the
    // `payable` rename exists to end. The bar and the sentence must be one
    // ledger or the bar says nothing.
    const ladder = selectEvidenceLadder(
      debt({ payable: 4, missing: 4, roll: roll.filter((e) => e.standing === "MISSING") }),
    )!;
    expect(ladder.segments).toHaveLength(4);
    expect(ladder.segments.every((s) => s.label === undefined)).toBe(true);
  });
});
