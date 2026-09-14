import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { categoryTabsFor } from "@/lib/charts/categoryTabsFor";

const dashboard = readFileSync(
  resolve(__dirname, "../components/chart/ChartsDashboard.tsx"),
  "utf8",
);

describe("charts category scene fusion", () => {
  it("returns the permanent category band to MARKET", () => {
    expect(dashboard).not.toContain('className="wm-chart-category-strip"');
    expect(dashboard.match(/className="wm-chart-tabs"/g)).toHaveLength(1);
  });

  it("keeps one keyboard-native doorway wired to the canonical tab owner", () => {
    expect(dashboard).toContain('className="wm-chart-category-select"');
    expect(dashboard).toContain('aria-label="Symbol view category"');
    expect(dashboard).toContain("categoryTabsFor(assetClass).map");
    expect(dashboard).toContain("setActiveTab(event.target.value)");
  });

  it("preserves Chart, Options, and every applicable secondary destination", () => {
    expect(categoryTabsFor("equity")).toEqual([
      "Chart",
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
