import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChartLoadingVeil, STILL_WAITING_MS } from "./ChartLoadingVeil";

describe("the chart's first seconds", () => {
  it("says what it is loading, in plain words, and claims no market fact", () => {
    const html = renderToStaticMarkup(<ChartLoadingVeil symbol="ES1!" timeframe="5m" />);
    expect(html).toContain("Loading ES1! · 5m bars…");
    expect(html).toContain('role="status"');
    expect(html).not.toMatch(/\d{2,}\.\d{2}/); // no price
  });
  it("stops claiming to load after a while and says the source has not answered", () => {
    expect(STILL_WAITING_MS).toBe(20_000);
    const src = readFileSync(path.join(process.cwd(), "src/components/chart/ChartLoadingVeil.tsx"), "utf8");
    expect(src).toContain("the source has not answered yet");
  });
  it("is shown only while the camera holds no bars and the load has not settled", () => {
    const dash = readFileSync(path.join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8");
    // …and only while the load has not SETTLED: a settled empty load is a refusal, not a wait (2026-10-12).
    expect(dash).toContain('{chartBars.length === 0 && !barsSettled && !gridView && activeTab === "Chart" ? (');
  });
});
