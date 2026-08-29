/**
 * CanvasBadgeMini — compact verdict-only badge. Locks silent behavior
 * + verdict token + data attributes for downstream tests.
 */

import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CanvasBadgeMini } from "./CanvasBadgeMini";
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

describe("CanvasBadgeMini — canon §Phase 3 Market Canvas compact badge", () => {
  it("renders nothing when hasSnapshot=false AND verdict=UNKNOWN (canon §Silence)", () => {
    const html = renderToStaticMarkup(<CanvasBadgeMini vm={vm()} />);
    expect(html).toBe("");
  });

  it("renders when a snapshot has been observed even if verdict is UNKNOWN", () => {
    const html = renderToStaticMarkup(
      <CanvasBadgeMini vm={vm({ hasSnapshot: true })} />,
    );
    expect(html).toContain('data-testid="canvas-badge-mini"');
    expect(html).toContain('data-verdict="UNKNOWN"');
  });

  it("renders each of the 5 canonical verdicts with the exact text", () => {
    for (const v of ["ACTION", "CAUTION", "WAIT", "NO TRADE"] as const) {
      const html = renderToStaticMarkup(
        <CanvasBadgeMini vm={vm({ verdict: v, hasSnapshot: true })} />,
      );
      expect(html).toContain(`data-verdict="${v}"`);
      // The verdict text is uppercase-styled but rendered verbatim.
      expect(html).toContain(`>${v}<`);
    }
  });

  it("tooltip carries the headline for hover-truth", () => {
    const html = renderToStaticMarkup(
      <CanvasBadgeMini
        vm={vm({
          verdict: "WAIT",
          hasSnapshot: true,
          headline: "Right-of-way is withheld — need direction.",
        })}
      />,
    );
    expect(html).toContain("Right-of-way is withheld");
  });

  it("honors a custom aria-label", () => {
    const html = renderToStaticMarkup(
      <CanvasBadgeMini
        vm={vm({ verdict: "ACTION", hasSnapshot: true, clear: true })}
        ariaLabel="NQ1! canvas verdict"
      />,
    );
    expect(html).toContain('aria-label="NQ1! canvas verdict"');
  });
});
