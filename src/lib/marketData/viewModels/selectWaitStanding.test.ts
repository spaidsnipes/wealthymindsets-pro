/**
 * "NO ACTION REQUIRED" IS THE MOST DANGEROUS SENTENCE THIS PRODUCT CAN PRINT.
 *
 * It tells a human to stand down. Printed over a chain with payable evidence
 * on it, it tells them to stand down in front of work only they can do — and it
 * typechecks, renders beautifully, and nothing throws. Every test in this file
 * exists to make that specific wrong answer fail here first.
 */

import { describe, it, expect } from "vitest";

import { selectWaitStanding } from "./selectWaitStanding";
import { computeEvidenceDebt } from "./decisionPermissionCompiler";
import type { EvidenceDebt, RightOfWayReading } from "./decisionPermissionCompiler";
import type { DecisionChainNode } from "./selectDecisionChain";

const WAIT: RightOfWayReading = { value: "WAIT", detail: "evidence debt", tone: "warn" };

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

const node = (
  label: string,
  indicator: DecisionChainNode["indicator"],
  extra: Partial<DecisionChainNode> = {},
): DecisionChainNode => ({
  key: label.toLowerCase(),
  label,
  verdict: indicator === "OK" ? "RESOLVED" : "UNRESOLVED",
  resolution: "RESOLVED",
  narrative: "test",
  indicator,
  ...extra,
});

describe("selectWaitStanding", () => {
  it("never calls a wait finished while something is payable", () => {
    const vm = selectWaitStanding(WAIT, debt({ payable: 4, missing: 4, missingPayable: 2 }))!;
    expect(vm.standing).toBe("WORKABLE");
    expect(vm.detail).toContain("not finished");
    expect(vm.detail).not.toContain("No action required");
  });

  it("calls a wait finished only when no act of this trader shortens it", () => {
    // Four outstanding, none payable, none venue-blocked: every remainder is a
    // composition, which resolves when its inputs do and never by being worked
    // on. There is genuinely nothing to do.
    const vm = selectWaitStanding(WAIT, debt({ payable: 4, missing: 4, missingPayable: 0 }))!;
    expect(vm.standing).toBe("FINISHED");
    expect(vm.detail).toContain("No action required");
  });

  it("does not call a venue-blocked wait finished — that wait has no expiry", () => {
    // The compiler's own doc: telling a trader to wait for something the venue
    // cannot supply "is a lie with no expiry date". There IS an act; it is just
    // not the act a finished wait implies.
    const vm = selectWaitStanding(
      WAIT,
      debt({ payable: 3, missing: 3, missingPayable: 0, venueBlocked: 3 }),
    )!;
    expect(vm.standing).toBe("VENUE_BLOCKED");
    expect(vm.detail).not.toContain("No action required");
    expect(vm.detail).toContain("changing feed");
  });

  it("prefers the workable answer when a chain holds both kinds", () => {
    // A payable node and a blocked node together: the trader has work. Leading
    // with the blockage would excuse the wait using the one node they cannot
    // touch while a node they can touch sits unpaid.
    const vm = selectWaitStanding(
      WAIT,
      debt({ payable: 4, missing: 4, missingPayable: 1, venueBlocked: 2 }),
    )!;
    expect(vm.standing).toBe("WORKABLE");
  });

  it("says nothing for a wait with no ledger — silence is not completion", () => {
    expect(selectWaitStanding(WAIT, null)).toBeNull();
  });

  it("refuses every verdict that is not WAIT", () => {
    const clear = debt({ payable: 3, resolved: 3 });
    for (const value of ["ACTION", "NO TRADE", "CAUTION", "UNKNOWN"] as const) {
      expect(selectWaitStanding({ value, detail: "x", tone: "pending" }, clear)).toBeNull();
    }
    expect(selectWaitStanding(null, clear)).toBeNull();
  });

  it("counts from the authoritative count, never a truncated label array", () => {
    // The label arrays cap at 3. A headline built from `.length` would say
    // "3 TO RESOLVE" over a chain owing seven.
    const many: DecisionChainNode[] = Array.from({ length: 7 }, (_, i) =>
      node(`Node ${i}`, "UNKNOWN", { payableBy: "EVIDENCE" }),
    );
    const computed = computeEvidenceDebt(many)!;
    const vm = selectWaitStanding(WAIT, computed)!;
    expect(computed.missingPayableLabels.length).toBeLessThan(7);
    expect(vm.payable).toBe(7);
    expect(vm.headline).toBe("7 TO RESOLVE");
  });

  it("reads a real chain end to end rather than a hand-built fixture", () => {
    // An unasserted node is not payable — so a chain of pure compositions is a
    // finished wait, and the same chain with ONE declarable node is not.
    const compositions = [node("Regime", "UNKNOWN"), node("Bias", "UNKNOWN")];
    expect(selectWaitStanding(WAIT, computeEvidenceDebt(compositions))!.standing).toBe("FINISHED");

    const withWork = [...compositions, node("Entry", "UNKNOWN", { payableBy: "DECLARATION" })];
    const vm = selectWaitStanding(WAIT, computeEvidenceDebt(withWork))!;
    expect(vm.standing).toBe("WORKABLE");
    expect(vm.payable).toBe(1);
  });

  it("uses singular English for one condition", () => {
    const vm = selectWaitStanding(WAIT, debt({ payable: 1, missing: 1, missingPayable: 1 }))!;
    expect(vm.detail).toContain("1 outstanding condition can be paid");
  });
});
