import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");
// Serving MNQ 1m: Liquidity Lifecycle ON, 0/6 painted, an empty glass (§CV).
describe("Liquidity Lifecycle never goes silent", () => {
  it("with no pool on this camera it says so in the silence row", () => {
    expect(MC).toContain("LIQUIDITY LIFECYCLE · ACTIVE · NO POOL IN VIEW — ");
    expect(MC).toContain('ds.liquidityLifecycleSilence = "NO_POOL_IN_VIEW";');
  });
});
