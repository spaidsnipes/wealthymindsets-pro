/**
 * SENTINEL — a microstructure view may not take the candles away.
 *
 * The Founder asks three questions of every invention that ships. The second is
 * *"Is it now useful while candles remain visible?"* For the four microstructure
 * views the honest answer was NO, and for a structural reason rather than an
 * oversight: they were wired as plain siblings of `Chart` on one category
 * strip, so selecting one necessarily deselected the other.
 *
 * That is worse than it sounds. Every one of these four answers a question
 * ABOUT price — was that bar absorbed, was the side pressing paid for its
 * effort, was that one print large, where did this auction actually trade. The
 * reading always ends with the trader asking WHERE, and if price is not on the
 * screen the answer has to be memorised and carried back. A level carried in
 * the head is a level that drifts.
 *
 * The regression class here is the usual one: an OMISSION at a wiring site that
 * renders something rather than nothing. A fifth microstructure view added to
 * the strip but not to `MICROSTRUCTURE_TABS` would ship as a full-screen
 * takeover and look perfectly fine. So the SET is asserted, not just the
 * behaviour of the four that exist today.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  MICROSTRUCTURE_TABS,
  isMicrostructureTab,
  categoryTabsFor,
  ALL_CATEGORY_TABS,
} from "@/lib/charts/categoryTabsFor";
import { stripComments } from "@/lib/sourceScan";
import type { CanonicalAssetClass } from "@/lib/marketData/canonicalIdentity";

const CLASSES: readonly CanonicalAssetClass[] = ["equity", "etf", "options", "crypto", "futures", "forex"];

function dashboard(): string {
  return stripComments(
    fs.readFileSync(path.join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8"),
  );
}

describe("the microstructure set", () => {
  it("names exactly the four tape-reading views", () => {
    expect([...MICROSTRUCTURE_TABS]).toEqual([
      "Absorption",
      "Aggression",
      "Big Trades",
      "Value Profile",
    ]);
  });

  it("every member is a real tab, and Chart is not one of them", () => {
    for (const tab of MICROSTRUCTURE_TABS) {
      expect(ALL_CATEGORY_TABS).toContain(tab);
    }
    // Chart is the thing they must be shown BESIDE, so it can never be a
    // member — if it were, the split would try to stack the chart on itself.
    expect(isMicrostructureTab("Chart")).toBe(false);
    expect(isMicrostructureTab("Options")).toBe(false);
    expect(isMicrostructureTab("Profile")).toBe(false);
  });

  it("is offered on every asset class, so the split is never class-conditional", () => {
    for (const cls of CLASSES) {
      const tabs = categoryTabsFor(cls);
      for (const tab of MICROSTRUCTURE_TABS) {
        expect(tabs, `${tab} missing on ${cls}`).toContain(tab);
      }
    }
  });
});

describe("ChartsDashboard keeps price on screen beneath the reading", () => {
  it("THE CANDLES SURVIVE: the chart panel is shown for microstructure tabs", () => {
    const src = dashboard();
    // The old condition was `activeTab === "Chart" || activeTab === "Options"`
    // and nothing else. The predicate must be part of the display decision.
    expect(src).toMatch(
      /display:\s*\(activeTab === "Chart" \|\| activeTab === "Options" \|\| isMicrostructureTab\(activeTab\)\)/,
    );
  });

  it("the chart is given a bounded share, not the whole column", () => {
    const src = dashboard();
    // A microstructure reading is the subject; the chart is context for the
    // "where" it provokes. If the chart kept `flex:1` the two would fight for
    // the column and the reading would be squeezed to nothing on short screens.
    expect(src).toMatch(/flex:\s*isMicrostructureTab\(activeTab\)\s*\?\s*"0 0 42%"\s*:\s*1/);
  });

  it("price sits ABOVE the reading without the source being reordered", () => {
    const src = dashboard();
    expect(src).toMatch(/order:\s*isMicrostructureTab\(activeTab\)\s*\?\s*-1\s*:\s*0/);
    // The exclusion guards for the four views are pinned by their own
    // sentinels, which read this file literally. Moving the chart's JSX above
    // them to reorder the screen would move those guards out from under the
    // checks that prove they still exist. `order` achieves the layout without
    // touching a line any other sentinel is standing on.
    const chartPanel = src.indexOf('id="wm-chart-category-panel-chart"');
    for (const id of [
      "wm-chart-category-panel-absorption",
      "wm-chart-category-panel-aggression",
      "wm-chart-category-panel-big-trades",
      "wm-chart-category-panel-value-profile",
    ]) {
      const at = src.indexOf(`id="${id}"`);
      expect(at, `${id} not found`).toBeGreaterThan(-1);
      expect(at, `${id} must still precede the chart panel in source`).toBeLessThan(chartPanel);
    }
  });

  it("the chart is still never unmounted — hidden, so drawings survive a tab trip", () => {
    const src = dashboard();
    // `display: "none"` rather than a conditional render is the whole reason
    // this change was cheap. If the panel ever becomes `{cond && <div…>}` the
    // chart is torn down on every tab switch and every drawing goes with it.
    expect(src).toMatch(/id="wm-chart-category-panel-chart"[\s\S]{0,400}:\s*"none"/);
  });
});
