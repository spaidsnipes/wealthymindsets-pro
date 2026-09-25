/**
 * SEMANTIC ZOOM GLASS — FAR / MID / NEAR ON ONE CAMERA (H-501).
 *
 * Found reviewing the Garden Pass 12 semantic-zoom commits: the depth was
 * re-derived in six places from copies of one count formula, the FAR veil
 * darkened the oscillator panes, a second swing detector named structure next
 * to the Market Structure owner, and the NEAR anatomy and tape put opaque
 * boxes and unqualified sides on the glass.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const CHART = strip(readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8"));

describe("semantic zoom glass", () => {
  it("depth has ONE per-frame owner, set before the first layer paints; every reader takes .depth from it", () => {
    const owner = CHART.indexOf("semanticDensity = semanticDensityForBarCount(visibleBarCount);");
    expect(owner).toBeGreaterThan(CHART.indexOf("const srs = candleRef.current;"));
    // Exactly one call site and one copy of the visible-count formula.
    expect(CHART.match(/semanticDensityForBarCount\(/g)).toHaveLength(1);
    expect(CHART.match(/Math\.ceil\(\w+\.from\) \+ 1/g)).toHaveLength(1);
    // Each depth-shaped layer reads the owner, after it.
    for (const reader of [
      "const ticketDepth = semanticDensity.depth;",
      "const depthD = semanticDensity.depth;",
      "const nearDepth = semanticDensity.depth;",
      "const shelfDepth = semanticDensity.depth;",
      "const livingDepth = semanticDensity.depth;",
      "if (semanticDensity.depth === \"FAR\") {",
    ]) {
      expect(CHART.indexOf(reader), reader).toBeGreaterThan(owner);
    }
    // The zoom word prints the same count the owner read.
    expect(CHART).toMatch(/selectSemanticZoom\(\{ visibleBarCount: visibleBarCount \}\)/);
    // The question lens still scales the tiers later — depth is untouched by it.
    expect(CHART.indexOf("macro: semanticDensity.macro * questionQuiet,")).toBeGreaterThan(owner);
  });

  it("the FAR veil dims pane 0 only: painted inside the pane-0 clip, sized to it", () => {
    const clip = CHART.indexOf("ctx.rect(0, 0, plotRight, pane0Bottom);\n      ctx.clip();");
    const far = CHART.indexOf("if (semanticDensity.depth === \"FAR\") {");
    expect(clip).toBeGreaterThan(-1);
    expect(far).toBeGreaterThan(clip);
    const block = CHART.slice(far, CHART.indexOf("delete canvas.dataset.farForm;", far));
    expect(block).toMatch(/ctx\.fillStyle = "rgba\(11,10,8,0\.56\)"; ctx\.fillRect\(0, 0, plotRight, pane0Bottom\);/);
    // Nothing in the FAR block measures the container: H spans every pane.
    expect(block).not.toMatch(/\bH\s*-/);
  });

  it("FAR structure comes from the ONE structure owner, and the FAR block prints no sequence word of its own", () => {
    const far = CHART.indexOf("if (semanticDensity.depth === \"FAR\") {");
    const block = CHART.slice(far, CHART.indexOf("delete canvas.dataset.farForm;", far));
    expect(block).toMatch(/selectFarRegimeEnvelope\(\{\s*structure: scaffoldingStructureRef\.current,/);
    expect(block).toMatch(/ctx\.fillText\(n\.word,/);
    expect(block).not.toMatch(/HIGHER|LOWER/);
  });
});
