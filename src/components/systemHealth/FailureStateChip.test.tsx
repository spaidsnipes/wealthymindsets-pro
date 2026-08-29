/**
 * FailureStateChip — regression lock for canon §Failure + Recovery
 * Grammar. Pins the 6 canonical labels, the NORMAL-quiets rule, and
 * the tooltip narrative extraction.
 */

import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FailureStateChip } from "./FailureStateChip";
import { CANONICAL_FAILURE_STATES } from "@/lib/systemHealth/failureStateGrammar";

describe("FailureStateChip — canon §Failure + Recovery Grammar", () => {
  it("renders null when passed neither state nor report (canon §Silence Is A Feature)", () => {
    const html = renderToStaticMarkup(<FailureStateChip />);
    expect(html).toBe("");
  });

  it("renders each of the 6 canonical states with data-failure-state attribute", () => {
    for (const s of CANONICAL_FAILURE_STATES) {
      const html = renderToStaticMarkup(<FailureStateChip state={s} />);
      expect(html).toContain(`data-failure-state="${s}"`);
    }
  });

  it("NORMAL renders as a quiet dot without the loud label (canon §normal-inactivity-is-not-failure)", () => {
    const html = renderToStaticMarkup(<FailureStateChip state="NORMAL" />);
    // The NORMAL variant intentionally omits the "NORMAL" text token
    // so it doesn't shout at the trader when nothing is wrong.
    expect(html).not.toContain(">NORMAL<");
    expect(html).toContain('data-failure-state="NORMAL"');
  });

  it("non-NORMAL states render the full pill with the state text visible", () => {
    for (const s of ["DEGRADED", "BLOCKED", "UNAVAILABLE", "RECOVERING", "UNKNOWN"] as const) {
      const html = renderToStaticMarkup(<FailureStateChip state={s} />);
      expect(html).toContain(`>${s}<`);
    }
  });

  it("prefers explicit state over report.state when both supplied", () => {
    const html = renderToStaticMarkup(
      <FailureStateChip state="BLOCKED" report={{ state: "NORMAL" }} />,
    );
    expect(html).toContain('data-failure-state="BLOCKED"');
  });

  it("falls back to report.state when no explicit state", () => {
    const html = renderToStaticMarkup(
      <FailureStateChip report={{ state: "RECOVERING", reason: "reconnecting" }} />,
    );
    expect(html).toContain('data-failure-state="RECOVERING"');
    expect(html).toContain("Reason: reconnecting");
  });

  it("populates tooltip narrative from every FailureStateReport question field", () => {
    const html = renderToStaticMarkup(
      <FailureStateChip
        report={{
          state: "DEGRADED",
          affected: "quote stream",
          stillWorks: "bars",
          reason: "provider throttled",
          userImpact: "quote may lag 2-5s",
          nextSafeAction: "reduce watchlist size",
          recoveredWhen: "throttle window ends",
          lastKnownGood: { atIso: "2026-08-29T13:00:00Z", detail: "full stream" },
        }}
      />,
    );
    expect(html).toContain("Affected: quote stream");
    expect(html).toContain("Still works: bars");
    expect(html).toContain("Reason: provider throttled");
    expect(html).toContain("Impact: quote may lag 2-5s");
    expect(html).toContain("Next: reduce watchlist size");
    expect(html).toContain("Recovered when: throttle window ends");
    expect(html).toContain("Last good: 2026-08-29T13:00:00Z");
    expect(html).toContain("full stream");
  });

  it("emits data-testid + role=status + aria-label for downstream tests", () => {
    const html = renderToStaticMarkup(<FailureStateChip state="BLOCKED" />);
    expect(html).toContain('data-testid="failure-state-chip"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Subsystem health: BLOCKED"');
  });
});
