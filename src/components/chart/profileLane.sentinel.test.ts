import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * THE PROFILE LANE (Founder 2026-10-11: "a volume profile must not resemble a dotted pencil drawing").
 * The Living body lay over the newest candles and the candle cut-out carved it into slivers. The live
 * edge's margin is the stack's reach, so the body has its own lane beside the newest candle.
 */
describe("profiles get their own lane at the live edge", () => {
  const chart = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
  it("the margin is the stack's reach + 12px, applied only at the live edge and only on a real change", () => {
    expect(chart.length).toBeGreaterThan(100_000);
    expect(chart).toContain("const want = stackOrder.length > 0 ? Math.round(plotRight - stackPlan.stackLeft + 12) : null;");
    expect(chart).toContain("const atEdge = !!lr && nBars > 0 && lr.to >= nBars - 1.5;");
    expect(chart).toContain("tsL.applyOptions({ rightOffsetPixels: want ?? Math.round(5 * bsL) });");
  });
  it("a new chart forgets the last lane it asked for", () => {
    expect(chart).toContain("if (isNewChart) { chartRef.current = chart; profileLaneOffsetRef.current = null; }");
  });
});
