/**
 * SENTINEL — "No thesis" is not "no contradiction".
 *
 * H1 shape 1 (fabricated absence), found LIVE on /command-deck: the sentence
 *
 *   "No active contradiction to the thesis."
 *
 * rendered twice, in the CLEARANCES list — documented on `DecisionWhyVM` as
 * *"What IS satisfied — the affirmative side of the ledger"* — on a packet
 * where the same screen read *"No chapter resolved … (0/8 dimensions
 * resolved)"*.
 *
 * ROOT CAUSE — an OVERLOADED NULL.
 * `selectOneStory.contradiction` returned `null` for two unrelated facts:
 *   1. a thesis exists and nothing materially opposes it   (a finding)
 *   2. no thesis was ever resolved                          (not a finding)
 * and `selectDecisionWhyNot` converted BOTH into an affirmative clearance from
 * a bare `else` — a DEFAULT BRANCH, where nobody reads looking for a claim.
 *
 * A contradiction TO A THESIS requires a thesis. Without one the sentence is
 * vacuous: it is the absence of a SUBJECT reported as the absence of an
 * OBJECTION.
 *
 * The cure SPLITS the null via `OneStoryVM.contradictionDetectability`
 * ("COMPARABLE" | "NOTHING_TO_COMPARE") and gates the clearance on it.
 *
 * LABEL-NOT-MODEL: this ships no new contradiction detectors and changes no
 * market computation. Four of the tests below exist only to stop the cure from
 * becoming its own defect.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { selectOneStory } from "@/lib/marketData/viewModels/selectOneStory";
import { selectDecisionWhyNot } from "@/lib/marketData/viewModels/selectDecisionWhyNot";
import type { OneStoryVM } from "@/lib/marketData/viewModels/selectOneStory";
import type { StoryVM } from "@/lib/marketData/viewModels/selectMarketStory";
import type { RightOfWayReading } from "@/lib/marketData/viewModels/decisionPermissionCompiler";

const CLEARANCE = "No active contradiction to the thesis.";

const reading = (value: RightOfWayReading["value"] = "WAIT"): RightOfWayReading => ({
  value,
  detail: "test",
  tone: "pending",
});

function oneStory(over: Partial<OneStoryVM> = {}): OneStoryVM {
  return {
    primary: "Market is in balance around a fair-value zone.",
    contradiction: null,
    contradictionDetectability: "COMPARABLE",
    missing: null,
    decision: reading(),
    debt: null,
    ...over,
  };
}

/** A StoryVM with a RESOLVED chapter — i.e. an actual thesis. */
function storyWithThesis(contradictions: string[] = []): StoryVM {
  return {
    current: {
      chapter: "BALANCE",
      contradictions,
    },
  } as unknown as StoryVM;
}

