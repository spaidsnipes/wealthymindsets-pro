import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");

// Serving BTC 15m, 2026-10-01: TPO switched on from Tools drew under Tools.
describe("TPO's column stands right of an open door", () => {
  it("the one geometry owner takes the door's right edge, and both readers pass it", () => {
    expect(MC).toContain("function tpoColumnGeometry(W: number, lensRight: number | null, doorRight = 0)");
    expect(MC.match(/tpoColumnGeometry\(W, lensColumnActive \? QUESTION_LENS_COLUMN_RIGHT : null, railOcclusionX\)/g)?.length).toBe(2);
  });
});
