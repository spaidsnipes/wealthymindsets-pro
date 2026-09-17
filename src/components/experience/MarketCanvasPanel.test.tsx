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
    // Fixtures are not capped, so the honest default is the sample size. An
    // explicit blockerCount override models the CAPPED case.
    blockerCount: over.blockerCount ?? (over.blockers ?? []).length,
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

describe("MarketCanvasPanel — `unabridged` is depth, and only where depth is owed", () => {
  const nine = (label: string) => Array.from({ length: 9 }, (_, i) => `${label} ${i + 1}`);

  it("caps each list at six by default — the panel normally lives in a tight slot", () => {
    const html = renderToStaticMarkup(<MarketCanvasPanel vm={vm({ missing: nine("Dim") })} />);
    expect(html).toContain("Dim 6");
    expect(html).not.toContain("Dim 7");
    expect(html).toContain("+3 more");
  });

  it("names every row it was handed when given the screen", () => {
    const html = renderToStaticMarkup(
      <MarketCanvasPanel vm={vm({ missing: nine("Dim"), clearances: nine("Check") })} unabridged />,
    );
    for (let i = 1; i <= 9; i += 1) {
      expect(html, `unabridged withheld "Dim ${i}"`).toContain(`Dim ${i}`);
      expect(html, `unabridged withheld "Check ${i}"`).toContain(`Check ${i}`);
    }
    expect(html, "nothing is being withheld, so nothing may claim to be").not.toContain("more");
  });

  it("STILL names the blocker shortfall when unabridged — a bigger screen is not more data", () => {
    // The blockers array arrives from the compiler already capped at 3 labels
    // per evidence bucket. Those labels do not exist at this layer, so a full
    // screen cannot print them. If `unabridged` silenced this line, the full
    // experience would read as a complete list of reasons the trader cannot
    // trade while quietly concealing six of them — the most expensive shape of
    // lie this surface can tell, told only at the depth the trader trusts most.
    const html = renderToStaticMarkup(
      <MarketCanvasPanel vm={vm({ blockers: ["Regime", "Direction", "Location"], blockerCount: 9 })} unabridged />,
    );
    expect(html).toContain('data-testid="market-canvas-blockers-remainder"');
    expect(html).toContain("+6 more blocking, not named here");
  });

  it("is capped-by-default so no existing consumer silently changes shape", () => {
    const capped = renderToStaticMarkup(<MarketCanvasPanel vm={vm({ missing: nine("Dim") })} />);
    const explicit = renderToStaticMarkup(
      <MarketCanvasPanel vm={vm({ missing: nine("Dim") })} unabridged={false} />,
    );
    expect(capped).toBe(explicit);
  });
});
