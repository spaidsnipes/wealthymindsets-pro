/**
 * SENTINEL — the Aggression vs Response view (Canon Asset 03) must be reachable
 * on EVERY asset class, and it must not fall into the fundamentals arm.
 *
 * Same method and same reasoning as the Absorption sentinel beside this file,
 * for the same failure class: the regression is an OMISSION at a wiring site,
 * and an omission is invisible to a render test. `categoryTabsFor` returning
 * one fewer tab still returns a valid list; `ChartsDashboard` forgetting the
 * `!== "Aggression"` exclusion still renders A panel — the wrong one, silently,
 * as an empty reference surface.
 *
 * It carries one extra assertion the Absorption sentinel does not need: the
 * scatter's y-axis substitution. This view can plot either net aggression or
 * effort, and the difference between them is the difference between "who was
 * pushing" and "how much traded". The disclosure must reach the screen, so the
 * wiring for it is pinned rather than trusted.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { categoryTabsFor } from "@/lib/charts/categoryTabsFor";
import type { CanonicalAssetClass } from "@/lib/marketData/canonicalIdentity";

const CLASSES: readonly CanonicalAssetClass[] = ["equity", "etf", "options", "crypto", "futures", "forex"];

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * Colour literals are stripped before the art-direction scan, because an alpha
 * channel is not a reading. `rgba(216,207,184,0.34)` is the tone of a dimmed
 * dot; the mockup's `0.34` is an efficiency number with no owner. Without this
 * the scan flagged the first and would have gone on flagging every palette
 * change — a sentinel that cries wolf gets deleted, and then the real literal
 * walks in behind it.
 */
function stripColors(src: string): string {
  return src.replace(/rgba?\([^)]*\)/g, "").replace(/#[0-9a-fA-F]{3,8}\b/g, "");
}

describe("Aggression vs Response view wiring", () => {
  it.each(CLASSES)("is offered on %s", cls => {
    expect(categoryTabsFor(cls)).toContain("Aggression");
  });

  it("sits beside Chart and Absorption — the two microstructure siblings travel together", () => {
    for (const cls of CLASSES) {
      const tabs = categoryTabsFor(cls);
      expect(tabs[0]).toBe("Chart");
      expect(tabs[1]).toBe("Absorption");
      expect(tabs[2]).toBe("Aggression");
    }
  });

  it("ChartsDashboard renders the view and excludes it from the fundamentals arm", () => {
    const src = read("src/components/chart/ChartsDashboard.tsx");
    expect(src).toContain("<AggressionResponseView");
    expect(src).toContain('activeTab === "Aggression"');
    expect(src).toContain('activeTab !== "Aggression"');
  });

  it("the view is fed the same candles the chart drew, not a second fetch", () => {
    const src = read("src/components/chart/ChartsDashboard.tsx");
    expect(src).toContain("selectAggressionResponse");
    expect(src).toMatch(/aggressionResponseVM\s*=\s*React\.useMemo/);
    expect(src).toMatch(/\}, \[chartBars\]\)/);
  });

  it("does not synthesize an aggressor split from candle direction", () => {
    const src = read("src/components/chart/ChartsDashboard.tsx");
    expect(src).toMatch(/askVol:\s*null/);
    expect(src).toMatch(/bidVol:\s*null/);
  });

  it("THE SUBSTITUTION REACHES THE SCREEN: the view prints the axis note it was given", () => {
    // A scatter that silently swapped its own y term would keep its shape and
    // lose its meaning. The compiler makes the substitution a field; this
    // asserts the view actually renders it rather than accepting and ignoring
    // it — the most expensive kind of green.
    const src = stripComments(read("src/components/experience/AggressionResponseView.tsx"));
    expect(src).toContain("aggressionAxisNote");
    expect(src).toContain("aggressionAxis");
  });

  it("THE INCAPACITY REACHES THE SCREEN: an empty zone list is not printed as a finding", () => {
    // Measured live: on a thin crypto venue one 15m print held ~85% of the
    // window's volume, so every other bar's effortNorm sat near zero and no run
    // could clear the effort gate. The panel printed NO ZONE QUALIFIED — which
    // reads as a fact about the market and was a fact about the feed. The
    // compiler now publishes `zoneQualificationPossible`; this pins that the
    // view BRANCHES on it rather than accepting and ignoring it.
    const src = stripComments(read("src/components/experience/AggressionResponseView.tsx"));
    expect(src).toContain("zoneQualificationPossible");
    expect(src).toContain("effortSpreadNote");
    // The market claim must be reachable only through the capacity gate.
    expect(src).toMatch(/zoneQualificationPossible[\s\S]{0,200}NO ZONE QUALIFIED/);
  });

  it("the view never hard-codes the mockup's art-direction literals", () => {
    const src = stripColors(stripComments(read("src/components/experience/AggressionResponseView.tsx")));
    for (const literal of ["+0.62", "+2.1", "0.34", "412.7K", "18,732", "-2,552", "−2,552", "98.7"]) {
      expect(src, `${literal} is art direction, not data`).not.toContain(literal);
    }
  });

  it("ships no forward-looking implication and no conviction grade", () => {
    // The mockup's right rail carries CONVICTION HIGH and IMPLICATION:
    // SIDEWAYS / REVERSAL RISK. The first is a grade (§9); the second is a
    // prediction no selector in this repo owns.
    const src = stripComments(read("src/components/experience/AggressionResponseView.tsx"));
    expect(src).not.toMatch(/REVERSAL RISK/i);
    expect(src).not.toMatch(/CONVICTION/i);
    expect(src).not.toMatch(/HIGH PROBABILITY/i);
  });
});
