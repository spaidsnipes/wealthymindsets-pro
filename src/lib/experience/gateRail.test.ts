/**
 * "WAIT FINISHED — EVIDENCE DEBT REMAINS."
 *
 * One line in the mockup, two facts, and the tests keep them apart.
 */

import { describe, expect, it } from "vitest";

import * as railModule from "./gateRail";
import {
  buildGateRail,
  checkRailWasAsked,
  GATE_RAIL_ORDER,
  unaskedGates,
  waitVerdict,
  type GateName,
} from "./gateRail";

const allAnswered = (): Partial<Record<GateName, boolean>> =>
  Object.fromEntries(GATE_RAIL_ORDER.map((g) => [g, true]));

describe("one rail, fixed order", () => {
  it("KEEPS THE RUNGS IN THE MOCKUP'S ORDER, ALWAYS", () => {
    // Position is meaning on a rail read every session. A rail that sorted
    // itself — unanswered first, say — would be more useful on any single
    // glance and unlearnable across a thousand of them.
    const scrambled = buildGateRail({ AVAILABLE_R: true, REGIME: false, CLC: true });
    expect(scrambled.rungs.map((r) => r.gate)).toEqual([...GATE_RAIL_ORDER]);
  });

  it("carries every gate on every rail — none is dropped for being clean", () => {
    expect(buildGateRail(allAnswered()).rungs).toHaveLength(GATE_RAIL_ORDER.length);
    expect(buildGateRail({}).rungs).toHaveLength(GATE_RAIL_ORDER.length);
  });

  it("names the six gates the mockup names", () => {
    expect([...GATE_RAIL_ORDER]).toEqual([
      "REGIME", "DIRECTION", "LOCATION", "ORDER_FLOW", "CLC", "AVAILABLE_R",
    ]);
  });
});

describe("an unasked gate is not a paid one", () => {
  it("A GATE NOBODY ASKED OWES DEBT, NOT A TICK", () => {
    // H1 at the gate rail. An unanswered gate argues with you. An unasked gate
    // is silent, and silence is exactly what "no debt" looks like.
    const rail = buildGateRail({ REGIME: true });
    expect(rail.answered).toBe(1);
    expect(rail.unanswered).toBe(0);
    expect(rail.unasked).toBe(5);
    expect(rail.debt).toBe(5);
  });

  it("KEEPS UNASKED AND UNANSWERED AS SEPARATE COUNTS", () => {
    // Both owe. They are not the same thing to go and do about.
    const rail = buildGateRail({ REGIME: true, DIRECTION: false, LOCATION: false });
    expect(rail.unanswered).toBe(2);
    expect(rail.unasked).toBe(3);
    expect(rail.debt).toBe(5);
  });

  it("the three standings partition the rail exactly", () => {
    const rail = buildGateRail({ REGIME: true, DIRECTION: false });
    expect(rail.answered + rail.unanswered + rail.unasked).toBe(GATE_RAIL_ORDER.length);
  });

  it("NAMES THE UNASKED GATES RATHER THAN MERELY COUNTING THEM", () => {
    // A count tells a trader how much is owed. Only the names tell them what
    // to go and do — the difference between a scoreboard and a rail.
    const rail = buildGateRail({ REGIME: true, DIRECTION: false, LOCATION: true });
    expect(unaskedGates(rail)).toEqual(["ORDER_FLOW", "CLC", "AVAILABLE_R"]);
    expect(unaskedGates(buildGateRail(allAnswered()))).toEqual([]);
  });

  it("REFUSES AN UNINTERROGATED RAIL — zero of zero is an unread page", () => {
    const r = checkRailWasAsked(buildGateRail({}));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/unread page/);
  });

  it("one gate asked is enough to make the rail a reading", () => {
    expect(checkRailWasAsked(buildGateRail({ CLC: false })).ok).toBe(true);
  });
});

describe("the two facts, never merged", () => {
  it("STATES BOTH WHEN THE WAIT CLEARS AND THE DEBT DOES NOT", () => {
    // The mockup's own case, and the reason the line exists. The dangerous
    // composition is not "WAIT FINISHED, therefore GO" — nobody writes that.
    // It is a rail that stops drawing debt once the wait clears.
    const v = waitVerdict(buildGateRail({ REGIME: true }), true);
    expect(v.waitFinished).toBe(true);
    expect(v.debtRemains).toBe(true);
    expect(v.line).toBe("WAIT FINISHED — EVIDENCE DEBT REMAINS");
  });

  it("A FINISHED WAIT NEVER CLEARS THE DEBT", () => {
    const waiting = buildGateRail({ REGIME: true, DIRECTION: false });
    expect(waitVerdict(waiting, false).debtRemains)
      .toBe(waitVerdict(waiting, true).debtRemains);
  });

  it("debt is read from the rail and from nothing else", () => {
    const clean = buildGateRail(allAnswered());
    expect(waitVerdict(clean, true).debtRemains).toBe(false);
    expect(waitVerdict(clean, false).debtRemains).toBe(false);
  });

  it("gives all four combinations their own sentence", () => {
    const clean = buildGateRail(allAnswered());
    const owing = buildGateRail({ REGIME: true });
    expect(new Set([
      waitVerdict(owing, true).line,
      waitVerdict(clean, true).line,
      waitVerdict(owing, false).line,
      waitVerdict(clean, false).line,
    ]).size).toBe(4);
  });

  it("A CLEAN RAIL IS STILL NOT A PERMISSION", () => {
    // "We have all the evidence" is the most natural thing in the world to
    // mistake for "so go". The rail describes the chain; it does not start it.
    const v = waitVerdict(buildGateRail(allAnswered()), true);
    expect(v.line).not.toMatch(/GO|PROCEED|CLEAR TO|SAFE|ENTER/i);
  });

  it("SHIPS NO PERMISSION FUNCTION — a name for it is where one gets invented", () => {
    // The same refusal marketObjectKinds.ts makes by shipping no isTradeable().
    for (const key of Object.keys(railModule as Record<string, unknown>)) {
      expect(key, key).not.toMatch(/canProceed|isGo|allow|permit|shouldTrade|isTradeable/i);
    }
  });
});
