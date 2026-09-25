/**
 * THE LEFT COLUMN AND THE BOTTOM-LEFT WORD STACK — Garden Pass 12, Defect 4.
 *
 * Founder glass, serving 15b67962, BTC-USD 1m, ORDER FLOW desk (2026-09-25
 * 03:01 CDT):
 * - the delta-divergence caption printed under the Question Lens debt card;
 * - an exhaustion chip whose mark sat inside the strip band overlapped the
 *   ACTIVE QUESTION strip;
 * - the liquidity-weather words started at H − 6 — inside the time axis and
 *   below the pane clip — so two of their three lines were never visible and
 *   the third printed through "N BARS IN VIEW".
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const CHART = strip(readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8"));

describe("left column and word stack", () => {
  it("the divergence lane steps right of an active lens column", () => {
    expect(CHART).toMatch(/const laneL = lensColumnActive \? QUESTION_LENS_COLUMN_RIGHT \+ 8 : 64;/);
    expect(CHART).toMatch(/const laneR = laneL \+ 86;/);
  });

  it("an exhaustion chip whose mark is in the strip band goes below the strip", () => {
    expect(CHART).toMatch(/cy = up \? Math\.max\(160, y0 \+ 16\) : Math\.max\(160, y0 \+ 12\);/);
    // …including when stepping off the header lands it back in the band
    // (serving, BTC 1m, 2026-09-25 03:21 CDT: a top-of-pane push).
    expect(CHART).toMatch(/else cy = Math\.max\(HEADER_FLOOR_Y, y0 \+ 16\);\s*if \(lensBand && cy < 158 && cy \+ 14 > 96\) cy = 160;/);
  });

  it("the bottom-left word stack starts above the window count at the candle pane's foot", () => {
    expect(CHART).not.toMatch(/let wy = Math\.max\(20, H - 6\);/);
    expect(CHART).toMatch(/let wy = Math\.max\(20, pane0Bottom - 22\);/);
    expect(CHART).toMatch(/const cy = Math\.max\(20, pane0Bottom - 22\) - weatherLines \* 11;/);
  });

  it("the VP POC tag never prints inside the header band (REGIME desk, 2026-09-25)", () => {
    expect(CHART).toMatch(/const pocTagY = rowY \+ Math\.round\(rowH\/2\);\s*if \(pocTagY >= HEADER_FLOOR_Y\) \{/);
  });

  it("the Structure Profile name and the memory-ghost caption stay below the header chrome", () => {
    expect(CHART).not.toMatch(/x0 \+ 4, Math\.max\(14, top - 4\)/);
    expect(CHART).toMatch(/x0 \+ 4, Math\.max\(HEADER_FLOOR_Y \+ 12, top - 4\),/);
    expect(CHART).toMatch(/const ly = Math\.max\(HEADER_FLOOR_Y \+ 7, lastXY\.y - 16\);/);
  });
});
