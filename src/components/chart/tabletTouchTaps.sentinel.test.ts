/**
 * iPad, 2026-10-17 — the Founder tried to teach a class on an iPad: the chart would not pan or pinch
 * under the Weather lens, and the D (data window) toggle would not turn on or off. These pins hold the
 * three fixes in MainChart: a finger inside the lens pans the chart, a pinch drops the vertical
 * body-drag, and a chart toggle fires on the finger's release.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SRC = readFileSync("src/components/chart/MainChart.tsx", "utf8");

describe("a tablet finger drives the chart", () => {
  it("a finger inside the Weather lens is the chart's; only the ring takes the lens", () => {
    expect(SRC).toContain('if (e.pointerType === "touch") return;\n        if (isInsideWeatherLens(px, py, hit)) {');
  });
  it("a second finger ends the vertical body-drag so the pinch zooms alone", () => {
    expect(SRC).toContain("if (fingers.size > 1) { dragging = false; return; }");
  });
  it("a chart toggle fires on the finger's release and the late click is swallowed", () => {
    expect(SRC).toContain('closest?.("button[aria-pressed]")');
    expect(SRC).toContain("swallow = { btn: p.btn, until: performance.now() + 800 };");
    expect(SRC).toContain("if (!swallow || !e.isTrusted) return;");
  });
});
