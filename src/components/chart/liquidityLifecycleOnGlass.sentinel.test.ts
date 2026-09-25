/**
 * LIQUIDITY LIFECYCLE IS FORM ON PRICE, NOT A PANEL — Garden Pass 12.
 *
 *     Liquidity lifecycle should not look like another generic support box.
 *     Do not solve it by covering the market with another panel.
 *
 * The layer shipped as stage HUES (a green→red ramp) with numbered circles, a
 * 596px legend strip and an opaque 236×241 "LIFECYCLE STATUS" panel claiming
 * "ON THIS CAMERA" for pools compiled over all loaded bars — and it recompiled
 * the reading inside the animation frame. Now: one ink, biography as form
 * (dashed → solid → heavier edges, touch notches, consume hatch + end cap),
 * one caption line, and the room compiles the reading once.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const read = (rel: string) => strip(readFileSync(path.join(process.cwd(), rel), "utf8"));

const CHART = read("src/components/chart/MainChart.tsx");
const ROOM = read("src/components/chart/ChartsDashboard.tsx");

const block = (() => {
  const start = CHART.indexOf("if (layerOnRef.current.liquidityLifecycle === true) {");
  const end = CHART.indexOf('ds.liquidityLifecycle = "OFF";', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return CHART.slice(start, end);
})();

describe("liquidity lifecycle on glass", () => {
  it("is compiled once by the room, never inside the canvas frame", () => {
    expect(CHART).not.toMatch(/\bselectLiquidityLifecycle\s*\(/);
    expect(ROOM).toMatch(/liquidityLifecycle=\{chartLiquidityLifecycle\}/);
    expect(block).toContain("liquidityLifecycleRef.current");
  });

  it("carries no panel, legend strip or camera-scope overclaim", () => {
    expect(block).not.toContain("LIFECYCLE STATUS");
    expect(block).not.toContain("ON THIS CAMERA");
    expect(block).not.toContain("liquidityLifecycleStatus");
    const wideRects = [...block.matchAll(/fillRect\([^)]*,\s*(\d{3,})\s*,/g)].filter(m => Number(m[1]) >= 200);
    expect(wideRects).toEqual([]);
  });

  it("tells the stage by form on one ink, not by hue or numbered circles", () => {
    expect(block).not.toContain("STAGE_RGB");
    expect(block).not.toMatch(/arc\([^)]*,\s*7\s*,/);
    expect(block).toContain('const INK = "201,165,92"');
    expect(block).toMatch(/ev\.stage === "APPEARED"\) form = \{ dash: \[2, 3\]/);
    expect(block).toMatch(/ev\.stage === "REFILLED"\) form = \{ dash: \[\], w: 2 \}/);
  });

  it("cuts a notch where price came back and hatches the close-through, clipped to the band", () => {
    expect(block).toMatch(/ev\.stage !== "TOUCHED"/);
    expect(block).toMatch(/ctx\.clip\(\);[\s\S]*hx \+= 6/);
  });

  it("stops short of the profile stack and names its silence in one caption line", () => {
    expect(block).toContain("ds.profileStackLeft");
    // The caption's words and row live in one owner (liquidityCaptionLine), read here and by TPO.
    expect(block).toContain("liquidityCaptionLine()!");
    const owner = CHART.slice(CHART.indexOf("const liquidityCaptionLine = ()"), CHART.indexOf("const liquidityCaptionLine = ()") + 900);
    expect(owner).toContain("PULLED refused (no book)");
    expect(block).toMatch(/floatingChips\.push\(\{ x: 8, y: cy - 11/);
    expect(block).toContain("ds.liquidityLifecyclePainted =");
  });
});
