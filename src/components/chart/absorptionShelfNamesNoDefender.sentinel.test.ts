/**
 * THE ABSORPTION SHELF NAMES NO DEFENDER, AND ITS RECEIPT SAYS WHAT IS DRAWN.
 *
 * Garden 12 review. The "opposing interest holds" wall picked the solid edge
 * from one candle's close against the shelf's middle — a claim about who
 * defended the level, taken from OHLC position, even on an EFFORT · VOLUME
 * basis with no aggressor data at all. The anatomy owner publishes no
 * signed-delta defended edge, so both edges are drawn alike.
 *
 * The effort ticks lived inside that approach branch, so NEAR lost them when
 * the shelf began at the first visible bar, while ds.absorptionDepthForm
 * still read SHELF+EFFORT_TICKS; at MID it read SHELF over drawn ticks.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const CHART = strip(readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8"));

const loop = (() => {
  const start = CHART.indexOf("for (const zone of anatomy.zones) {");
  const end = CHART.indexOf("ds.absorptionChips =", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return CHART.slice(start, end);
})();
const receipts = (() => {
  const start = CHART.indexOf("ds.absorptionChips =");
  return CHART.slice(start, CHART.indexOf("const basisTxt = BASIS_LABEL[anatomy.basis];", start));
})();

describe("the absorption shelf", () => {
  it("draws both edges alike: no wall is chosen from where a candle closed", () => {
    // The scan found the shelf it is about.
    expect(loop).toMatch(/ctx\.moveTo\(x0, yHi \+ 0\.5\); ctx\.lineTo\(x1, yHi \+ 0\.5\);/);
    expect(loop).toMatch(/ctx\.moveTo\(x0, yLo - 0\.5\); ctx\.lineTo\(x1, yLo - 0\.5\);/);
    expect(loop).not.toMatch(/\.close\b/);
    expect(loop).not.toMatch(/fromBelow|approach/i);
    expect(loop).not.toMatch(/lineWidth = 2\.5/);
    expect(CHART).not.toMatch(/ds\.absorptionWall = (fromBelow|"TOP"|"BOTTOM"|"UNKNOWN_APPROACH")/);
  });

  it("H-701A: a holding wall is drawn ONLY from the owner's signed-aggression edge", () => {
    // GP12 (2026-09-25): the anatomy owner now publishes `holdingEdge` from
    // Σ(askVol − bidVol) over the run, with its provenance. The chart may draw
    // a wall only inside `if (zone.holdingEdge)`, place it from that field,
    // and dash it when the sides were inferred. Still never from a close.
    expect(loop).toMatch(/if \(zone\.holdingEdge\) \{/);
    expect(loop).toMatch(/const yWall = zone\.holdingEdge === "LOW" \? yLo : yHi;/);
    expect(loop).toMatch(/const inferred = zone\.holdingBasis === "INFERRED";/);
    expect(loop).toMatch(/ctx\.setLineDash\(inferred \? \[5, 3\] : \[\]\);/);
    expect(loop).not.toMatch(/\.close\b/);
    // The displacement path is the owner's travel, not a candle read.
    expect(loop).toMatch(/srs\.priceToCoordinate\(zone\.travelFrom\)/);
    expect(loop).toMatch(/srs\.priceToCoordinate\(zone\.travelTo\)/);
  });

  it("draws one effort tick per shelf bar whatever the approach, and counts it", () => {
    const farSkip = loop.indexOf('if (shelfDepth === "FAR") { absorbChipsHidden++; continue; }');
    const ticks = loop.indexOf("const tickMax = shelfDepth === \"NEAR\" ? 14 : 8;");
    expect(farSkip).toBeGreaterThan(-1);
    expect(ticks).toBeGreaterThan(farSkip);
    // Nothing but the block opener sits between the FAR skip and the ticks:
    // no condition can gate them on a direction.
    expect(loop.slice(farSkip, ticks).replace('if (shelfDepth === "FAR") { absorbChipsHidden++; continue; }', "").replace(/\s/g, "")).toBe("{");
    // The tick is a dotted effort column now (canon UI-04): dots stacked
    // under the bar, count and size from ITS effort — still one per bar,
    // still counted, still whatever direction price came from.
    expect(loop).toMatch(/const dots = 1 \+ Math\.round\(ab\.effortNorm \* \(maxDots - 1\)\);/);
    expect(loop).toMatch(/ctx\.arc\(Math\.round\(\+xb\), yLo \+ 5 \+ d \* 4\.5, r, 0, Math\.PI \* 2\);/);
    expect(loop).toMatch(/\}\s*effortTicksDrawn\+\+;/);
  });

  it("the depth receipt is derived from what was drawn and withdrawn when nothing was", () => {
    expect(loop).toMatch(/shelvesFilled\+\+/);
    expect(loop).toMatch(/shelvesEdged\+\+/);
    expect(CHART).not.toMatch(/shelfDepth === "NEAR" \? "SHELF\+EFFORT_TICKS"/);
    expect(receipts).toMatch(/if \(shelvesEdged === 0\) \{\s*delete ds\.absorptionDepthForm;\s*delete ds\.absorptionWall;/);
    expect(receipts).toMatch(/ds\.absorptionDepthForm = shelvesFilled === 0 \? "EDGES" : effortTicksDrawn > 0 \? "SHELF\+EFFORT_TICKS" : "SHELF";/);
    expect(receipts).toMatch(/ds\.absorptionWall = wallsDrawn\.length > 0 \? wallsDrawn\.join\(","\) : "NOT_CLAIMED";/);
  });
});
