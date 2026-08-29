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

function vm(over: Partial<DecisionWhyVM> = {}): DecisionWhyVM {
  return {
    version: "wm.decision-why.v1",
    verdict: "ACTION",
    clear: true,
    headline: "Right-of-way is granted — the path is clear.",
    blockers: [],
    clearances: [],
    invalidators: [],
    ...over,
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
