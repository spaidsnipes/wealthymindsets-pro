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
  const at = CHART.indexOf("const drawVALevel = (p: number, rgba: string, tag: string) => {");
  const block = CHART.slice(at, CHART.indexOf('if (vahPrice !== pocPrice) drawVALevel(', at));

  it("finds the tag drawer", () => {
    expect(at).toBeGreaterThan(-1);
    expect(block.length).toBeGreaterThan(1500);
  });

  it("an off-screen level's marker sits under the header band, not in it", () => {
    expect(block).toContain("const edgeY = above ? HEADER_FLOOR_Y + 4 : H - 9;");
    expect(block).not.toContain("above ? 9 :");
  });

  it("a tag whose row would enter the band reads under its line, floored at the band", () => {
    expect(block).toContain("const tagBelow = midY - 12 < HEADER_FLOOR_Y;");
    expect(block).toContain("const tagY = tagBelow ? Math.max(midY + 2, HEADER_FLOOR_Y) : midY - 1;");
    expect(block).toContain("ctx.fillText(tagTxt, vpRight - vpW - 2, tagY);");
  });
});
