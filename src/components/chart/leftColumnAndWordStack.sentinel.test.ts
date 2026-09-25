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

  it("the bottom-left word stack is gone — weather is a lens, lifecycle a ladder", () => {
    // The original defect (words at H − 6, inside the time axis) can never
    // come back.
    expect(CHART).not.toMatch(/let wy = Math\.max\(20, H - 6\);/);
    // Pin moved AGAIN 2026-09-25 (F08A/F08B canon pass). The Founder: "I
    // STILL HAVE A LOT OF JUST CARDS, NOT THE ACTUAL DESIGNS WITHIN THE
    // CANON." The weather's three word lines and the lifecycle's caption
    // line both left the bottom-left corner: F08B paints the weather as a
    // lens with its words on the ring and its status attached to the ring;
    // F08A paints pools as time-bounded ladders whose honesty is a receipt
    // and one keep-out-placed tag. No word stack, no caption-row owner.
    expect(CHART).not.toMatch(/let wy = Math\.max\(20, pane0Bottom - 22\);/);
    expect(CHART).not.toContain("liquidityCaptionLine");
    expect(CHART).not.toContain("weatherLines");
    expect(CHART).not.toMatch(/\bwordChip\(/);
  });

  it("the VP POC tag never prints inside the header band (REGIME desk, 2026-09-25)", () => {
    // Pin moved 2026-09-25 (P-110 canon pass, M47): the POC is named by the
    // same level drawer as VAH/VAL, whose name steps under its line and whose
    // chip is floored at the band (vpTagsClearHeaderBand.sentinel.test.ts).
    expect(CHART).toContain('vpLevel(pocPrice, vpPocRgba, "POC");');
    expect(CHART).toContain("const tagBelow = midY - 13 < HEADER_FLOOR_Y;");
  });

  it("the Structure Profile name and the memory-ghost caption stay below the header chrome", () => {
    expect(CHART).not.toMatch(/x0 \+ 4, Math\.max\(14, top - 4\)/);
    expect(CHART).toMatch(/x0 \+ 4, Math\.max\(HEADER_FLOOR_Y \+ 12, top - 4\),/);
    expect(CHART).toMatch(/const ly = Math\.max\(HEADER_FLOOR_Y \+ 7, lastXY\.y - 16\);/);
  });

  it("the profile stack's words join the chip ledger, and the Structure chips step clear of them", () => {
    // Pin updated 2026-09-25 (P-110 canon pass): the stack's words are the
    // family's level chips now; each joins the ledger where it was placed.
    expect(CHART).toMatch(/recordKeepOut\(keepOutLedger, spotL\);\s*const r = spotL\.rect;\s*floatingChips\.push\(\{ x: r\.x, y: r\.y, w: r\.w, h: r\.h \}\);/);
    const chipFn = CHART.slice(CHART.indexOf("const chip = (text: string, x: number, y: number) => {"), CHART.indexOf("`STRUCTURE · FROM ${kind}"));
    expect(chipFn.length).toBeGreaterThan(200);
    expect(chipFn).toContain("const taken = (yy: number) => floatingChips.some(");
    // Pin updated 2026-09-25 (keep-out completion): the row the chips leave
    // is then a keep-out slot test, so the chip paints and joins the ledger
    // where that placement says (see newestCandleKeepOut.sentinel.test.ts).
    expect(chipFn).toContain("floatingChips.push({ x: spotP.rect.x, y: spotP.rect.y, w, h: 14 });");
    expect(chipFn).toMatch(/ctx\.fillRect\(spotP\.rect\.x, spotP\.rect\.y, w, 14\);/);
  });

  it("the stack column places each label on the nearest free row (no oscillating step)", () => {
    // Pin updated 2026-09-25: the row is floored below the price legend band first.
    // …and again 2026-09-25 (P-110 canon pass): the level chips sit at the
    // plot's right edge, so their floor is the right side's header band, and
    // the step is one chip's height.
    expect(CHART).toContain("let yy = nearestFreeLabelY(Math.max(y, rowFloor), levelChipYs, LEVEL_CHIP_H + 1);");
    expect(CHART).toContain("const rowFloor = floorY + LEVEL_CHIP_H / 2;");
    expect(CHART).not.toMatch(/yy = y < hit \? hit - 12 : hit \+ 12;/);
  });
});
