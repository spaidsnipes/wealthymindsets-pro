/**
 * TruthStatusChip — regression lock for canon §TRUTH STATUS LABELS.
 * Pins the 11 canonical labels + silent-on-empty invariant.
 */

import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TruthStatusChip } from "./TruthStatusChip";
import { ALL_TRUTH_STATUS_KEYS } from "@/lib/truthStatus/truthStatusLabels";

describe("TruthStatusChip — canon §Truth Status Labels", () => {
  it("renders null when passed neither status nor report (canon §Silence Is A Feature)", () => {
    const html = renderToStaticMarkup(<TruthStatusChip />);
    expect(html).toBe("");
  });

  it("renders each of the 11 canonical labels exactly", () => {
    const cases: Array<[typeof ALL_TRUTH_STATUS_KEYS[number], string]> = [
      ["VERIFIED", "VERIFIED"],
      ["CORROBORATED", "CORROBORATED"],
      ["PROVISIONAL", "PROVISIONAL"],
      ["ESTIMATED", "ESTIMATED"],
      ["INFERRED", "INFERRED"],
      ["ASSUMED", "ASSUMED"],
      ["DISPUTED", "DISPUTED"],
      ["UNVERIFIED", "UNVERIFIED"],
      ["UNKNOWN", "UNKNOWN"],
      ["FALSE_OR_CONTRADICTED", "FALSE OR CONTRADICTED"],
      ["SUPERSEDED", "SUPERSEDED"],
    ];
    for (const [key, expected] of cases) {
      const html = renderToStaticMarkup(<TruthStatusChip status={key} />);
      expect(html).toContain(expected);
      expect(html).toContain(`data-truth-status="${key}"`);
    }
  });

  it("prefers explicit status over report.status when both supplied", () => {
    const html = renderToStaticMarkup(
      <TruthStatusChip status="VERIFIED" report={{ status: "UNKNOWN" }} />,
    );
    expect(html).toContain("VERIFIED");
    expect(html).not.toContain(">UNKNOWN<");
  });

  it("uses report.status when no explicit status is passed", () => {
    const html = renderToStaticMarkup(
      <TruthStatusChip report={{ status: "DISPUTED" }} />,
    );
    expect(html).toContain("DISPUTED");
  });

  it("emits data-testid + role=status + aria-label for downstream tests", () => {
    const html = renderToStaticMarkup(<TruthStatusChip status="VERIFIED" />);
    expect(html).toContain('data-testid="truth-status-chip"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Truth status: VERIFIED"');
  });

  it("weaker status renders in a quieter tone (canon §quiet-on-low-confidence)", () => {
    const strong = renderToStaticMarkup(<TruthStatusChip status="VERIFIED" />);
    const weak = renderToStaticMarkup(<TruthStatusChip status="UNKNOWN" />);
    // VERIFIED uses the full-gold #d4af37; UNKNOWN drops to the muted #8a8271.
    expect(strong).toContain("#d4af37");
    expect(weak).toContain("#8a8271");
  });

  it("populates tooltip narrative from report fields when provided", () => {
    const html = renderToStaticMarkup(
      <TruthStatusChip
        report={{
          status: "DISPUTED",
          claim: "Market is trending",
          reason: "Two sources disagree.",
          nextAction: "Get third source.",
          asOfIso: "2026-08-29T12:00:00Z",
        }}
      />,
    );
    expect(html).toContain("Market is trending");
    expect(html).toContain("Reason: Two sources disagree.");
    expect(html).toContain("Next: Get third source.");
    expect(html).toContain("As of: 2026-08-29T12:00:00Z");
  });
});
