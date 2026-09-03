/**
 * MarketCanvasPanel — regression lock for canon §Phase 3 Market Canvas.
 * Pins the visible tokens for MISSING / WHY NOT / WOULD INVALIDATE
 * strips so a silent refactor cannot drop a corner.
 */

import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarketCanvasPanel } from "./MarketCanvasPanel";
import type { MarketCanvasVM } from "@/lib/marketData/viewModels/selectMarketCanvas";

function vm(over: Partial<MarketCanvasVM> = {}): MarketCanvasVM {
  return {
    version: "wm.market-canvas.v1",
    verdict: "ACTION",
    clear: true,
    headline: "Right-of-way is granted — the path is clear.",
    missing: [],
    resolved: [],
    blockers: [],
    clearances: [],
    invalidators: [],
    hasSnapshot: true,
    ...over,
  };
}

describe("MarketCanvasPanel — canon §Phase 3 Market Canvas", () => {
  it("renders the header + verdict + headline for the honest-silent VM", () => {
    const html = renderToStaticMarkup(<MarketCanvasPanel vm={vm()} />);
    expect(html).toContain("Market canvas");
    expect(html).toContain("ACTION");
    expect(html).toContain("Right-of-way is granted");
    expect(html).toContain('data-testid="market-canvas-panel"');
  });

  it("renders the RESOLVED strip only when resolved[] has entries (canon §Silence Is A Feature)", () => {
    const empty = renderToStaticMarkup(<MarketCanvasPanel vm={vm({ resolved: [] })} />);
    expect(empty).not.toContain("market-canvas-resolved");

    const populated = renderToStaticMarkup(
      <MarketCanvasPanel vm={vm({ resolved: ["direction", "regime"] })} />,
    );
    expect(populated).toContain("market-canvas-resolved");
    expect(populated).toContain("Resolved (2)");
    expect(populated).toContain("direction, regime");
  });

  it("renders the MISSING strip only when missing[] has entries (canon §Silence Is A Feature)", () => {
    const empty = renderToStaticMarkup(<MarketCanvasPanel vm={vm({ missing: [] })} />);
    expect(empty).not.toContain("market-canvas-missing");

    const populated = renderToStaticMarkup(
      <MarketCanvasPanel vm={vm({ missing: ["direction:unresolved", "regime:unresolved"] })} />,
    );
    expect(populated).toContain("market-canvas-missing");
    expect(populated).toContain("Unresolved (2)");
    expect(populated).toContain("direction:unresolved");
    expect(populated).toContain("regime:unresolved");
  });

  it("truncates a large missing list with '+N more'", () => {
    const missing = Array.from({ length: 9 }, (_, i) => `dim-${i}`);
    const html = renderToStaticMarkup(<MarketCanvasPanel vm={vm({ missing })} />);
    expect(html).toContain("+3 more");
  });

  it("renders the WHY NOT strip only when blockers[] has entries", () => {
    const empty = renderToStaticMarkup(<MarketCanvasPanel vm={vm({ blockers: [] })} />);
    expect(empty).not.toContain("market-canvas-blockers");

    const populated = renderToStaticMarkup(
      <MarketCanvasPanel vm={vm({ blockers: ["Active contradiction", "regime"] })} />,
    );
    expect(populated).toContain("market-canvas-blockers");
    expect(populated).toContain("Why not (2)");
    expect(populated).toContain("Active contradiction");
    expect(populated).toContain("regime");
  });

  it("renders the CLEARED strip only when clearances[] has entries (canon §Silence Is A Feature)", () => {
    const empty = renderToStaticMarkup(<MarketCanvasPanel vm={vm({ clearances: [] })} />);
    expect(empty).not.toContain("market-canvas-clearances");

    const populated = renderToStaticMarkup(
      <MarketCanvasPanel vm={vm({ clearances: ["No active contradiction to the thesis.", "3/9 evidence nodes paid."] })} />,
    );
    expect(populated).toContain("market-canvas-clearances");
    expect(populated).toContain("Cleared (2)");
    expect(populated).toContain("No active contradiction to the thesis.");
    expect(populated).toContain("3/9 evidence nodes paid.");
  });

  it("renders the WOULD INVALIDATE strip only when invalidators[] has entries", () => {
    const empty = renderToStaticMarkup(<MarketCanvasPanel vm={vm({ invalidators: [] })} />);
    expect(empty).not.toContain("market-canvas-invalidators");

    const populated = renderToStaticMarkup(
      <MarketCanvasPanel vm={vm({ invalidators: ["A contradiction emerges."] })} />,
    );
    expect(populated).toContain("market-canvas-invalidators");
    expect(populated).toContain("Would invalidate");
    expect(populated).toContain("A contradiction emerges.");
  });

  it("renders all three corners at once when a full canvas is supplied", () => {
    const html = renderToStaticMarkup(
      <MarketCanvasPanel
        vm={vm({
          verdict: "WAIT",
          clear: false,
          missing: ["direction:unresolved"],
          blockers: ["regime"],
          invalidators: [],
        })}
      />,
    );
    expect(html).toContain("market-canvas-missing");
    expect(html).toContain("market-canvas-blockers");
    // WAIT verdict → no invalidators surfaced by upstream, so strip is absent
    expect(html).not.toContain("market-canvas-invalidators");
  });
});