describe("SENTINEL — no thesis is not no contradiction", () => {
  // ---------------------------------------------------------------- THE DEFECT

  it("THE DEFECT: with NO thesis resolved, the clearance sentence is ABSENT", () => {
    const vm = selectDecisionWhyNot(
      oneStory({ contradiction: null, contradictionDetectability: "NOTHING_TO_COMPARE" }),
    );
    expect(vm.clearances).not.toContain(CLEARANCE);
    // And it must not smuggle the same claim in under different wording.
    expect(vm.clearances.some((c) => /contradiction/i.test(c))).toBe(false);
  });

  it("THE DEFECT: selectOneStory reports NOTHING_TO_COMPARE when no chapter resolved", () => {
    const vm = selectOneStory({
      story: { current: null, reason: "No chapter resolved." } as unknown as StoryVM,
      chainNodes: undefined,
      permission: null,
    });
    expect(vm.contradiction).toBeNull();
    expect(vm.contradictionDetectability).toBe("NOTHING_TO_COMPARE");
  });

  it("THE DEFECT: a null story is also NOTHING_TO_COMPARE, never COMPARABLE", () => {
    const vm = selectOneStory({ story: null, chainNodes: undefined, permission: null });
    expect(vm.contradictionDetectability).toBe("NOTHING_TO_COMPARE");
  });

  it("THE DEFECT: the clearance is not pushed from a bare `else`", () => {
    // Source-level lock. The cure is a GATE; a future refactor that restores an
    // unguarded default branch would silently revive the overclaim, and every
    // behavioural test above would still pass on a COMPARABLE fixture.
    const src = readFileSync(
      join(process.cwd(), "src/lib/marketData/viewModels/selectDecisionWhyNot.ts"),
      "utf8",
    );
    expect(src).toMatch(/contradictionDetectability === "COMPARABLE"/);
    expect(src).not.toMatch(/}\s*else\s*{\s*clearances\.push\("No active contradiction/);
  });

  // ------------------------------------------------- THE SPLIT OF THE OVERLOAD

  it("splits the overloaded null: a resolved thesis with no objection is COMPARABLE", () => {
    const vm = selectOneStory({
      story: storyWithThesis([]),
      chainNodes: undefined,
      permission: null,
    });
    expect(vm.contradiction).toBeNull();
    expect(vm.contradictionDetectability).toBe("COMPARABLE");
  });

  // --------------------------------------------------------- OVER-CORRECTIONS

  it("OVER-CORRECTION GUARD: a REAL thesis with nothing opposing it STILL earns the clearance", () => {
    // The cure must not make the affirmative sentence permanently unprintable.
    // When WM genuinely resolved a chapter and found no opposing evidence, that
    // IS a finding and the trader is entitled to read it.
    const vm = selectDecisionWhyNot(
      oneStory({ contradiction: null, contradictionDetectability: "COMPARABLE" }),
    );
    expect(vm.clearances).toContain(CLEARANCE);
  });

  it("OVER-CORRECTION GUARD: an observed contradiction is still a CONTRADICTION blocker", () => {
    const vm = selectDecisionWhyNot(
      oneStory({ contradiction: "sellers absorbing at the level" }),
    );
    expect(vm.blockers.some((b) => b.kind === "CONTRADICTION")).toBe(true);
    expect(vm.clearances).not.toContain(CLEARANCE);
  });

  it("OVER-CORRECTION GUARD: a contradiction is reported even when detectability says NOTHING_TO_COMPARE", () => {
    // Finding one PROVES something was comparable. An observed contradiction can
    // never be suppressed by a denominator claim — same law as the
    // CONTRADICTIONS tile (dispatch 2367).
    const vm = selectDecisionWhyNot(
      oneStory({
        contradiction: "ticker price has no matching runtime tick",
        contradictionDetectability: "NOTHING_TO_COMPARE",
      }),
    );
    expect(vm.blockers.some((b) => b.kind === "CONTRADICTION")).toBe(true);
  });

  it("OVER-CORRECTION GUARD: the evidence-debt clearance is untouched — it states its denominator", () => {
    const vm = selectDecisionWhyNot(
      oneStory({
        contradictionDetectability: "NOTHING_TO_COMPARE",
        // Typed, NOT cast. An `as unknown as` here hid a stale `total` field
        // from tsc through an entire rename — only the runtime assertion below
        // caught the drift. A fixture that opts out of the type is a fixture
        // that stops proving the thing it names.
        debt: {
          missing: 0,
          resolved: 3,
          warn: 6,
          payable: 9,
          watch: 0,
          missingLabels: [],
          warnLabels: [],
        } satisfies NonNullable<OneStoryVM["debt"]>,
      }),
    );
    expect(vm.clearances).toContain("3/9 evidence nodes paid.");
  });

  it("OVER-CORRECTION GUARD: the `contradiction` field itself is not deleted from the VM", () => {
    const vm = oneStory({ contradiction: "x" });
    expect(vm.contradiction).toBe("x");
  });
});
