import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { categoryTabsFor } from "@/lib/charts/categoryTabsFor";

const dashboard = readFileSync(
  resolve(__dirname, "../components/chart/ChartsDashboard.tsx"),
  "utf8",
);
const css = readFileSync(resolve(__dirname, "../app/globals.css"), "utf8");
const mainChart = readFileSync(
  resolve(__dirname, "../components/chart/MainChart.tsx"),
  "utf8",
);

describe("charts category scene fusion", () => {
  it("returns the permanent category band to MARKET", () => {
    expect(dashboard).not.toContain('className="wm-chart-category-strip"');
    expect(dashboard.match(/className="wm-chart-tabs"/g)).toHaveLength(1);
  });

  it("retires the duplicate desktop Chart header without collapsing phone or secondary-view rows", () => {
    expect(dashboard.match(/wm-chart-room-header/g)?.length).toBeGreaterThanOrEqual(2);
    expect(dashboard).toContain('wm-chart-room-header--market-home');
    expect(dashboard).toMatch(/className="wm-chart-orientation-strip"[\s\S]*?flexShrink: 1,[\s\S]*?minWidth: 0/);
    expect(dashboard).toMatch(/className="wm-chart-tabs"[\s\S]*?height: 44,[\s\S]*?flexShrink: 1, minWidth: 0/);
    expect(css).toMatch(/\.wm-chart-room-header\s*\{[\s\S]*?display:\s*block/);
    expect(css).toMatch(/@media \(min-width: 1280px\)[\s\S]*?\.wm-chart-room-header\s*\{[\s\S]*?display:\s*flex[\s\S]*?min-height:\s*44px/);
    expect(css).toMatch(/\.wm-chart-room-header > \.wm-chart-tabs\s*\{[\s\S]*?flex:\s*0 1 auto[\s\S]*?min-width:\s*0[\s\S]*?border-left:/);
    expect(css).toMatch(/@media \(min-width: 1280px\)[\s\S]*?\.wm-chart-room-header--market-home\s*\{[\s\S]*?display:\s*none/);
    expect(dashboard).toMatch(/leadingSlot=\{[\s\S]*?wm-chart-toolbar-asset-class[\s\S]*?<AssetClassSwitcher/);
  });

  it("folds market standing into the desktop OHLC horizon without mounting a second reader", () => {
    expect(dashboard).toContain("const marketStanding = badge.displayable");
    expect(dashboard).toContain("marketStanding={marketStanding}");
    expect(dashboard.match(/selectRegimeBadge\(/g)).toHaveLength(1);
    expect(mainChart).toContain('className="wm-chart-market-standing"');
    expect(css).toMatch(/\.wm-chart-market-standing\s*\{[\s\S]*?position:\s*absolute/);
    expect(css).toMatch(/@media \(min-width: 1280px\)[\s\S]*?\.wm-chart-market-standing\s*\{[\s\S]*?position:\s*static/);
  });

  /**
   * REMAPPED 2026-09-19 — this test pinned `wm-chart-category-select` and
   * `aria-label="Symbol view category"`, i.e. the SPELLING of a permanently
   * visible `VIEW [CHART ▾]` destination picker in the masthead. That control
   * swapped the canvas (`display:none` on the chart panel for Worksheet /
   * Profile / fundamentals) while changing no URL — a destination selector
   * that could not be linked to, bookmarked, or undone with Back — and it is
   * named on the Last Mile canon §1 automatic-reject list.
   *
   * The LAW it was reaching for survives untouched and is what is pinned now:
   * the eight views have ONE canonical writer, they are ALL reachable, and
   * reaching them is keyboard-native. The door moved behind Tools; the organs
   * did not move at all. Per §5 the chrome is not restored to satisfy a test.
   *
   * Pinned from both sides so a tidy-up cannot quietly re-open the masthead.
   */
  it("keeps every view reachable from one canonical owner, with no masthead destination picker", () => {
    // The single writer is unchanged — still the only source of the list.
    expect(dashboard).toContain("categoryTabsFor(assetClass).map");
    // Reached deliberately, from Tools, through a real dialog.
    expect(dashboard).toContain('id="chart-views-sheet"');
    expect(dashboard).toContain("openViewShelf(toolsTriggerRef.current)");
    // Keyboard-native: real <button> rows, not a div listening for clicks.
    expect(dashboard).toContain("onClick={() => { setActiveTab(tab); setViewShelfOpen(false); }}");
    // And the corpse stays dead. Either half alone could be satisfied by
    // half a repair; together they can only be satisfied by the whole one.
    expect(dashboard).not.toContain('className="wm-chart-category-select"');
    expect(dashboard).not.toContain('aria-label="Symbol view category"');
    expect(dashboard).not.toContain("setActiveTab(event.target.value)");
  });

  /**
   * THE WAY BACK IS THE WHOLE POINT.
   *
   * On every non-Chart view the chart toolbar is deliberately not rendered
   * (`{(activeTab === "Chart" || activeTab === "Options") && <ChartToolbar`),
   * and with it the Tools → Views door. The masthead select used to be the
   * escape hatch. Removing it without a second door would have turned
   * "Worksheet" into a one-way trip — a strictly worse defect than the one
   * being repaired. This pins the second door to the one place the first
   * one cannot reach.
   */
  it("offers the view shelf a second door on exactly the views where the toolbar is absent", () => {
    expect(dashboard).toContain("openViewShelf(orientationToolsTriggerRef.current)");
    expect(dashboard).toMatch(/activeTab !== "Chart" && activeTab !== "Options" &&[\s\S]*?openViewShelf\(orientationToolsTriggerRef\.current\)/);
  });

  it("keeps secondary views inside the shared room instead of resetting their scene", () => {
    const fundamentalsPanel = dashboard.slice(dashboard.indexOf("function FundamentalsTabPanel"));
    expect(fundamentalsPanel).toContain('background:"transparent"');
    expect(fundamentalsPanel).not.toContain("{base} — {tab}");
  });

  it("renders the missing fundamentals provider as an honest contextual seam", () => {
    const fundamentalsPanel = dashboard.slice(dashboard.indexOf("function FundamentalsTabPanel"));
    const providerEdge = fundamentalsPanel.slice(
      fundamentalsPanel.indexOf('data-testid="fundamentals-provider-edge"'),
      fundamentalsPanel.indexOf("No {tab.toLowerCase()} data for {base}"),
    );

    expect(providerEdge).toContain('background:"transparent"');
    expect(providerEdge).toContain('borderLeft:"1px solid rgba(183, 138, 52, 0.42)"');
    expect(providerEdge).not.toContain('background:"#1a1410"');
    expect(providerEdge).not.toContain('border:"1px solid #5b3a12"');
    expect(providerEdge).toContain("providerEdge.edge");
    expect(providerEdge).toContain("providerEdge.missing");
    expect(providerEdge).toContain("will never fabricate placeholder");
  });

  it("preserves Chart, Options, and every applicable secondary destination", () => {
    expect(categoryTabsFor("equity")).toEqual([
      "Chart",
      "Absorption",
      "Aggression",
      "Big Trades",
      "Value Profile",
      "Continuation",
      "Worksheet",
      "Gravity",
      "Liquidity",
      "Options",
      "ETFs",
      "Financials",
      "Valuation",
      "Corporate Actions",
      "Shareholders",
      "Profile",
    ]);
  });
});
