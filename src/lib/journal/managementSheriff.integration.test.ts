/**
 * §64 FOUNDER MANAGEMENT SHERIFF — one integration test over the walkthrough (three sample
 * decisions through the real owners). The laws:
 *   · what the market did / what you planned / what you actually did are kept SEPARATE;
 *   · an early exit and a hold through the invalidation are shown as FACTUAL deviations, with rules;
 *   · documented new evidence is PRESERVED beside the frozen base, and covers what it changed;
 *   · no shaming, no fabricated psychology: the "why" is the trader's own words or "not recorded".
 */
import { describe, expect, it } from "vitest";

import { managementWalkthroughs } from "./managementWalkthrough";
import { composePlanReview } from "./planReview";

const SHAME = /\b(afraid|fear\w*|scared|panic\w*|greed\w*|impatien\w*|impulsiv\w*|revenge|fomo|anxious|nervous|emotional(?!ReasonSource)|undisciplined|lack of discipline|should have|failed|failure|bad trade|mistake|careless|reckless|lazy|weak(?! thesis)|you were)\b/i;

describe("§64 the Founder's management Sheriff, through three sample decisions", () => {
  const [A, B, C] = managementWalkthroughs();

  it("three walkthroughs, six steps each, every step with lines", () => {
    expect([A.id, B.id, C.id]).toEqual(["EARLY_EXIT", "HELD_THROUGH_INVALIDATION", "DOCUMENTED_NEW_EVIDENCE"]);
    for (const w of [A, B, C]) {
      expect(w.steps).toHaveLength(6);
      for (const s of w.steps) expect(s.lines.length, `${w.id} ${s.step}`).toBeGreaterThan(0);
    }
  });

  it("MARKET / PLANNED / ACTUAL are kept apart: each column speaks only of its own source", () => {
    for (const w of [A, B, C]) {
      const { market, planned, actual } = w.review.sheriff;
      expect(market[0]).toMatch(/^Source: sample 1m bars/);
      expect(planned[0]).toMatch(/^Frozen at the ticket's send, .+ Decision_ID SAMPLE-SHERIFF-[ABC]\.$/);
      expect(actual[0]).toBe("Reported by: sample broker readback (proof scene).");
      // The market column never reports what the trader did; the actual column never reports bars; the plan column never reports fills.
      expect(market.join(" ")).not.toMatch(/\b(You|Entry \d|Exit \d|Reported by)\b/);
      expect(actual.join(" ")).not.toMatch(/\b(high|low|printed|bar)\b/i);
      expect(planned.join(" ")).not.toMatch(/\b(Exit \d|Reported by|During the hold)\b/);
    }
  });

  it("A · the early exit is a factual deviation with its rule — not a verdict", () => {
    const ids = A.review.result.findings.map(f => f.id);
    expect(ids).toContain("EXITED_BEFORE_PLANNED_CONDITION");
    const f = A.review.result.findings.find(x => x.id === "EXITED_BEFORE_PLANNED_CONDITION")!;
    expect(f.sentence).toBe("You exited at 100.8 before the target 104 or the invalidation 98 recorded in your plan had printed.");
    expect(f.rule).toMatch(/^Exited before planned condition: during the hold no bar reached/);
    expect(A.review.sheriff.market.join(" ")).toMatch(/The planned target 104 printed after the exit/);   // the market's answer, stated apart
  });

  it("B · the hold through the invalidation is a factual deviation: when it printed, how many bars later the exit came", () => {
    expect(B.review.result.primary).toBe("HELD_THROUGH_INVALIDATION");
    const f = B.review.result.findings.find(x => x.id === "HELD_THROUGH_INVALIDATION")!;
    expect(f.sentence).toMatch(/^The invalidation recorded in your plan \(99\) printed at .+; the position stayed open 5 bars longer and closed at 98\.4\.$/);
    expect(f.rule).toMatch(/still open more than one full bar after the bar in which the plan's invalidation price printed/);
    expect(f.facts.some(x => x.layer === "MARKET TRUTH" && /printed in the bar opening/.test(x.text))).toBe(true);
  });

  it("C · documented new evidence is preserved beside the frozen base and covers the stop it moved", () => {
    expect(C.plan.base.stopPx.value).toBe(98);                              // the frozen base is untouched
    expect(Object.isFrozen(C.plan.base)).toBe(true);
    expect(C.plan.amendments).toHaveLength(1);
    expect(C.review.sheriff.planned.join(" ")).toContain("stop → 99.5 — new evidence: sample: a large seller printed at the gap's high; the move above it was absorbed.");
    const ids = C.review.result.findings.map(f => f.id);
    expect(ids).toContain("PLAN_CHANGED_WITH_DOCUMENTED_NEW_EVIDENCE");
    expect(ids).not.toContain("MOVED_STOP_WITHOUT_PLAN_BASIS");
    expect(C.review.result.findings.find(f => f.id === "PLAN_CHANGED_WITH_DOCUMENTED_NEW_EVIDENCE")!.facts.map(x => x.text).join(" ")).toContain("New evidence: sample: a large seller printed");
  });

  it("no shaming and no fabricated psychology anywhere a trader reads", () => {
    const all = [A, B, C].flatMap(w => w.steps.flatMap(s => s.lines)).join("\n");
    expect(all.length).toBeGreaterThan(2_500);
    expect(all).not.toMatch(SHAME);
    for (const w of [A, B, C]) {
      expect(w.review.result.emotionalReason).toBe("unknown");
      expect(w.review.result.emotionalReasonSource).toBe("NOT RECORDED");
      expect(w.steps[4].lines).toEqual(["Not recorded. WM does not fill this in."]);
    }
  });

  it("the trader's own words are the ONLY reason — kept verbatim, labelled as theirs, never paraphrased", () => {
    const words = "I saw the seller and wanted to be flat before the data";
    const r = composePlanReview({ plan: A.plan, actuals: A.actuals, path: A.path }, words);
    expect(r.result.emotionalReason).toBe(words);
    expect(r.result.emotionalReasonSource).toBe("TRADER RECORDED");
    expect(r.result.findings.every(f => f.emotionalReason === words)).toBe(true);
    expect(r.result.findings.map(f => f.sentence).join(" ")).not.toContain(words);   // not woven into the facts
  });

  it("each walkthrough ends at SpaidBot's question and a lesson door; no step names a score or a grade", () => {
    for (const w of [A, B, C]) {
      expect(w.steps[5].lines[0].length).toBeGreaterThan(20);
      expect(w.steps[5].lines.some(l => /^Study: Lesson \d+/.test(l))).toBe(true);
      expect(w.steps.flatMap(s => s.lines).join(" ")).not.toMatch(/\b(score|grade|rating|\d+\s*\/\s*10)\b/i);
    }
  });
});
