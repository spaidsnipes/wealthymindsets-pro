/**
 * PROFILE FAMILY GLASS — WHAT THE GEOMETRY MAY NOT CLAIM.
 *
 * Found reviewing the Garden Pass 12 profile commits against HEAD (2026-09-25):
 * each item below drew something no owner computed, hid its own mark, or
 * re-derived an owner's reading inside the 30fps paint.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const CHART = strip(readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8"));

describe("profile family glass honesty", () => {
  it("Living silhouette is traced one contiguous run at a time — never across an untraded gap", () => {
    // The body is split into contiguous runs first; each run is its own
    // closed path back to the base — an untraded gap is never body.
    expect(CHART).toMatch(/if \(i === 0 \|\| pts\[i\]\.y - pts\[i - 1\]\.y > gapPx\) runPts\.push\(\[\]\);/);
    expect(CHART).toMatch(/bodyPath\.lineTo\(rightEdge, last\.y\);\s*bodyPath\.closePath\(\);/);
    expect(CHART).toMatch(/ds\.livingProfileForm = `BODY:\$\{runPts\.length\}`;/);
  });

  it("the developing-POC tether is drawn only when the session trail and the histogram agree on the level", () => {
    expect(CHART).toMatch(/if \(pocY != null && Math\.abs\(\+pocY - lastY\) <= 4\) \{/);
  });

  it("the Structure tether is reachable (histogram pinned left of its swing) and the receipt says TETHER only when it drew", () => {
    expect(CHART).toMatch(/if \(x0 - histX > 8\) \{/);
    expect(CHART).not.toMatch(/if \(histX > x0 \+ 8\)/);
    expect(CHART).toMatch(/\$\{tethered \? "\+TETHER" : ""\}/);
  });

  it("the Composite sediment sits at the measured foot of the candle pane, not a fraction of the container", () => {
    expect(CHART).not.toMatch(/Math\.round\(H \* 0\.72\)/);
    expect(CHART).toMatch(/chart\.panes\(\)\[0\]\?\.getHeight\(\)/);
  });

  it("TPO rows fit their column, letters only where a glyph fits, blocks stay a tint", () => {
    expect(CHART).not.toMatch(/Math\.max\(3, Math\.min\(8, Math\.floor\(colMax/);
    expect(CHART).toMatch(/const cellW = Math\.min\(8, colMax \/ maxLetters\);/);
    expect(CHART).toMatch(/cellW >= ctx\.measureText\("M"\)\.width/);
    expect(CHART).toMatch(/ink\(rgb, base \* \(0\.08 \+ 0\.17 \* late\)\)/);
  });

  it("owners, not the paint, compute ghosts and memory tests", () => {
    expect(CHART).toMatch(/if \(ghostCache\?\.source !== ghostSrc\) ghostCache = /);
    expect(CHART).toMatch(/for \(const t of l\.recentTestTimes\)/);
    expect(CHART).not.toMatch(/memBars\.map\(b => Number\(b\.time\)\)\.filter/);
  });

  it("the fused object answers to the governors, and its diamond sits on its own body", () => {
    expect(CHART).toMatch(/const fuseA = att\.alpha\("fusedObject"\);/);
    expect(CHART).toMatch(/const cx = spanL \+ 8, cy = \+yF;/);
  });

  it("FAR withholds Living rows, so it withholds the marks placed at row tips", () => {
    expect(CHART).toMatch(/for \(const m of \(livingDepth === "FAR" \? \[\] : lp\.marks\)\)/);
  });

  it("profile geometry receipts are withdrawn every frame before the stack paints", () => {
    const at = CHART.indexOf("for (const k of PROFILE_GEOMETRY_RECEIPTS) delete ds[k];");
    expect(at).toBeGreaterThan(-1);
    for (const k of ["livingProfileForm", "structureProfileGeometry", "tpoGeometry", "compositeGeometry", "profileFusionGeometry"]) {
      const write = CHART.indexOf(`ds.${k} =`);
      expect(write, k).toBeGreaterThan(at);
    }
  });
});
