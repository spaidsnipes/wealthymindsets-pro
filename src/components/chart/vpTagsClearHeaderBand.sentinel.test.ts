/**
 * THE CLASSIC VP'S VALUE-AREA TAGS STAY OUT OF THE HEADER BAND.
 *
 * Sheriff frame on serving (NQ1! 5m desktop, every profile species on,
 * 2026-09-25): the Session/Fixed column's "VAH 31,020" tag printed above its
 * line — inside the header band — on "BAR OPENED 08:08 AM · 2 BARS BEHIND";
 * the off-screen "VAH ↑" marker sat at y 9, under the bar clock. The header
 * chrome owns the top band (HEADER_FLOOR_Y); the tags read below it.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const CHART = strip(readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8"));

describe("classic VP value-area tags (Sentinel)", () => {
  // Pin moved 2026-09-25 (P-110 canon pass, M47): POC, VAH and VAL are drawn
  // by ONE level drawer — dashed rule, the level's name at the column's left,
  // a gold price chip at the axis edge. The header-band law is unchanged.
  const at = CHART.indexOf('const vpLevel = (p: number, ink: (a: number) => string, tag: "POC" | "VAH" | "VAL") => {');
  const block = CHART.slice(at, CHART.indexOf('vpLevel(pocPrice, vpPocRgba, "POC");', at));

  it("finds the tag drawer", () => {
    expect(at).toBeGreaterThan(-1);
    expect(block.length).toBeGreaterThan(1500);
  });

  it("an off-screen level's marker sits under the header band, not in it", () => {
    expect(block).toContain("const edgeY = above ? HEADER_FLOOR_Y + 4 : H - 9;");
    expect(block).not.toContain("above ? 9 :");
  });

  it("a name whose row would enter the band reads under its line, floored at the band; the chip never rises into it", () => {
    expect(block).toContain("const tagBelow = midY - 13 < HEADER_FLOOR_Y;");
    expect(block).toContain("const below = { x: colLeft, y: Math.max(midY + 2, HEADER_FLOOR_Y), w: ww, h: 12 };");
    expect(block).toContain("const wordPref = tagBelow ? below : above;");
    expect(block).toContain("levelChipSlots({ y: midY, w: cw, rightX: vpChipRight, floorY: HEADER_FLOOR_Y, footY: pane0H - 2 })");
  });
});
