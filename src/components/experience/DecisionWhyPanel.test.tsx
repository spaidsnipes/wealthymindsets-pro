/**
 * DecisionWhyPanel — render regression lock for canon §P6 WHY / WHY NOT
 * and canon §Phase 3 Market Canvas — WHAT WOULD INVALIDATE.
 *
 * The panel is a single-writer surface for the DecisionWhyVM shape. These
 * tests pin the visible tokens so a silent refactor cannot drop the
 * verdict badge, the CLEARED strip, or the invalidator strip.
 */

import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DecisionWhyPanel } from "./DecisionWhyPanel";
import type { DecisionWhyVM } from "@/lib/marketData/viewModels/selectDecisionWhyNot";
import { selectEvidenceDebtLedger } from "@/lib/experience/selectEvidenceDebtLedger";

function vm(over: Partial<DecisionWhyVM> = {}): DecisionWhyVM {
  return {
    version: "wm.decision-why.v1",
    verdict: "ACTION",
    clear: true,
    headline: "Right-of-way is granted — the path is clear.",
    blockers: [],
    clearances: [],
    invalidators: [],
    evidenceLedger: null,
    ...over,
    // Fixtures are not capped, so the honest default is the sample size. An
    // explicit blockerCount override models the CAPPED case.
    blockerCount: over.blockerCount ?? (over.blockers ?? []).length,
  };
}

describe("DecisionWhyPanel — canon §P6 + §Phase 3 Market Canvas", () => {
  it("renders the headline and verdict badge for a clear (ACTION) verdict", () => {
    const html = renderToStaticMarkup(<DecisionWhyPanel vm={vm()} />);
    expect(html).toContain("Right-of-way is granted");
    expect(html).toContain("ACTION");
    // "Why · right-of-way" (no "not") on clear verdicts
    expect(html).toContain("Why");
  });

  it("renders 'Why not' framing for non-ACTION verdicts", () => {
    const html = renderToStaticMarkup(
      <DecisionWhyPanel vm={vm({ verdict: "WAIT", clear: false, headline: "Right-of-way is withheld." })} />,
    );
    expect(html).toContain("Why not");
    expect(html).toContain("WAIT");
  });

  it("renders each blocker's kind label and detail", () => {
    const html = renderToStaticMarkup(
      <DecisionWhyPanel vm={vm({
        verdict: "WAIT",
        clear: false,
        headline: "withheld",
        blockers: [
          { kind: "CONTRADICTION", label: "Active contradiction", detail: "sellers absorbing" },
          { kind: "EVIDENCE_DEBT", label: "regime", detail: "Required evidence is unpaid." },
        ],
      })} />,
    );
    expect(html).toContain("CONTRADICTION");
    expect(html).toContain("sellers absorbing");
    expect(html).toContain("MISSING"); // KIND_LABEL for EVIDENCE_DEBT
    expect(html).toContain("regime");
  });

  it("renders the CLEARED strip when clearances are present", () => {
    const html = renderToStaticMarkup(
      <DecisionWhyPanel vm={vm({ clearances: ["No active contradiction to the thesis."] })} />,
    );
    expect(html).toContain("CLEARED");
    expect(html).toContain("No active contradiction");
  });

  it("renders the 'Would invalidate' strip for ACTION verdicts with invalidators (canon §Phase 3)", () => {
    const html = renderToStaticMarkup(
      <DecisionWhyPanel vm={vm({
        invalidators: [
          "A contradiction emerges against the thesis.",
          "A HARD trader rule engages.",
        ],
      })} />,
    );
    expect(html).toContain("Would invalidate");
    expect(html).toContain("contradiction emerges");
    expect(html).toContain("HARD trader rule");
    expect(html).toContain('data-testid="decision-why-invalidators"');
  });

  it("omits the 'Would invalidate' strip when invalidators is empty (canon §Silence Is A Feature)", () => {
    const html = renderToStaticMarkup(<DecisionWhyPanel vm={vm({ invalidators: [] })} />);
    expect(html).not.toContain("Would invalidate");
    expect(html).not.toContain("decision-why-invalidators");
  });
});

/**
 * THE EVIDENCE DEBT GETS A SHAPE.
 *
 * `selectDecisionWhyNot` compiles "5/8 evidence nodes paid." and pushes it into
 * `clearances` — the AFFIRMATIVE column — so a chain with three unpaid nodes
 * files its own shortfall under CLEARED. Both numbers are true; the placement
 * is what flatters. These pin the correction: the unpaid remainder is DRAWN,
 * above the sentence that files it, at full width.
 */
