/**
 * CanvasSummaryPill — regression lock for the one-line canvas summary.
 * Enforces the canon §Silence Is A Feature contract: a fully-silent VM
 * renders nothing.
 */

import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
    measured: [],
    blockers: [],
    clearances: [],
    invalidators: [],
    hasSnapshot: false,
    ...over,
    // Fixtures are not capped, so the honest default is the sample size. An
    // explicit blockerCount override models the CAPPED case.
    blockerCount: over.blockerCount ?? (over.blockers ?? []).length,
  };
}

describe("CanvasSummaryPill — canon §Phase 3 Market Canvas summary", () => {
  it("marks secondary counts for permanent-chrome semantic zoom while preserving the verdict", () => {
    const html = renderToStaticMarkup(
      <CanvasSummaryPill vm={vm({ verdict: "WAIT", hasSnapshot: true, blockers: ["Market data"] })} />,
    );
    expect(html).toContain("wm-canvas-summary-detail");
    expect(html).toContain("WAIT");
  });

  it("keeps the ledger out of permanent chart chrome on every viewport", () => {
    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
    const rule = css.indexOf(".wm-canvas-summary-detail {");
    const phoneQuery = css.indexOf("@media (max-width: 639px)");
    expect(rule).toBeGreaterThan(-1);
    expect(rule).toBeLessThan(phoneQuery);
    expect(css.slice(rule, phoneQuery)).toContain("display: none !important");
  });

  /**
   * FOUND FROM USE, production /charts?symbol=TSLA, 2026-09-18. The tooltip
   * read "+5 more — open the canvas" on a surface that renders no canvas and
   * gives the pill no `scrollToSelector`, so the pill was a static
   * `<div role="status">`. The withheld COUNT was true; the DIRECTION was not.
   */
  const manyBlockers = ["Regime", "Direction", "Auction", "Location", "Profile"];

  it("states the withheld count on a surface with no canvas — without directing there", () => {
    const html = renderToStaticMarkup(
      <CanvasSummaryPill vm={vm({ verdict: "WAIT", hasSnapshot: true, blockers: manyBlockers })} />,
    );
    expect(html).toContain("+2 more");
    expect(html, "no canvas on this surface — the pill must not send the trader to one")
      .not.toContain("open the canvas");
    // …and it is genuinely the non-control rendering, which is WHY.
    expect(html).toContain('role="status"');
  });

  it("earns the direction when it is actually the control that reaches the canvas", () => {
    const html = renderToStaticMarkup(
      <CanvasSummaryPill
        vm={vm({ verdict: "WAIT", hasSnapshot: true, blockers: manyBlockers })}
        scrollToSelector="#market-canvas"
      />,
    );
    expect(html).toContain("+2 more — open the canvas");
    expect(html).toContain("<button");
  });

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
    expect(html).toContain("1 blocker");
    expect(html).toContain("2 cleared");
  });

  it("says 'blocker' at one and 'blockers' above one", () => {
    const render = (blockers: string[]) =>
      renderToStaticMarkup(
        <CanvasSummaryPill vm={vm({ verdict: "NO TRADE", hasSnapshot: true, blockers })} />,
      );

    // Production /charts was rendering "NO TRADE · 8 unresolved · 1 blockers ·
    // 1 cleared". One blocker is the single most common real state on a live
    // chart, so this was the DEFAULT reading, not an edge case.
    //
    // Asserted with a NEGATIVE on the plural rather than only a positive on
    // the singular: "1 blocker" is a substring of "1 blockers", so a
    // toContain("1 blocker") check alone stays green while the bug is fully
    // present. That shape of test looks like proof and proves nothing.
    const one = render(["regime"]);
    expect(one).toContain("1 blocker");
    expect(one).not.toContain("1 blockers");

    // The plural half must keep working — a fix that hard-codes the singular
    // is the same defect wearing the other hat.
    const two = render(["regime", "Active contradiction"]);
    expect(two).toContain("2 blockers");
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

  /**
   * A DESTINATION THAT IS NOT ON THE PAGE IS STILL A DESTINATION.
   *
   * `edde7236` made this pill stop telling a trader to "open the canvas" on
   * /charts, where there is no canvas to scroll to. Honest — and it left a
   * count of blockers with nowhere to go, which the 2026-09-18 baton recorded
   * as OPEN. The chart room's Market Reality is PRESS-GATED equipment: it is
   * genuinely absent until requested, so a scroll selector could never reach
   * it. These cases are the door, and the guard on pointing at a wrong one.
   */
  describe("the equipment door", () => {
    const anyVM = () => vm({ verdict: "WAIT", hasSnapshot: true, blockers: ["regime"] });

    it("becomes a control, and names the door in the rail's own words", () => {
      const html = renderToStaticMarkup(
        <CanvasSummaryPill
          vm={anyVM()}
          openEquipment={{ roomHref: "/charts", id: "market-reality" }}
        />,
      );
      expect(html).toContain("<button");
      expect(html).toContain('data-equipment-open="market-reality"');
      // The label is LOOKED UP, never typed here — so the pill and the rail
      // cannot drift into two names for one destination.
      expect(html).toContain("open Market reality");
      expect(html).not.toContain('role="status"');
    });

    it("REFUSES a door this room does not have", () => {
      // The whole point of handing down the ROOM as well as the id. /charts
      // lists no "decision-chain" equipment, so offering to open one would be
      // exactly the defect `edde7236` cured, reintroduced by a typo.
      const html = renderToStaticMarkup(
        <CanvasSummaryPill
          vm={anyVM()}
          openEquipment={{ roomHref: "/charts", id: "decision-chain" }}
        />,
      );
      expect(html).toContain('role="status"');
      expect(html).not.toContain("<button");
      expect(html).not.toMatch(/open /);
    });

    it("a surface that hands down no door is unchanged", () => {
      const html = renderToStaticMarkup(<CanvasSummaryPill vm={anyVM()} />);
      expect(html).toContain('role="status"');
      expect(html).not.toMatch(/ — open /);
    });
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
