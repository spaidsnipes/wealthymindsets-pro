import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/components/chart/ChartsDashboard.tsx"),
  "utf8",
);

describe("charts Asset-10 hierarchy", () => {
  it("renders MARKET before the supporting decision spine", () => {
    const marketPanel = source.indexOf('id="wm-chart-category-panel-chart"');
    const spine = source.indexOf("<DecisionSpineBand");

    expect(marketPanel, "chart MARKET panel is missing").toBeGreaterThan(0);
    expect(spine, "decision spine is missing").toBeGreaterThan(marketPanel);
    expect(source).not.toContain("<BottomIndexBar");
  });

  it("attaches one desktop rail and falls back to one band on narrow/options views", () => {
    expect(source).toContain('!narrowViewport && !optionsOpen');
    expect(source).toContain('<DecisionSpineBand {...decisionSpineProps} presentation="rail" />');
    expect(source).toContain('(narrowViewport || optionsOpen)');
    expect(source).toContain('<DecisionSpineBand {...decisionSpineProps} presentation="band" />');
    expect(source.match(/const decisionSpineProps =/g)).toHaveLength(1);
  });

  it("keeps order-flow evidence behind the Smart Money doorway", () => {
    expect(source).not.toContain("<OrderFlowCockpitStrip");
    expect(source.match(/<SmartMoneyPanel/g)).toHaveLength(1);
    expect(source).toContain("smartMoneyOpen");
  });
});
