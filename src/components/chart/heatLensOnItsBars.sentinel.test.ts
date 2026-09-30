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
  const start = CHART.indexOf("const heat = selectHeatLens(sampledWeather);");
  const block = CHART.slice(start, CHART.indexOf("ds.liquidityWeatherLensState = weatherLensWhy;", start));

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

  it("refuses unplaceable cells before painting rather than inventing full-camera coverage", () => {
    expect(block).toContain("if (!timed) { untimed++; continue; }");
    const refusal = block.indexOf("if (!timed) { untimed++; continue; }");
    expect(refusal).toBeLessThan(block.indexOf("ctxHeat.fillRect(cx0, top, cw, band);"));
    expect(block).not.toMatch(/const cx[01] = timed \?/);
  });

  it("retains the refusal count even when no heat cell can be placed", () => {
    expect(block).toContain("ds.heatLensUntimed = String(untimed);");
    const receipt = block.indexOf("ds.heatLensUntimed = String(untimed);");
    expect(receipt).toBeLessThan(block.indexOf("if (painted > 0) {"));
    const emptyPaint = block.match(/if \(painted > 0\) \{[^}]*\} else \{([^}]*)\}/);
    expect(emptyPaint).not.toBeNull();
    expect(emptyPaint![1]).not.toContain("delete ds.heatLensUntimed;");
  });

  it("paints no span for either missing endpoint, and keeps a valid cell local", () => {
    // Execute the renderer's span gate with a paint spy: missing coordinates
    // must never produce a rectangle, including a partial timed segment.
    const from = block.indexOf("const timed = xFrom != null && xTo != null;");
    const to = block.indexOf("const cw = Math.max(1, cx1 - cx0);", from);
    expect(from).toBeGreaterThan(-1);
    expect(to).toBeGreaterThan(from);
    const gate = block.slice(from, to + "const cw = Math.max(1, cx1 - cx0);".length);
    const run = new Function("endpoints", `
      const W = 1000, heatSpacing = 6, painted = [];
      let untimed = 0;
      for (const [xFrom, xTo] of endpoints) {
        ${gate}
        painted.push({ x: cx0, width: cw });
      }
      return { untimed, painted };
    `);
    expect(run([[null, null], [12, null], [null, 42]]))
      .toEqual({ untimed: 3, painted: [] });
    expect(run([[42, 12], [null, 42]]))
      .toEqual({ untimed: 1, painted: [{ x: 9, width: 36 }] });
  });
});
