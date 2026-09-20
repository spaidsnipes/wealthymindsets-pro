import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("chart appearance has one truthful doorway", () => {
  const dashboard = read("src/components/chart/ChartsDashboard.tsx");
  const toolbar = read("src/components/chart/ChartToolbar.tsx");
  const modal = read("src/components/chart/ChartSettingsModal.tsx");
  const settings = read("src/components/layout/shellPanels.tsx");

  it("pins Appearance on the market toolbar and points it at the real dialog", () => {
    expect(toolbar).toContain('aria-controls="chart-settings-modal"');
    expect(toolbar).toContain("<span>Appearance</span>");
    expect(modal).toContain('id="chart-settings-modal"');
    expect(modal).toContain('aria-label="Chart appearance"');
  });

  it("keeps Classic direction as the default and offers Gold Current", () => {
    expect(dashboard).toContain('?? "green-red"');
    expect(dashboard).toContain('case "gold-current"');
    expect(dashboard).toContain("candleUp: LEGACY_CANDLE_UP, candleDown: LEGACY_CANDLE_DOWN");
    expect(settings).toContain('<option value="gold-current">Gold Current</option>');
  });

  it("lets a deliberate swatch choice outrank presets instead of being overpainted", () => {
    expect(dashboard).toContain('const settings = { ...readAppSettings(), chartTheme: "custom" };');
    expect(dashboard).toContain("settings={effChartSettings}");
    expect(dashboard).toContain("onSettingsChange={applyChartSettings}");
    expect(settings).toContain('<option value="custom">Custom candle colors</option>');
  });

  it("keeps the selected candle palette when the room enters WM Neon", () => {
    expect(dashboard).toContain("...paletteChartSettings");
    expect(dashboard).not.toContain('candleUp:  "#00FFA3"');
    expect(dashboard).not.toContain('candleDown: "#FF2E63"');
  });
});
