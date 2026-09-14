import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const toolbar = readFileSync(resolve(process.cwd(), "src/components/chart/ChartToolbar.tsx"), "utf8");
const dashboard = readFileSync(resolve(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8");

describe("chart progressive disclosure", () => {
  it("keeps trading decision controls primary", () => {
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
    expect(toolbar).toContain("Capture &amp; share");
    expect(toolbar).toContain('aria-controls="wm-broker-connect"');
    expect(toolbar).toContain("onConnectBrokers();");
    expect(toolbar).toContain("Chart settings");
  });

  it("keeps provider setup behind the persistent Tools doorway", () => {
    const menuStart = toolbar.indexOf('role="menu"');
    const menuEnd = toolbar.indexOf("</div>", menuStart);
    const brokerEntry = toolbar.indexOf("Connect brokers");
    expect(menuStart).toBeGreaterThan(-1);
    expect(brokerEntry).toBeGreaterThan(menuStart);
    expect(brokerEntry).toBeLessThan(menuEnd);
    expect(toolbar).not.toContain('aria-label="Connect one or more brokers"');
    expect(dashboard).toContain("openBrokerConnect(toolsTriggerRef.current)");
  });

  it("rehomes capture and share behind Tools without changing its drawer owner", () => {
    const menuStart = toolbar.indexOf('role="menu"');
    const menuEnd = toolbar.indexOf("</div>", menuStart);
    const menu = toolbar.slice(menuStart, menuEnd);
    expect(menu).toContain("onCapture();");
    expect(menu).toContain("Capture &amp; share");
    expect(menu).toContain('aria-haspopup="dialog"');
    expect(menu).toContain('aria-controls="chart-tools-sheet"');
    expect(dashboard).toContain("onCapture={() => openCaptureShare(toolsTriggerRef.current)}");
    expect(dashboard).toContain('title="Capture & share"');
    expect(dashboard).toContain("fallbackTriggerRef={captureFallbackTriggerRef}");
    expect(dashboard).not.toContain("wm-chart-tools-trigger");
    expect(dashboard).toMatch(/activeTab !== "Chart" && activeTab !== "Options"[\s\S]{0,500}?wm-chart-capture-fallback[\s\S]{0,500}?openCaptureShare\(captureFallbackTriggerRef\.current\)[\s\S]{0,500}?aria-controls="chart-tools-sheet"/);
    expect(dashboard).toMatch(/const openCaptureShare = useCallback\(\(trigger: HTMLButtonElement \| null\) => \{\s*captureFallbackTriggerRef\.current = trigger;\s*setToolsSheetOpen\(true\);/);
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
    expect(dashboard).toContain("Market object passport");
    expect(dashboard).not.toContain("wm-chart-passport-trigger");
  });

  it("keeps the canonical WHY doorway operable across every symbol view", () => {
    expect(dashboard).toContain('aria-label={whyOpen ? "Close Decision Why" : "Open Decision Why"}');
    expect(dashboard).toContain('id="chart-decision-why"');
    expect(dashboard).toContain("fallbackTriggerRef={whyTriggerRef}");
    expect(dashboard).toMatch(/\{whyOpen && \(\s*<ShellModalDrawer/);
    expect(dashboard).not.toMatch(/\{whyOpen && \(activeTab === "Chart" \|\| activeTab === "Options"\) && \(/);
  });

  it("keeps the menu viewport-bound instead of extending the toolbar", () => {
    expect(toolbar).toContain('position: "fixed"');
    expect(toolbar).toContain("window.innerWidth - (rect?.right ?? window.innerWidth)");
  });
});
