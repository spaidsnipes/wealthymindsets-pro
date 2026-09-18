import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { categoryTabsFor } from "@/lib/charts/categoryTabsFor";

const dashboard = readFileSync(
  resolve(__dirname, "../components/chart/ChartsDashboard.tsx"),
  "utf8",
);
const css = readFileSync(resolve(__dirname, "../app/globals.css"), "utf8");

describe("charts category scene fusion", () => {
  it("returns the permanent category band to MARKET", () => {
    expect(dashboard).not.toContain('className="wm-chart-category-strip"');
    expect(dashboard.match(/className="wm-chart-tabs"/g)).toHaveLength(1);
  });

  it("shares one desktop room header without collapsing phone touch rows", () => {
    expect(dashboard.match(/className="wm-chart-room-header"/g)).toHaveLength(1);
    expect(dashboard).toMatch(/className="wm-chart-room-header"[\s\S]*?className="wm-chart-orientation-strip"[\s\S]*?className="wm-chart-tabs"/);
    expect(dashboard).toMatch(/className="wm-chart-orientation-strip"[\s\S]*?flexShrink: 1,[\s\S]*?minWidth: 0/);
    expect(dashboard).toMatch(/className="wm-chart-tabs"[\s\S]*?height: 44,[\s\S]*?flexShrink: 1, minWidth: 0/);
    expect(css).toMatch(/\.wm-chart-room-header\s*\{[\s\S]*?display:\s*block/);
    expect(css).toMatch(/@media \(min-width: 1280px\)[\s\S]*?\.wm-chart-room-header\s*\{[\s\S]*?display:\s*flex[\s\S]*?min-height:\s*44px/);
    expect(css).toMatch(/\.wm-chart-room-header > \.wm-chart-tabs\s*\{[\s\S]*?flex:\s*0 1 auto[\s\S]*?min-width:\s*0[\s\S]*?border-left:/);
  });

  it("keeps one keyboard-native doorway wired to the canonical tab owner", () => {
    expect(dashboard).toContain('className="wm-chart-category-select"');
    expect(dashboard).toContain('aria-label="Symbol view category"');
    expect(dashboard).toContain("categoryTabsFor(assetClass).map");
    expect(dashboard).toContain("setActiveTab(event.target.value)");
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
