/**
 * THE ONE ANSWER THIS FILE EXISTS TO MAKE IMPOSSIBLE IS "GO" OVER AN UNPAID
 * ROSTER.
 *
 * Everything else here is secondary. A wrong plaque is embarrassing; a plaque
 * that reads PERMISSION GRANTED while four conditions are owed is the product
 * telling a trader the door is open onto a floor that isn't there.
 */

import { describe, it, expect } from "vitest";

import { selectGoInterlock, type GoCircuits } from "./selectGoInterlock";
import { MARKET_FIDELITIES, readMarketFidelity } from "../marketFidelityAlgebra";
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

/** A paid chain, and the ACTION verdict the compiler emits over it. */
const paidDebt = () => computeEvidenceDebt([node("Direction", "OK"), node("Location", "OK")])!;
const actionDecision = () => computeRightOfWay(perm("ALLOWED"), paidDebt());

/** The one fully-closed intent circuit: executable bars, a broker, a known R. */
const RIPE: GoCircuits = {
  reading: readMarketFidelity(MARKET_FIDELITIES.EXECUTABLE, 1_700_000_000_000)!,
  broker: "CAPABLE",
  availableR: 2.4,
};

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

  it("opens only on ACTION with a measured, closed intent circuit", () => {
    const vm = selectGoInterlock(actionDecision(), paidDebt(), RIPE);
    expect(vm.state).toBe("CLEAR");
    expect(vm.plaque).toBe("PERMISSION GRANTED");
    expect(vm.heldBy).toEqual([]);
    expect(vm.release).toContain(actionDecision().detail);
  });

  /**
   * E-301: "FALSE RIPENESS if STALE plus pretty Clarity."
   *
   * Every case below has a PERFECTLY PAID roster and an ACTION verdict. The
   * evidence lock is genuinely open. What is being proven is that the second
   * lock — the intent circuit — is a real device and not decoration, because a
   * paid ledger is precisely the situation in which the product is most tempted
   * to grant permission it has not established.
   */
  describe("FALSE RIPENESS — a paid ledger is not an executable market", () => {
    it("does not grant over STALE bars, however clean the roster is", () => {
      const vm = selectGoInterlock(actionDecision(), paidDebt(), {
        ...RIPE,
        reading: readMarketFidelity(MARKET_FIDELITIES.STALE, 1_700_000_000_000)!,
      });
      expect(vm.state).toBe("HELD");
      expect(vm.plaque).not.toBe("PERMISSION GRANTED");
      expect(vm.release).toContain("not executable");
    });

    it("does not grant beside an UNVERIFIED broker", () => {
      const vm = selectGoInterlock(actionDecision(), paidDebt(), { ...RIPE, broker: "UNVERIFIED" });
      expect(vm.state).toBe("HELD");
      expect(vm.release).toContain("no broker has answered");
    });

    it("does not grant when no broker was reached at all", () => {
      const vm = selectGoInterlock(actionDecision(), paidDebt(), { ...RIPE, broker: null });
      expect(vm.state).toBe("HELD");
      expect(vm.release).toContain("no broker has answered");
    });

    it("does not grant when the market panel established no fidelity", () => {
      const vm = selectGoInterlock(actionDecision(), paidDebt(), { ...RIPE, reading: null });
      expect(vm.state).toBe("HELD");
      expect(vm.release).toContain("has not established a fidelity");
    });

    it("does not grant on unknown R — unknown R is not zero R", () => {
      const vm = selectGoInterlock(actionDecision(), paidDebt(), { ...RIPE, availableR: null });
      expect(vm.state).toBe("HELD");
      expect(vm.release).toContain("unknown R is not zero R");
    });

    it("NEVER SENDS THE TRADER TO PAY A LEDGER THAT IS ALREADY EMPTY", () => {
      // The cruellest possible plaque: "conditions are owed" over a roster of
      // ticks. Whatever holds an intent circuit, chips do not pay it off.
      const vm = selectGoInterlock(actionDecision(), paidDebt(), { ...RIPE, broker: "UNVERIFIED" });
      expect(vm.heldBy).toEqual([]);
      expect(vm.release).toContain("Every evidence condition is paid");
      expect(vm.release).toContain("two separate locks");
    });

    it("an UNMEASURED intent circuit reads NOT EVALUATED, and never GRANTED", () => {
      // The absence of a measurement is not a passing one. This is the exact
      // defect the third parameter was added to close: the first draft of this
      // selector granted permission from the verdict alone.
      const vm = selectGoInterlock(actionDecision(), paidDebt());
      expect(vm.state).toBe("NOT_EVALUATED");
      expect(vm.plaque).toBe("PERMISSION NOT EVALUATED");
      expect(vm.verdict).toBe("ACTION");
      expect(vm.release).toContain("paid is not the same as ripe");
      // Not HELD either — WM is not entitled to name a lock it never inspected.
      expect(vm.state).not.toBe("HELD");
    });
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
