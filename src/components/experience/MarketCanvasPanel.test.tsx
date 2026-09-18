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
    measured: [],
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

describe("MarketCanvasPanel — `unabridged` composes sideways, and changes nothing else", () => {
  const full = (over = {}) =>
    renderToStaticMarkup(<MarketCanvasPanel vm={vm(over)} unabridged />);

  it("lays the ledgers out as columns when it is handed the whole screen", () => {
    // The defect this pins: at FULL the four ledgers ran as one 11px column
    // down the left of a 1568px screen with two thirds of it black. ENTER is
    // supposed to buy a complete professional visual experience; a stretched
    // drawer is a resize. `grid` is the whole claim — assert the declaration,
    // not a class name that a refactor could keep while dropping the layout.
    const html = full({ missing: ["Direction"], blockers: ["Regime"] });
    expect(html).toContain('data-testid="market-canvas-ledgers"');
    expect(html).toMatch(/market-canvas-ledgers[^>]*display:grid/);
  });

  it("does NOT lay them out sideways in a drawer — the tight slot has no sideways", () => {
    // Same wrapper element, no grid. If this ever matched, every consumer of
    // the panel — the deck beneath the chart, the journal detail — would have
    // silently become three narrow columns in a slot built for one.
    const drawer = renderToStaticMarkup(
      <MarketCanvasPanel vm={vm({ missing: ["Direction"], blockers: ["Regime"] })} />,
    );
    expect(drawer).toContain('data-testid="market-canvas-ledgers"');
    expect(drawer).not.toMatch(/market-canvas-ledgers[^>]*display:grid/);
  });

  it("keeps WOULD INVALIDATE OUT of the grid — it is the rule under the canvas, not a column", () => {
    // It names the one observation that would flip the verdict every ledger
    // above just argued for. As a fourth column it reads as a peer of them;
    // its borderTop only means "beneath all of this" if it spans all of this.
    const html = full({ missing: ["Direction"], invalidators: ["A verified engine publishes."] });
    const grid = html.indexOf("market-canvas-ledgers");
    const invalidators = html.indexOf("market-canvas-invalidators");
    expect(grid).toBeGreaterThan(-1);
    expect(invalidators).toBeGreaterThan(-1);
    // The grid wrapper CLOSES before the invalidators block opens.
    expect(html.slice(grid, invalidators)).toContain("</div>");
  });

  it("arrangement is not disclosure — the shortfall lines survive the columns", () => {
    // A layout atom is exactly the kind of change that quietly drops a line.
    const html = full({ blockers: ["Regime", "Direction", "Location"], blockerCount: 9 });
    expect(html).toContain("+6 more blocking, not named here");
  });
});
