/**
 * THE HEAT LENS SITS OVER THE BARS THE COST WAS PAID ON — P-601, Garden Pass 12.
 *
 * Each heat cell is a Liquidity Weather segment: a run of prints, in tape
 * order, whose cost (size per spread of travel) is measured. The renderer
 * washed every cell from x = 0 to x = W, so a cost measured over a few minutes
 * of tape read as a band holding across the whole camera. The weather owner
 * now publishes each segment's first/last print time; the lens spans those
 * bars and counts any cell whose prints carried no time (ds.heatLensUntimed).
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const CHART = strip(readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8"));

describe("heat lens on its bars", () => {
  const start = CHART.indexOf("const heat = selectHeatLens(liquidityWeatherRef.current);");
  const block = CHART.slice(start, CHART.indexOf("delete ds.heatLensUntimed;\n        }", start));

  it("finds the heat lens block", () => {
    expect(start).toBeGreaterThan(-1);
    expect(block.length).toBeGreaterThan(500);
  });

  it("washes and textures only the cell's own time span", () => {
    expect(block).toMatch(/const xFrom = cell\.fromTime != null \? barXAt\(cell\.fromTime\) : null;/);
    expect(block).toMatch(/ctxHeat\.fillRect\(cx0, top, cw, band\);/);
    expect(block).toMatch(/ctxHeat\.rect\(cx0, top, cw, band\);/);
    expect(block).not.toMatch(/fillRect\(0, top, W, band\)/);
    expect(block).not.toMatch(/bezierCurveTo\(W \* 0\.24/);
  });

  it("counts cells that had to fall back to the full camera", () => {
    expect(block).toContain("ds.heatLensUntimed = String(untimed);");
  });
});
