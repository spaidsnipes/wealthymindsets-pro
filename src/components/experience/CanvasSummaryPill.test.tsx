/**
 * CanvasSummaryPill — regression lock for the one-line canvas summary.
 * Enforces the canon §Silence Is A Feature contract: a fully-silent VM
 * renders nothing.
 */

import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CanvasSummaryPill } from "./CanvasSummaryPill";
import type { MarketCanvasVM } from "@/lib/marketData/viewModels/selectMarketCanvas";

function vm(over: Partial<MarketCanvasVM> = {}): MarketCanvasVM {
  return {
    version: "wm.market-canvas.v1",
    verdict: "UNKNOWN",
    clear: false,
    headline: "No market snapshot yet — canvas is unresolved.",
    missing: [],
    resolved: [],
    blockers: [],
    clearances: [],
    invalidators: [],
    hasSnapshot: false,
    ...over,
  };
}

describe("CanvasSummaryPill — canon §Phase 3 Market Canvas summary", () => {
  it("renders nothing when the VM is fully silent (canon §Silence Is A Feature)", () => {
    const html = renderToStaticMarkup(<CanvasSummaryPill vm={vm()} />);
    expect(html).toBe("");
  });

  it("renders the verdict alone when the canvas has no open corners", () => {
    const html = renderToStaticMarkup(
      <CanvasSummaryPill vm={vm({ verdict: "ACTION", clear: true, hasSnapshot: true })} />,
    );
    expect(html).toContain("ACTION");
    expect(html).not.toContain("missing");
    expect(html).not.toContain("blockers");
    expect(html).not.toContain("would-invalidate");
  });

  it("appends the CLEARED count when clearances[] has entries (W6 symmetric ledger)", () => {
    const html = renderToStaticMarkup(
      <CanvasSummaryPill
        vm={vm({
          verdict: "WAIT",
          hasSnapshot: true,
          blockers: ["regime"],
          clearances: ["No active contradiction to the thesis.", "3/9 evidence nodes paid."],
        })}
      />,
    );
    expect(html).toContain("WAIT");
    expect(html).toContain("1 blockers");
    expect(html).toContain("2 cleared");
  });

  it("appends missing / blockers / would-invalidate counts when present", () => {
    const html = renderToStaticMarkup(
      <CanvasSummaryPill
        vm={vm({
          verdict: "WAIT",
          hasSnapshot: true,
          missing: ["direction:unresolved"],
          blockers: ["regime", "Active contradiction"],
          invalidators: [],
        })}
      />,
    );
    expect(html).toContain("WAIT");
    expect(html).toContain("1 missing");
    expect(html).toContain("2 blockers");
    expect(html).not.toContain("would-invalidate");
  });

  it("emits a canonical data-testid + role=status for downstream tests", () => {
    const html = renderToStaticMarkup(
      <CanvasSummaryPill vm={vm({ verdict: "ACTION", hasSnapshot: true })} />,
    );
    expect(html).toContain('data-testid="canvas-summary-pill"');
    expect(html).toContain('role="status"');
  });

  it("honors a custom aria-label", () => {
    const html = renderToStaticMarkup(
      <CanvasSummaryPill vm={vm({ hasSnapshot: true })} ariaLabel="TSLA canvas" />,
    );
    expect(html).toContain('aria-label="TSLA canvas"');
  });
});
