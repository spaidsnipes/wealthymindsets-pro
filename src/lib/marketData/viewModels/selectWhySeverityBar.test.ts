/**
 * THE BAR MUST COUNT THE CENSUS, NOT THE SAMPLE.
 *
 * The first test below is the entire reason this file exists: nine blockers
 * and six blockers must not draw the same picture.
 */

import { describe, expect, it } from "vitest";

import { selectWhySeverityBar } from "./selectWhySeverityBar";
import {
  DECISION_WHY_VERSION,
  type DecisionWhyVM,
  type WhyBlocker,
} from "./selectDecisionWhyNot";

function blocker(label: string): WhyBlocker {
  return { kind: "EVIDENCE_DEBT", label, detail: `${label} is UNKNOWN` };
}

function why(partial: Partial<DecisionWhyVM>): DecisionWhyVM {
  return {
    version: DECISION_WHY_VERSION,
    verdict: "WAIT",
    clear: false,
    headline: "Right-of-way is withheld.",
    blockers: [],
    blockerCount: 0,
    clearances: [],
    invalidators: [],
    evidenceLedger: null,
    ...partial,
  };
}

describe("selectWhySeverityBar", () => {
  it("draws the census, not the capped sample", () => {
    const sampled = [blocker("regime"), blocker("direction"), blocker("location")];
    const six = selectWhySeverityBar(why({ blockers: sampled, blockerCount: 6 }));
    const nine = selectWhySeverityBar(why({ blockers: sampled, blockerCount: 9 }));

    expect(six!.segments).toHaveLength(6);
    expect(nine!.segments).toHaveLength(9);
    // The defect this guards: identical samples drawing identical bars.
    expect(six!.segments.length).not.toBe(nine!.segments.length);
  });

  it("labels only what the sample actually attributes", () => {
    const bar = selectWhySeverityBar(
      why({ blockers: [blocker("regime")], blockerCount: 4 }),
    );
    expect(bar!.segments[0]).toEqual({ state: "EVIDENCE_DEBT", label: "regime" });
    expect(bar!.segments.slice(1).every((s) => s.state === "UNATTRIBUTED")).toBe(true);
    expect(bar!.segments.slice(1).every((s) => s.label === null)).toBe(true);
  });

  it("never invents a severity for an unattributed blocker", () => {
    const bar = selectWhySeverityBar(
      why({ blockers: [{ kind: "HARD_RULE", label: "daily loss", detail: "engaged" }], blockerCount: 5 }),
    );
    const hard = bar!.segments.filter((s) => s.state === "HARD_RULE");
    expect(hard).toHaveLength(1);
  });

  it("lets the census win if a sample ever exceeds it", () => {
    const bar = selectWhySeverityBar(
      why({ blockers: [blocker("a"), blocker("b"), blocker("c")], blockerCount: 1 }),
    );
    expect(bar!.segments).toHaveLength(1);
  });

  it("draws a cleared verdict as zero blockers with its clearances counted", () => {
    const bar = selectWhySeverityBar(
      why({
        verdict: "ACTION",
        clear: true,
        blockers: [],
        blockerCount: 0,
        clearances: ["No active contradiction to the thesis.", "9/9 evidence nodes paid."],
      }),
    );
    expect(bar!.segments).toHaveLength(0);
    expect(bar!.clear).toBe(true);
    expect(bar!.clearanceCount).toBe(2);
  });

  it("draws nothing when nothing has been compiled", () => {
    expect(selectWhySeverityBar(null)).toBeNull();
    expect(selectWhySeverityBar(why({ blockerCount: 0 }))).toBeNull();
  });
});
