/** §41 factual Review questions: far-edge (fill) targets, and additional evidence — counts always, comparisons at ≥ 20. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { journalFixture } from "./journalProofFixture";
import { additionalEvidenceComparison, fillTargetComparison, fillTargetGroupOf, fillTargetSample, gapDecisionFrom, hasAdditionalEvidence, type GapDecision } from "./planFvgFillTargets";
import { INSUFFICIENT } from "./statGuard";

const d = (over: Partial<GapDecision>): GapDecision => ({
  id: "x", direction: "LONG", gapBottom: 100, gapTop: 101, entryPx: 98.5, targetPx: 101, exitPx: 101, realizedR: 2,
  evidence: [{ sense: "PRICE_GEOMETRY", state: "FULL" }, { sense: "ORDER_FLOW", state: "NOT_ATTACHED" }], ...over,
});
const BELIEF = /\b(magnet\w*|belie\w*|mandatory|always fills?|must fill|habit\w*|bias\w*|afraid|fear\w*|greed\w*|impulsiv\w*|should have)\b/i;

describe("§41 · where the frozen target sat relative to the gap", () => {
  it("LONG below the gap → far edge = top; SHORT above → far edge = bottom (within 10 % of the gap)", () => {
    expect(fillTargetGroupOf(d({}))).toBe("FILL TARGET");
    expect(fillTargetGroupOf(d({ targetPx: 101.08 }))).toBe("FILL TARGET");
    expect(fillTargetGroupOf(d({ targetPx: 100 }))).toBe("OTHER TARGET");                // near edge is not the far edge
    expect(fillTargetGroupOf(d({ direction: "SHORT", entryPx: 102.5, targetPx: 100 }))).toBe("FILL TARGET");
    expect(fillTargetGroupOf(d({ direction: "SHORT", entryPx: 102.5, targetPx: 101 }))).toBe("OTHER TARGET");
  });
  it("entry inside the gap, or trading away from it: never a fill target; missing facts are NOT CLASSIFIED", () => {
    expect(fillTargetGroupOf(d({ entryPx: 100.5 }))).toBe("OTHER TARGET");
    expect(fillTargetGroupOf(d({ direction: "SHORT", entryPx: 98.5, targetPx: 101 }))).toBe("OTHER TARGET");
    expect(fillTargetGroupOf(d({ targetPx: null }))).toBe("NOT CLASSIFIED");
    expect(fillTargetGroupOf(d({ direction: null }))).toBe("NOT CLASSIFIED");
  });
  it("counts are facts at any n; the comparison is INSUFFICIENT below 20 each side, with its n", () => {
    const c = fillTargetComparison([d({}), d({ id: "y", targetPx: 99.5, exitPx: 99.5, realizedR: 1 }), d({ id: "z", targetPx: null })]);
    expect(c.countLine).toBe("1 of 2 gap decisions with a recorded target planned it at the gap's far edge (entering outside the gap and aiming across it). 1 not classified (no direction, entry or target recorded, or the entry was inside the gap).");
    expect(c.state).toBe("INSUFFICIENT EVIDENCE");
    expect(c.line).toBe(`Far-edge targets beside other gap targets: ${INSUFFICIENT} — 1 and 1 decisions with a recorded result (20 each side needed); so far the exit reached the far edge on 1 of 1.`);
  });
  it("the sample: 24 + 24 → MEASURED, means and target-reached stated, descriptive", () => {
    const c = fillTargetComparison(fillTargetSample());
    expect(c.a.decisions).toBe(24);
    expect(c.b.decisions).toBe(24);
    expect(c.state).toBe("MEASURED");
    expect(c.line).toMatch(/^Far-edge targets: mean -?[\d.]+R over 24, the exit reached the target on \d+ of 24\. Other gap targets: mean -?[\d.]+R over 24\. Descriptive only\.$/);
    expect(c.claim).toMatch(/^DESCRIPTIVE/);
  });
  it("on the journal fixture (every plan targets 2R beyond the entry, at the gap): 0 far-edge targets — said as a count, not a verdict", () => {
    const f = journalFixture();
    const ds = f.entries.map(e => gapDecisionFrom({ id: e.id, fvgRef: e.fvgRef, plan: e.plan, entryPx: e.actuals.entry?.px ?? null, exitPx: e.actuals.exits[0]?.px ?? null, realizedR: e.realizedR }));
    const c = fillTargetComparison(ds);
    expect(c.a.decisions).toBe(0);
    expect(c.countLine).toMatch(/^0 of 24 gap decisions with a recorded target/);
    expect(c.state).toBe("INSUFFICIENT EVIDENCE");
  });
});

describe("§41 · additional evidence attached at the decision", () => {
  it("attached = a non-price sense not NOT_ATTACHED and not SILENCE; the line says WM does not know whether it agreed", () => {
    expect(hasAdditionalEvidence(d({}))).toBe(false);
    expect(hasAdditionalEvidence(d({ evidence: [{ sense: "ORDER_FLOW", state: "PARTIAL" }] }))).toBe(true);
    expect(hasAdditionalEvidence(d({ evidence: [{ sense: "DERIVATIVES", state: "SILENCE" }] }))).toBe(false);
    expect(hasAdditionalEvidence(d({ evidence: [{ sense: "PRICE_GEOMETRY", state: "FULL" }] }))).toBe(false);
    const c = additionalEvidenceComparison([d({}), d({ id: "y", evidence: [{ sense: "ORDER_FLOW", state: "FULL" }] })]);
    expect(c.countLine).toContain("WM records that a sense was attached, not whether it agreed with the trade.");
    expect(c.state).toBe("INSUFFICIENT EVIDENCE");
  });
  it("the sample: 24 + 24 → MEASURED", () => {
    const c = additionalEvidenceComparison(fillTargetSample());
    expect([c.a.withR, c.b.withR, c.state]).toEqual([24, 24, "MEASURED"]);
    expect(c.line).toMatch(/^With an additional sense: mean -?[\d.]+R over 24\. Price only: mean -?[\d.]+R over 24\. Descriptive only\.$/);
  });
  it("the fixture's references carry no attached sense (price only) — 0 of 24, INSUFFICIENT", () => {
    const f = journalFixture();
    const c = additionalEvidenceComparison(f.entries.map(e => gapDecisionFrom({ id: e.id, fvgRef: e.fvgRef, plan: e.plan, entryPx: null, exitPx: null, realizedR: e.realizedR })));
    expect(c.a.decisions).toBe(0);
    expect(c.b.decisions).toBe(24);
    expect(c.state).toBe("INSUFFICIENT EVIDENCE");
  });
});

describe("no belief label the trader did not write", () => {
  it("no line, and no source string, names a belief, a magnet, a habit or a feeling", () => {
    const lines = [fillTargetComparison(fillTargetSample()), additionalEvidenceComparison(fillTargetSample()), fillTargetComparison([d({})])]
      .flatMap(c => [c.countLine, c.line, c.claim]).join("\n");
    expect(lines.length).toBeGreaterThan(400);
    expect(lines).not.toMatch(BELIEF);
    const src = readFileSync(path.resolve(__dirname, "planFvgFillTargets.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(src.length).toBeGreaterThan(2_000);
    expect(src).not.toMatch(BELIEF);
  });
});
