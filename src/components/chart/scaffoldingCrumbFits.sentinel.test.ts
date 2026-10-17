import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * THE DEPTH TRAIL FITS ITS BOX (serving 390, BTC-USD 5m all-on, 2026-10-10): the
 * narrow type floor lifted the scaffolding trail to 11 px and
 * "FOUNDATION › INTERMEDIATE › ADVANCED / P…" ran out of the plaque and off the pane.
 * Both call sites pass their box width; a trail that does not fit says only the depth in force.
 */
const MC = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");

describe("scaffolding crumb is bounded", () => {
  it("reads the chart", () => {
    expect(MC.length).toBeGreaterThan(100_000);
  });
  it("measures the whole trail and falls back to the depth alone", () => {
    expect(MC).toContain("const crumb = (x: number, y: number, px: number, maxW = Infinity) => {");
    expect(MC).toContain('ctx.fillText(depth === "PRO" ? "ADVANCED / PRO" : depth, x, y);');
    expect(MC).toContain('ds.scaffoldingCrumb = "DEPTH_ONLY";');
  });
  it("both call sites pass their box width", () => {
    expect(MC).toContain("crumb(qx + 8, qy + 10, 8, qw - 16);");
    expect(MC).toContain('crumb(10, 10, depth === "FOUNDATION" && pick.form === "FULL" ? 9 : 7.5, w - 20);');
    expect(MC.match(/\bcrumb\(/g)?.length).toBe(2);
  });
});

describe("scaffolding pressure-arrow words stay inside the plot (serving 390: \"↑ RESU…\" under the axis)", () => {
  it("tries the left side when the right overflows, and never draws a word across the plot edge", () => {
    expect(MC).toContain("const fitsRight = rightOf.x + rightOf.w <= plotRight - 2;");
    expect(MC).toContain('if ((placed.mode === "CLEAR" || placed.mode === "MOVED") && placed.rect.x + placed.rect.w <= plotRight - 2) {');
  });
});

