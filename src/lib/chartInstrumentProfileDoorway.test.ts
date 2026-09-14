import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const dashboard = read("src/components/chart/ChartsDashboard.tsx");
const toolbar = read("src/components/chart/ChartToolbar.tsx");

describe("/charts instrument profile is disclosed, not permanent frame chrome", () => {
  it("removes the unlabeled 14px edge toggle from MARKET", () => {
    expect(dashboard).not.toContain('title={infoOpen ? "Collapse info panel" : "Expand info panel"}');
    expect(dashboard).not.toContain("width:14,");
  });

  it("keeps the existing panel behind a written Tools doorway", () => {
    expect(dashboard).toContain("onInstrumentProfile={() => setInfoOpen(open => !open)}");
    expect(dashboard).toContain("instrumentProfileActive={infoOpen}");
    expect(dashboard).toContain('id="chart-instrument-profile"');
    expect(dashboard).toContain("<StockInfoPanel symbol={symbol} />");
    expect(toolbar).toContain("Instrument profile");
    expect(toolbar).toContain("onInstrumentProfile();");
  });

  it("uses the shared drawer so the doorway works without compressing MARKET", () => {
    expect(dashboard).toContain("fallbackTriggerRef={instrumentProfileTriggerRef}");
    expect(dashboard).toContain("toolsTriggerRef={instrumentProfileTriggerRef}");
    expect(dashboard).not.toContain("{!narrowViewport || !optionsOpen ? <div");
    expect(toolbar).toContain("studyToolsOpen || instrumentProfileActive");
  });
});

describe("/charts appearance is a disclosed room control", () => {
  it("moves the theme switch out of the permanent market-summary band", () => {
    expect(dashboard).not.toContain("wm-chart-theme-controls");
    expect(dashboard).not.toContain("wm-theme-toggle");
    expect(dashboard).toContain("onAppearanceToggle={() => setTheme");
    expect(toolbar).toContain("Appearance · {appearanceLabel");
    expect(toolbar).toContain("onAppearanceToggle();");
  });
});
