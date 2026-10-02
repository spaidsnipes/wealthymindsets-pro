import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const CHART = readFileSync("src/components/chart/MainChart.tsx", "utf8");
const start = CHART.indexOf("H-702 · DELTA LEVELS ON GLASS");
const block = CHART.slice(start, CHART.indexOf("H-901 · REGIME LIGHTING", start));

describe("Delta Levels is a lane you can see (serving NQ1! 1m, 2026-10-01)", () => {
  it("has an alpha floor under the governor", () => {
    expect(CHART).toContain("const DELTA_LEVELS_ALPHA_FLOOR = 0.8;");
    expect(block).toContain('Math.max(DELTA_LEVELS_ALPHA_FLOOR, att.alpha("deltaLevels"))');
  });
  it("rungs are thick and long enough to read, over a backing strip, with the lane named", () => {
    expect(block).toContain("const laneMax = 56;");
    expect(block).toMatch(/const rungPx = Math\.max\(3, Math\.min\(8,/);
    expect(block).toContain("ctx.lineWidth = rungPx;");
    expect(block).toContain('ctx.fillStyle = "rgba(10,11,16,0.55)";');
    expect(block).toContain("\\u0394 LEVELS");
  });
  it("the lane never stands on the newest candles or under the axis", () => {
    expect(block).not.toContain("const centerX = W - 96;");
    expect(block).toContain("const rightCenter = dlPlotRight - laneMax - 10;");
    expect(block).toContain('ds.deltaLevelsLane = centerX === rightCenter ? "RIGHT_EDGE" : "LEFT_EDGE";');
  });
  it("sides are still told apart by direction, never by hue", () => {
    expect(block).toMatch(/r\.side === "BUY" \? centerX \+ len : centerX - len/);
    expect(block).not.toMatch(/r\.side\s*===\s*"BUY"\s*\?\s*"(#|rgba)/);
  });
  it("never shares x with the Delta Divergence lane, whose marks are floored too", () => {
    expect(block).toContain("(layerOnRef.current.divergence ? 64 + 86 + 16 : 64) + laneMax");
    expect(CHART).toContain('ctx.globalAlpha = Math.max(DIVERGENCE_ALPHA_FLOOR, att.alpha("divergence"));');
    expect(CHART).toContain("const DIVERGENCE_ALPHA_FLOOR = 0.8;");
  });
});
