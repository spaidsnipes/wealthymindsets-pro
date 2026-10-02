import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const CHART = readFileSync("src/components/chart/MainChart.tsx", "utf8");

describe("the loupe's weather stays visible around the live bar (plate 79 beside glass, 2026-10-02)", () => {
  it("the clear corridor is the newest 4 bars and thins to 50%", () => {
    expect(CHART).toContain("const STORM_CLEAR_BARS = 4;");
    expect(CHART).toContain("const STORM_CLEAR_THIN = 0.5;");
    expect(CHART).toContain("const nSC = Math.min(STORM_CLEAR_BARS, barsSC.length);");
    expect(CHART).toContain("mainCtx.globalAlpha = stormA * STORM_CLEAR_THIN;");
  });
});
