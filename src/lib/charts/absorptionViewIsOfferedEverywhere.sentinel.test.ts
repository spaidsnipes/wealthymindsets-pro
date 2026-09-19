/**
 * SENTINEL — the Absorption view must be reachable on EVERY asset class, and
 * it must not fall into the fundamentals arm.
 *
 * WHY A SENTINEL AND NOT JUST A UNIT TEST.
 *
 * The failure this guards is an OMISSION at a wiring site, and a render test
 * cannot see an omission: `categoryTabsFor` returning one fewer tab still
 * returns a valid list, and `ChartsDashboard` forgetting the `!== "Absorption"`
 * exclusion still renders A panel — the wrong one, silently, as an empty
 * reference surface. Both regressions are green under every behavioural test
 * in this repo. So the wiring is asserted directly.
 *
 * The rule itself is a truth rule, not a taste rule. On a symbol whose feed
 * carries no aggressor side the view renders honestly empty and says why.
 * Hiding it on those classes would make the missing input invisible, which is
 * the opposite of what the drawer's missing-aggressor banner exists to do.
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

/**
 * The comments in these files QUOTE the mockup's art-direction literals in
 * order to forbid them. A naive substring scan finds the paragraph explaining
 * why 82% may never be rendered and calls it a violation — and, worse, would
 * keep passing on a file where the explanation was deleted and the number was
 * hard-coded into a JSX node instead.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("Absorption view wiring", () => {
  it.each(CLASSES)("is offered on %s", cls => {
    expect(categoryTabsFor(cls)).toContain("Absorption");
  });

  it("sits immediately beside Chart — it is a sibling of the chart, not a fundamentals tab", () => {
    for (const cls of CLASSES) {
      const tabs = categoryTabsFor(cls);
      expect(tabs[0]).toBe("Chart");
      expect(tabs[1]).toBe("Absorption");
    }
  });

  it("ChartsDashboard renders the view and excludes it from the fundamentals arm", () => {
    const src = read("src/components/chart/ChartsDashboard.tsx");
    expect(src).toContain("<AbsorptionAnatomyView");
    expect(src).toContain('activeTab === "Absorption"');
    // Without this exclusion the tab falls through to FundamentalsTabPanel and
    // renders an empty reference surface instead of the view.
    expect(src).toContain('activeTab !== "Absorption"');
  });

  /**
   * REMODELLED 2026-09-18, in the same change as the implementation.
   *
   * The fact this guards has not changed: the view measures the candles the
   * chart drew, not a second fetch. What changed is the SHAPE of the wiring.
   * This used to assert that the memo literally closed with `}, [chartBars])`,
   * which was a proxy for the fact and only held while the bar mapping lived
   * inside this one memo. The mapping is now shared with the Aggression
   * Response scatter — one `anatomyInput` memo instead of two verbatim copies —
   * so the derivation is two hops: chartBars → anatomyInput → VM.
   *
   * The old assertion would have failed a change that made the guarantee
   * STRONGER, which is the signature of a test defending a shape rather than a
   * fact. It is replaced by a trace of the whole chain, which the one-line
   * proxy could not express: the input is mapped from chartBars, it re-measures
   * when chartBars changes, and the VM is compiled from that input.
   */
  it("the view is fed the same candles the chart drew, not a second fetch", () => {
    const src = read("src/components/chart/ChartsDashboard.tsx");
    expect(src).toContain("selectAbsorptionAnatomyView");
    // Hop 1 — the anatomy input is mapped from the chart's own bars, and is
    // memoised on them, so a new window is genuinely re-measured.
    expect(src, "anatomyInput is mapped from chartBars").toMatch(
      /anatomyInput\s*=\s*React\.useMemo[\s\S]{0,300}?chartBars\.map\(/,
    );
    expect(src, "anatomyInput re-measures when chartBars changes").toMatch(
      /anatomyInput\s*=\s*React\.useMemo[\s\S]{0,600}?\[chartBars\]\)/,
    );
    // Hop 2 — the view model is compiled from that input and nothing else.
    expect(src, "the VM reads the shared input").toMatch(
      /selectAbsorptionAnatomyView\(\s*anatomyInput\s*,/,
    );
    expect(src).toMatch(/absorptionAnatomyVM\s*=\s*React\.useMemo/);
  });

  it("does not synthesize an aggressor split from candle direction", () => {
    const src = read("src/components/chart/ChartsDashboard.tsx");
    // The call site must hand the selector nulls, so the basis resolves to
    // VOLUME and the view discloses it, rather than manufacturing a delta.
    expect(src).toMatch(/askVol:\s*null/);
    expect(src).toMatch(/bidVol:\s*null/);
  });

  it("the view never hard-codes the mockup's art-direction literals", () => {
    const src = stripComments(read("src/components/experience/AbsorptionAnatomyView.tsx"));
    for (const literal of ["82%", "18,732", "-2,552", "−2,552", "7.42", "98.7"]) {
      expect(src).not.toContain(literal);
    }
  });
});
