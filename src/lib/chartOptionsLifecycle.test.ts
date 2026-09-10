import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/chart/ChartsDashboard.tsx", "utf8");

describe("chart options lifecycle ownership", () => {
  it("derives the drawer from the synchronous effective category", () => {
    expect(source).toContain("const activeTab = effectiveCategoryTab(assetClass, requestedTab);");
    expect(source).toContain('const optionsOpen = activeTab === "Options";');
    expect(source).not.toMatch(/useState\(false\).*optionsOpen|setOptionsOpen/);
  });

  it("returns to Chart and clears the exact selection in one close transition", () => {
    expect(source).toContain('onClose={() => { clearOptionSelection(); setActiveTab("Chart"); }}');
  });

  it("does not mount or fetch the options surface for an ineligible effective tab", () => {
    expect(source).toContain("{optionsOpen && (");
    expect(source).toContain("if (requestedTab !== activeTab) {");
    expect(source).toContain("clearOptionSelection();");
  });
});
