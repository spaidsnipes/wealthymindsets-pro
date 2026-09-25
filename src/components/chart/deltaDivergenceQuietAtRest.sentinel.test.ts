/**
 * DELTA DIVERGENCE AT REST IS A QUIET MARK; ITS SENTENCE COMES WHEN ASKED.
 *
 * Serving BTC-USD 1m desktop, 2026-09-25 14:46–14:48 CDT: the layer printed
 * "DELTA · DID NOT FOLLOW · SWING 0.8σ" and the engine's whole sentence
 * ("price made a higher high by 0.8× the window's own spread; cumulative
 * delta did not follow — …") at the upper left — over the candles at MID and
 * straight across the docked FOUNDATION scaffold card at NEAR. It was never
 * placed and never yielded.
 *
 * Canon FL-06: "NO ESSAY DRAWER AS PRIMARY TRUTH". So:
 *   · at rest only the compiler's compact `tag` paints, placed STRICTLY
 *     through the keep-out owner against the bodies under its rows and every
 *     chip on the glass (the scaffold card registers itself there first), and
 *     HELD when no spot is clear;
 *   · the headline, the engine's sentence and the full disclosure paint only
 *     while the crosshair points at the lane or the tag;
 *   · the two-price marks stay in the lane — the engine cannot time-stamp its
 *     pivots, so no bar is claimed.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const CHART = strip(readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8"));

const blockAt = CHART.indexOf("selectDeltaDivergenceGlass(deltaDivergenceRef.current)");
const block = (() => {
  const end = CHART.indexOf("selectLiquidityWeatherGlass", blockAt);
  expect(blockAt).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(blockAt);
  return CHART.slice(blockAt, end);
})();
const hoverAt = block.indexOf("if (dvHit(dvLaneBox) || dvHit(dvTagRect)) {");
const atRest = block.slice(0, hoverAt);
const hover = block.slice(hoverAt, block.indexOf('ds.deltaDivergenceWords = "AT_REST";'));

describe("at rest: the compact tag only", () => {
  it("the only words painted before the hover branch are the compiler's tag", () => {
    expect(hoverAt).toBeGreaterThan(-1);
    const texts = [...atRest.matchAll(/ctx\.fillText\(([^,]+),/g)].map(m => m[1]);
    expect(texts).toEqual(["glass.tag"]);
    expect(atRest).not.toMatch(/fillText\(glass\.(label|findingLabel|disclosure)/);
  });

  it("the tag is placed strictly through the keep-out owner against every chip, and HELD when blocked", () => {
    expect(atRest).toMatch(/placeClearOfKeepOut\(\s*dvTagSlots\[0\]!,\s*\[\.\.\.keepOut\(\), \.\.\.rowBodiesAt\(/);
    expect(atRest).toContain("{ minX: 4, blockers: floatingChips, strict: true, alternates: dvTagSlots.slice(1) },");
    expect(atRest).toMatch(/if \(dvTagSpot\.mode === "BLOCKED"\) \{\s*ds\.deltaDivergenceTag = "HELD";\s*\} else \{\s*recordKeepOut\(keepOutLedger, dvTagSpot\);/);
    // Registered before it paints, so chrome after it steps around it.
    expect(atRest.indexOf("floatingChips.push(dvTagRect);")).toBeLessThan(atRest.indexOf("ctx.fillText(glass.tag"));
    expect(atRest).toContain('ds.deltaDivergenceTag = dvTagSpot.mode === "CLEAR" ? "CLEAR" : "MOVED";');
  });

  it("the scaffold card is on the chip ledger before this block places anything", () => {
    const scaffoldPush = CHART.indexOf("floatingChips.push({ x: cx0, y: cy0, w: w * k, h: h * k });");
    expect(scaffoldPush).toBeGreaterThan(-1);
    expect(scaffoldPush).toBeLessThan(blockAt);
  });

  it("still claims no bar: the marks stay in the lane", () => {
    expect(block).toContain("!glass.timeKnown");
    expect(block).not.toMatch(/timeToCoordinate/);
  });
});

describe("pointing at the mark reveals the sentence", () => {
  it("the headline, the engine's sentence and the disclosure paint only in the hover branch", () => {
    expect(hover).toContain("const dvLines = [glass.label, glass.findingLabel, glass.disclosure].filter(");
    expect(hover).toMatch(/placeClearOfKeepOut\(\s*dvBelow,/);
    expect(hover).toContain('ds.deltaDivergenceWords = "SELECTED";');
    expect(block).toMatch(/const hp = crosshairPointRef\.current;/);
    // The crosshair ref is fed by the chart's own crosshair subscription.
    expect(CHART).toMatch(/chart\.subscribeCrosshairMove\(\(param: any\) => \{\s*if \(!chartRef\.current\) return;\s*crosshairPointRef\.current = param\?\.point/);
  });

  it("the words receipt is AT_REST otherwise, and every receipt is withdrawn with the drawing", () => {
    expect(block).toContain('ds.deltaDivergenceWords = "AT_REST";');
    expect(block).toMatch(/delete ds\.deltaDivergenceLean;\s*delete ds\.deltaDivergenceWords;\s*delete ds\.deltaDivergenceTag;/);
  });
});
