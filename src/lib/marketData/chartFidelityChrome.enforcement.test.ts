import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(process.cwd(), "src/components/chart");
const CSS = fs.readFileSync(path.resolve(process.cwd(), "src/app/globals.css"), "utf8");

describe("chart fidelity chrome", () => {
  it("keeps one visible workspace verdict while preserving standalone truth", () => {
    const dashboard = fs.readFileSync(path.join(ROOT, "ChartsDashboard.tsx"), "utf8");
    const chart = fs.readFileSync(path.join(ROOT, "MainChart.tsx"), "utf8");

    expect(dashboard).toContain("showFidelityChrome={false}");
    expect(chart).toContain("showFidelityChrome = true");
    expect(chart).toContain("showFidelityChrome ? (() =>");
    expect(chart).toContain('showFidelityChrome ? `${status.label} · LAST ${lastStr}` : `LAST ${lastStr}`');
  });

  it("keeps the canonical verdict visible in the phone market header", () => {
    const dashboard = fs.readFileSync(path.join(ROOT, "ChartsDashboard.tsx"), "utf8");
    const badge = fs.readFileSync(path.resolve(process.cwd(), "src/components/marketData/CanonicalFidelityBadge.tsx"), "utf8");

    expect(dashboard).toContain('className="wm-chart-market-summary"');
    expect(dashboard).toContain('className="wm-chart-header-change"');
    expect(badge).toContain('className="wm-fidelity-badge wm-fidelity-badge--chrome"');
    expect(CSS).toContain(".wm-chart-market-summary .wm-chart-header-change");
    expect(CSS).toContain(".wm-chart-market-summary .wm-fidelity-badge--chrome");
  });
});
