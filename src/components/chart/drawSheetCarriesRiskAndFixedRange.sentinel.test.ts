/**
 * THE WORKSPACE DRAW SHEET CARRIES RISK GEOMETRY AND THE FIXED RANGE PROFILE.
 *
 * F24 audit (Garden 11 first inspection task): Workspace → Draw opened a sheet
 * with 15 tools and no Long/Short Position — the only way to put entry / stop /
 * target on price was a second, different tool set behind Tools → Chart tools
 * → Flow & studies. The user-selected profile (H-601 #8 Fixed Range) had no
 * Draw door either. One Draw door now carries both.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SHEET = readFileSync(path.join(process.cwd(), "src/components/chart/LeftDrawingSidebar.tsx"), "utf8");

describe("the Workspace Draw sheet", () => {
  it.each(["long-position", "short-position", "anchored-vp"])("offers %s", id => {
    expect(SHEET).toContain(`id: "${id}"`);
  });
});

/**
 * …AND ON THE GLASS THE FIXED RANGE IS ITS ANCHORS, NOT A BOX (GP12 Defect 1:
 * "Fixed Range — the visual must have lawful handles/anchors"). Serving drew a
 * washed rectangle whose edges were not where hitHandle grabs.
 */
const CHART = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

describe("the Fixed Range drawing on the glass", () => {
  const from = CHART.indexOf('else if (t === "anchored-vp")');
  const block = CHART.slice(from, CHART.indexOf('else if (t === "delta-vp")', from));

  it("paints anchor rails and knobs at the grab points, and no washed box", () => {
    expect(block.length).toBeGreaterThan(1200);
    expect(block).toContain("for (const rx of [x0, x1])");
    expect(block).toContain("for (const P of [A, B])");
    expect(block).toContain("ctx.arc(kx, P.y, 3.5, 0, Math.PI * 2)");
    const drawnArm = block.slice(block.indexOf("if (vm.drawn) {"), block.indexOf("} else {", block.indexOf("if (vm.drawn) {")));
    expect(drawnArm).not.toContain("strokeRect(");
    expect(drawnArm).not.toContain('pk.rgbaAs("WASH"');
  });

  it("the knobs sit where the handles are grabbed", () => {
    expect(CHART).toContain("for (let k = 0; k < d.pts.length; k++) { const q = logicalToPixel(d.pts[k]); if (q && Math.hypot(q.x - x, q.y - y) <= tol) return k; }");
  });
});
