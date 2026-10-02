import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const CHART = readFileSync("src/components/chart/MainChart.tsx", "utf8");

describe("a data gap wholly off camera prints no words (TSLA 1m, 2026-10-02)", () => {
  it("withholds before any clamp to the edge", () => {
    const at = CHART.indexOf("if (+x1 < 0 || +x0 > plotW) { wordsWithheld++; continue; }");
    expect(at).toBeGreaterThan(0);
    expect(at).toBeLessThan(CHART.indexOf("const clampX = (x: number) => Math.max(tw / 2 + 4"));
  });
});
