import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const SRC = readFileSync("src/components/chart/TradePanel.tsx", "utf8");
// Serving MNQ 1m, 2026-10-01: the Trade panel at right:24 hid the forming bar.
describe("Trade panel never covers the live edge (§XIV)", () => {
  it("stands at the chart's lower left", () => {
    expect(SRC).toContain('position: "fixed", left: 24, bottom: 64,');
    expect(SRC).not.toContain("right: 24, bottom: 64");
  });
});
