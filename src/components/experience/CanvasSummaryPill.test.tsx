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
    // state.unknowns are unresolved DIMENSIONS, which do not gate the verdict.
    // Labelling them "missing" beside a verdict read as a contradiction.
    expect(html).toContain("1 unresolved");
    expect(html).not.toContain("1 missing");
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

  it("renders as an interactive button when scrollToSelector is supplied (W14)", () => {
    const html = renderToStaticMarkup(
      <CanvasSummaryPill
        vm={vm({ verdict: "ACTION", hasSnapshot: true })}
        scrollToSelector='[data-testid="market-canvas-panel"]'
      />,
    );
    // Interactive variant emits a <button type="button"> and a jump-oriented
    // aria-label so screen readers announce the navigation.
    expect(html).toContain('<button');
    expect(html).toContain('type="button"');
    expect(html).toContain("jump to detail");
    // Non-interactive role="status" is NOT present in this variant.
    expect(html).not.toContain('role="status"');
  });

  it("stays a passive role=status element when scrollToSelector is omitted (default)", () => {
    const html = renderToStaticMarkup(
      <CanvasSummaryPill vm={vm({ verdict: "ACTION", hasSnapshot: true })} />,
    );
    expect(html).toContain('role="status"');
    expect(html).not.toContain('<button');
  });

  it("tooltip carries the headline + top blockers/invalidators/missing (X8 hover-truth)", () => {
    const html = renderToStaticMarkup(
      <CanvasSummaryPill
        vm={vm({
          verdict: "WAIT",
          hasSnapshot: true,
          headline: "Right-of-way is withheld — waiting on regime.",
          blockers: ["regime", "Active contradiction"],
          invalidators: [],
          missing: ["direction:unresolved", "location:unresolved"],
        })}
      />,
    );
    expect(html).toContain("title=");
    // The title attribute is HTML-escaped so &#x27; and &quot; can appear;
    // we check for the substring that must be present regardless of encoding.
    expect(html).toContain("Right-of-way is withheld");
    expect(html).toContain("Why not");
    expect(html).toContain("regime");
    expect(html).toContain("Unresolved dimensions");
    expect(html).toContain("do not gate the verdict");
  });

  it("honors a custom aria-label", () => {
    const html = renderToStaticMarkup(
      <CanvasSummaryPill vm={vm({ hasSnapshot: true })} ariaLabel="TSLA canvas" />,
    );
    expect(html).toContain('aria-label="TSLA canvas"');
  });
});
