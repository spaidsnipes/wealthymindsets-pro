/**
 * Regression: `vpLevelsOut` is read by runWMVP(), which the Big Trades path
 * calls early in draw(). It must be declared before the FIRST runWMVP() call
 * (a later declaration threw a TDZ ReferenceError on every footprint frame).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");

describe("draw() declares what its early VP pass reads", () => {
  it("vpLevelsOut is declared before the first runWMVP() call", () => {
    const decl = MC.indexOf("const vpLevelsOut:");
    const firstCall = MC.indexOf("        runWMVP();");
    expect(decl).toBeGreaterThan(0);
    expect(firstCall).toBeGreaterThan(0);
    expect(decl).toBeLessThan(firstCall);
  });
});
