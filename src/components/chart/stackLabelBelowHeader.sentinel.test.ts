import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const CHART = readFileSync("src/components/chart/MainChart.tsx", "utf8");

describe("the Imbalance Stack label stays below the header chrome (serving ES1! 1m, 2026-10-01)", () => {
  it("prefers slots under HEADER_FLOOR_Y and falls back only when none exist", () => {
    expect(CHART).toContain("const stackChipSlotsBelowHeader = stackChipSlotsAll.filter(y => y >= HEADER_FLOOR_Y);");
    expect(CHART).toContain("const stackChipSlots = stackChipSlotsBelowHeader.length > 0 ? stackChipSlotsBelowHeader : stackChipSlotsAll;");
  });
  it("the stack is floored: band, edges and slabs are visible", () => {
    expect(CHART).toContain('ctx.globalAlpha = Math.max(STACK_ALPHA_FLOOR, att.alpha("stack"));');
    expect(CHART).toContain('ctx.fillStyle = anchored ? "rgba(212,175,55,0.08)" : "rgba(212,175,55,0.12)";');
    expect(CHART).toContain("(0.32 + 0.55 * weight).toFixed(3)");
  });
});
