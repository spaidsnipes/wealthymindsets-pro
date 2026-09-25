/**
 * THE EXHAUSTION CHIP SAYS EFFORT, AND IS NEVER BURIED UNDER THE QUESTION.
 *
 * Founder glass, serving, BTC-USD 1m, ORDER FLOW desk, 2026-09-25 02:40 CDT:
 * the chip read "EXHAUSTION · AGG 0% …" while the canvas published
 * absorptionBasis=VOLUME — unsigned effort printed as aggression, a side the
 * reading never measured. And a chip whose mark sat in the left column was
 * painted first and then covered by the Evidence Debt card the lens paints
 * over that column.
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
const CARDS = read("src/lib/marketData/viewModels/selectAnatomyCards.ts");

const block = (() => {
  const start = CHART.indexOf("const ex = selectExhaustion(anatomy);");
  const end = CHART.indexOf("if (layerOnRef.current.anatomyCards === true)", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return CHART.slice(start, end);
})();

describe("exhaustion chip honesty", () => {
  it("names unsigned effort as EFFORT, never AGG or aggression", () => {
    expect(block).toMatch(/EXHAUSTION · EFFORT 2ND÷1ST/);
    expect(block).not.toMatch(/EXHAUSTION · AGG /);
    expect(CARDS).toContain('label: "EFFORT 2ND ÷ 1ST"');
    expect(CARDS).not.toContain('label: "AGGRESSION LEVEL"');
  });

  it("steps out of the Question Lens column instead of being painted over", () => {
    expect(block).toMatch(/if \(lensBand && W >= 640 && cy \+ 14 > 96 && cxx < QUESTION_LENS_COLUMN_RIGHT\) cxx = /);
    expect(CHART).toMatch(/const QUESTION_LENS_COLUMN_RIGHT = 324;/);
  });
});
