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
    const bottomBar = source.indexOf("<BottomIndexBar", spine);

    expect(marketPanel, "chart MARKET panel is missing").toBeGreaterThan(0);
    expect(spine, "decision spine is missing").toBeGreaterThan(marketPanel);
    expect(bottomBar, "bottom market index bar is missing").toBeGreaterThan(spine);
  });

  it("attaches one desktop rail and falls back to one band on narrow/options views", () => {
    expect(source).toContain('!narrowViewport && !optionsOpen');
    expect(source).toContain('<DecisionSpineBand {...decisionSpineProps} presentation="rail" />');
    expect(source).toContain('(narrowViewport || optionsOpen)');
    expect(source).toContain('<DecisionSpineBand {...decisionSpineProps} presentation="band" />');
    expect(source.match(/const decisionSpineProps =/g)).toHaveLength(1);
  });

  it("does not put order-flow diagnostics above MARKET", () => {
    const marketPanel = source.indexOf('id="wm-chart-category-panel-chart"');
    const orderFlow = source.indexOf("<OrderFlowCockpitStrip");

    expect(orderFlow, "order-flow cockpit is missing").toBeGreaterThan(marketPanel);
  });
});
