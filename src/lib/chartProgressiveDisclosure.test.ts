import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const toolbar = readFileSync(resolve(process.cwd(), "src/components/chart/ChartToolbar.tsx"), "utf8");
const dashboard = readFileSync(resolve(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8");

describe("chart progressive disclosure", () => {
  it("keeps the trading decision controls and broker entry primary", () => {
    expect(toolbar).toContain("TIMEFRAMES.map");
    expect(toolbar).toContain("RTH — Regular Hours");
    expect(toolbar).toContain("Indicators");
    expect(toolbar).toContain("Connect brokers");
  });

  it("moves secondary chart utilities into one accessible tools menu", () => {
    expect(toolbar).toContain('aria-haspopup="menu"');
    expect(toolbar).toContain('role="menu"');
    expect(toolbar).toContain('role="menuitem"');
    expect(toolbar).toContain("Depth ladder");
    expect(toolbar).toContain("Flow &amp; studies");
    expect(toolbar).toContain("Pine workspace");
    expect(toolbar).toContain("Chart settings");
  });

  it("keeps the dense flow and study strip closed until the trader asks for it", () => {
    expect(dashboard).toContain("studyToolsOpen && <div className=\"wm-chart-tools");
    expect(dashboard).toContain("onToggleStudyTools={() => setStudyToolsOpen(open => !open)}");
  });

  it("keeps unresolved infrastructure out of permanent chart chrome", () => {
    expect(dashboard).not.toContain("LIQUIDITY WEATHER · NOT WIRED");
    expect(dashboard).not.toContain("ROW · {chartPermission.verdict}");
    expect(dashboard).toContain("<CanvasSummaryPill");
    expect(dashboard).toContain("Open Decision Why");
  });

  it("lets the global shell own product identity and starts with chart orientation", () => {
    expect(dashboard).not.toContain('import WmWordmark from "@/components/brand/WmWordmark"');
    expect(dashboard).not.toContain("the trader's chart");
    expect(dashboard).toContain('aria-label="Breadcrumb"');
    expect(dashboard).toContain("{symbol}");
    expect(dashboard).toContain('{activeTab !== "Chart"');
    expect(dashboard).toContain("<CanvasSummaryPill");
    expect(dashboard).toContain("Open Decision Why");
    expect(dashboard).toContain("Open Market Object Passport");
  });

  it("keeps the menu viewport-bound instead of extending the toolbar", () => {
    expect(toolbar).toContain('position: "fixed"');
    expect(toolbar).toContain("window.innerWidth - (rect?.right ?? window.innerWidth)");
  });
});