describe("DecisionWhyPanel — the evidence ledger gets a shape", () => {
  const ledger = (over: Partial<NonNullable<DecisionWhyVM["evidenceLedger"]>> = {}) =>
    selectEvidenceDebtLedger({
      payable: 8, resolved: 5, warn: 1, missing: 2, watch: 0,
      missingLabels: [], warnLabels: [],
      ...over,
    } as never);

  const marks = (html: string) =>
    [...html.matchAll(/data-standing="([A-Z]+)"/g)].map((m) => m[1]);

  it("draws one mark per payable node — the denominator never shrinks", () => {
    const html = renderToStaticMarkup(<DecisionWhyPanel vm={vm({ evidenceLedger: ledger() })} />);
    expect(marks(html)).toEqual([
      "RESOLVED", "RESOLVED", "RESOLVED", "RESOLVED", "RESOLVED",
      "WARN",
      "MISSING", "MISSING",
    ]);
  });

  it("gives an unpaid mark the SAME width as a paid one", () => {
    // The whole correction. A remainder that narrows is a remainder that has
    // been filed under the affirmative column by geometry instead of by prose.
    const html = renderToStaticMarkup(<DecisionWhyPanel vm={vm({ evidenceLedger: ledger() })} />);
    const spans = [...html.matchAll(/<span[^>]*data-testid="decision-why-evidence-mark"[^>]*>/g)];
    expect(spans).toHaveLength(8);
    for (const s of spans) expect(s[0]).toContain("flex:1 1 0");
  });

  it("tells the three standings apart by FILL, not by hue — §9", () => {
    const html = renderToStaticMarkup(<DecisionWhyPanel vm={vm({ evidenceLedger: ledger() })} />);
    const span = (standing: string) =>
      html.match(new RegExp(`<span[^>]*data-standing="${standing}"[^>]*>`))![0];
    // RESOLVED is a solid body. WARN has an EDGE and no body — evidence
    // present, still unpaid. MISSING has neither.
    expect(span("RESOLVED")).toContain("background:#ede6d3");
    expect(span("WARN")).toContain("background:transparent");
    expect(span("WARN")).toContain("inset 0 0 0 1px");
    expect(span("MISSING")).not.toContain("inset");
  });

  it("draws the band ABOVE the clearance sentence that files the shortfall", () => {
    const html = renderToStaticMarkup(
      <DecisionWhyPanel vm={vm({
        evidenceLedger: ledger(),
        clearances: ["5/8 evidence nodes paid."],
      })} />,
    );
    expect(html.indexOf("decision-why-evidence-band")).toBeLessThan(html.indexOf("CLEARED"));
  });

  it("names the unpaid populations separately in the caption", () => {
    // The band is aria-hidden, so the caption carries the entire reading for a
    // screen reader. A WARN folded into MISSING would report a live warning as
    // mere silence.
    const html = renderToStaticMarkup(<DecisionWhyPanel vm={vm({ evidenceLedger: ledger() })} />);
    expect(html).toContain("3 of 8 evidence nodes unpaid");
    expect(html).toContain("1 below confirmation");
    expect(html).toContain("2 with no indicator");
  });

  it("names WATCH nodes rather than leaving an unexplained gap", () => {
    const html = renderToStaticMarkup(
      <DecisionWhyPanel vm={vm({ evidenceLedger: ledger({ watch: 1 }) })} />,
    );
    expect(marks(html)).toHaveLength(8); // NOT 9 — watch is outside the ledger
    expect(html).toContain("1 watch node sit");
  });

  it("lets a fully paid ledger say so without inventing a grade", () => {
    const html = renderToStaticMarkup(
      <DecisionWhyPanel vm={vm({ evidenceLedger: ledger({ resolved: 8, warn: 0, missing: 0 }) })} />,
    );
    expect(html).toContain("All 8 payable evidence nodes are resolved");
    expect(marks(html).every((m) => m === "RESOLVED")).toBe(true);
  });

  it("draws nothing at all when there is no ledger", () => {
    const html = renderToStaticMarkup(<DecisionWhyPanel vm={vm({ evidenceLedger: null })} />);
    expect(html).not.toContain("decision-why-evidence-band");
    expect(html).not.toContain("EVIDENCE DEBT");
  });

  it("carries no percentage and no grade word — §15", () => {
    const html = renderToStaticMarkup(<DecisionWhyPanel vm={vm({ evidenceLedger: ledger() })} />);
    const caption = html.match(/decision-why-evidence-caption"[^>]*>([^<]*)</)![1];
    expect(caption).not.toMatch(/\d+%/);
    expect(caption).not.toMatch(/\b(SCORE|GRADE|PASSING|HEALTHY|COMPLETE)\b/i);
  });
});
