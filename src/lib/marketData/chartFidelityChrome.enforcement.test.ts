import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(process.cwd(), "src/components/chart");

describe("chart fidelity chrome", () => {
  it("keeps one visible workspace verdict while preserving standalone truth", () => {
    const dashboard = fs.readFileSync(path.join(ROOT, "ChartsDashboard.tsx"), "utf8");
    const chart = fs.readFileSync(path.join(ROOT, "MainChart.tsx"), "utf8");

    expect(dashboard).toContain("showFidelityChrome={false}");
    expect(chart).toContain("showFidelityChrome = true");
    expect(chart).toContain("showFidelityChrome && (() =>");
    expect(chart).toContain('showFidelityChrome ? `${status.label} · LAST ${lastStr}` : `LAST ${lastStr}`');
  });
});
