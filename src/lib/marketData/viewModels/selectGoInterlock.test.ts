/**
 * THE ONE ANSWER THIS FILE EXISTS TO MAKE IMPOSSIBLE IS "GO" OVER AN UNPAID
 * ROSTER.
 *
 * Everything else here is secondary. A wrong plaque is embarrassing; a plaque
 * that reads PERMISSION GRANTED while four conditions are owed is the product
 * telling a trader the door is open onto a floor that isn't there.
 */

import { describe, it, expect } from "vitest";

import { selectGoInterlock } from "./selectGoInterlock";
import { computeEvidenceDebt, computeRightOfWay } from "./decisionPermissionCompiler";
import type { EvidenceDebt, RightOfWayReading } from "./decisionPermissionCompiler";
import type { DecisionChainNode } from "./selectDecisionChain";
import type { PermissionVM } from "@/lib/traderMemory/viewModels/selectPermission";

const reading = (value: RightOfWayReading["value"], detail = "because"): RightOfWayReading => ({
  value,
  detail,
  tone: value === "ACTION" ? "resolved" : "warn",
});

const perm = (verdict: PermissionVM["verdict"], reason?: string): PermissionVM =>
  ({ verdict, ...(reason ? { reason } : {}) }) as PermissionVM;

const node = (
  label: string,
  indicator: DecisionChainNode["indicator"],
  extra: Partial<DecisionChainNode> = {},
): DecisionChainNode => ({
  key: label.toLowerCase().replace(/\s+/g, "-"),
  label,
  verdict: indicator === "OK" ? "RESOLVED" : "UNRESOLVED",
  resolution: "RESOLVED",
  narrative: "test",
  indicator,
  ...extra,
});

/** The live /charts shape: three settled, four owed. */
const LIVE_CHAIN: DecisionChainNode[] = [
  node("Direction", "OK"),
  node("Location", "OK"),
  node("Available R", "OK"),
  node("Aggression", "UNKNOWN", { payableBy: "EVIDENCE" }),
  node("CLC", "UNKNOWN", { payableBy: "DECLARATION" }),
  node("Absorption", "UNKNOWN"),
  node("Regime", "UNKNOWN"),
];

describe("selectGoInterlock", () => {
  it("names EVERY owed condition holding the lock, not the capped sample", () => {
    const debt = computeEvidenceDebt(LIVE_CHAIN)!;
    const vm = selectGoInterlock(reading("WAIT"), debt);

    expect(vm.state).toBe("HELD");
    expect(vm.plaque).toBe("PERMISSION WITHHELD");
    // The sample array cannot reach all four — that was the original defect.
    expect(debt.missingLabels.length).toBeLessThan(debt.missing);
    expect(vm.heldBy).toEqual(["Aggression", "CLC", "Absorption", "Regime"]);
  });

  it("names none rather than some when the roll disagrees with the count", () => {
    // Two ledgers is worse than one anonymous one. A trader who pays the three
    // named conditions and finds the door still shut stops believing the plaque.
    const debt = computeEvidenceDebt(LIVE_CHAIN)!;
    const tampered: EvidenceDebt = {
      ...debt,
      roll: debt.roll!.filter((e) => e.label !== "Regime"),
    };
    const vm = selectGoInterlock(reading("WAIT"), tampered);
    expect(vm.state).toBe("HELD");
    expect(vm.heldBy).toEqual([]);
    // The SIZE of the debt survives even when the names do not.
    expect(vm.release).toContain("4 outstanding conditions");
  });

  it("never promises entry — paying the roster removes a block, nothing more", () => {
    const vm = selectGoInterlock(reading("WAIT"), computeEvidenceDebt(LIVE_CHAIN));
    expect(vm.release).toContain("does not authorise entry");
    expect(vm.release).not.toMatch(/allows? entry|you may enter|clear to trade/i);
  });

  it("does not send the trader to pay a debt when a RULE is what holds the door", () => {
    const vm = selectGoInterlock(reading("NO TRADE", "daily loss limit"), computeEvidenceDebt(LIVE_CHAIN));
    expect(vm.state).toBe("HELD");
    expect(vm.heldBy).toEqual([]);
    expect(vm.release).toContain("No evidence pays this off");
  });

  it("treats CAUTION as held, and flagged evidence as observed rather than owed", () => {
    const vm = selectGoInterlock(reading("CAUTION", "1 watch node"), null);
    expect(vm.state).toBe("HELD");
    expect(vm.heldBy).toEqual([]);
    expect(vm.release).toContain("observed, not owed");
  });

  it("separates 'never looked' from 'looked and four are owed'", () => {
    const unknown = selectGoInterlock(reading("UNKNOWN", "required evidence not evaluated"), null);
    expect(unknown.state).toBe("NOT_EVALUATED");
    expect(unknown.plaque).toBe("PERMISSION NOT EVALUATED");
    expect(unknown.heldBy).toEqual([]);
    // Crucially: not CLEAR. An unevaluated chain must never read as a paid one.
    expect(unknown.state).not.toBe("CLEAR");
  });

  it("says nothing was opened when no reading was compiled at all", () => {
    const vm = selectGoInterlock(null, computeEvidenceDebt(LIVE_CHAIN));
    expect(vm.state).toBe("NOT_EVALUATED");
    expect(vm.verdict).toBeNull();
    expect(vm.heldBy).toEqual([]);
  });

  it("opens only on ACTION, and echoes the compiler's own reason", () => {
    const clean = [node("Direction", "OK"), node("Location", "OK")];
    const debt = computeEvidenceDebt(clean)!;
    const decision = computeRightOfWay(perm("ALLOWED"), debt);
    expect(decision.value).toBe("ACTION");

    const vm = selectGoInterlock(decision, debt);
    expect(vm.state).toBe("CLEAR");
    expect(vm.plaque).toBe("PERMISSION GRANTED");
    expect(vm.heldBy).toEqual([]);
    expect(vm.release).toContain(decision.detail);
  });

  it("uses singular English for a lock of one", () => {
    const one = [node("Direction", "OK"), node("CLC", "UNKNOWN", { payableBy: "DECLARATION" })];
    const vm = selectGoInterlock(reading("WAIT"), computeEvidenceDebt(one));
    expect(vm.heldBy).toEqual(["CLC"]);
    expect(vm.release).toContain("CLC is owed");
  });

  it("admits it cannot name the release when a WAIT carries no owed condition", () => {
    // WAIT with an empty ledger should not invent a roster to explain itself.
    const vm = selectGoInterlock(reading("WAIT"), null);
    expect(vm.state).toBe("HELD");
    expect(vm.heldBy).toEqual([]);
    expect(vm.release).toContain("cannot name what would release it");
  });

  it("draws the lock from the SAME roll the chips are drawn from", () => {
    // Not a restatement of test 1: this asserts the two surfaces share one
    // source, which is the only reason they can never disagree.
    const debt = computeEvidenceDebt(LIVE_CHAIN)!;
    const fromRoll = debt.roll!.filter((e) => e.standing === "MISSING").map((e) => e.label);
    expect(selectGoInterlock(reading("WAIT"), debt).heldBy).toEqual(fromRoll);
  });
});
