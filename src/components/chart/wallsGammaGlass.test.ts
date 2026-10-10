import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { edgeChipWords } from "@/components/chart/wallsGammaGlass";

describe("Walls & Gamma off camera is named at the edge, never dropped", () => {
  const m = (price: number, label: string) => ({ price, kinds: ["CALL_WALL"] as const, label });
  it("nearest first, with how many more", () => {
    expect(edgeChipWords("above", [m(790, "CALL WALL 790 · OI 42k"), m(800, "CALL WALL 800 · OI 30k")])).toBe("▲ CALL WALL 790 · OI 42k  +1 more");
    expect(edgeChipWords("below", [m(740, "PUT WALL 740 · OI 222k")])).toBe("▼ PUT WALL 740 · OI 222k");
    expect(edgeChipWords("above", [])).toBeNull();
  });
  it("the chart paints the edge chips and the Inspect card after the status line", () => {
    const src = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
    expect(src.length).toBeGreaterThan(100_000);
    const status = src.indexOf("// ONE status line for the family");
    const edge = src.indexOf("// OFF-CAMERA marks are named at the glass edge");
    const inspect = src.indexOf("// INSPECT — the bucket under the crosshair");
    expect(status).toBeGreaterThan(0);
    expect(edge).toBeGreaterThan(status);
    expect(inspect).toBeGreaterThan(edge);
  });
});
