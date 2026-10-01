import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");

// Garden 18 §XXXVI: serving TSLA 15m, Profile Memory alone read ~0.15.
describe("Profile Memory keeps a visibility floor", () => {
  it("age fades its shelves, never below 0.5; its words hold 0.85 on the glass", () => {
    expect(MC).toContain("const fade = Math.max(0.5, 0.95 - (l.sessionsAgo - 1) * 0.11);");
    expect(MC).toContain("ctx.globalAlpha = Math.max(gaM, 0.85);");
  });
});
