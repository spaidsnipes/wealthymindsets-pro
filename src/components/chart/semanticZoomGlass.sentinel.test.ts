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
    // Exactly one density call. The visible-count formula lives in the owner
    // and in the zoom WORD's own block only (semanticZoomOnGlass requires the
    // word to read the camera itself); no depth-shaped layer carries a copy.
    expect(CHART.match(/semanticDensityForBarCount\(/g)).toHaveLength(1);
    const counts = [...CHART.matchAll(/Math\.ceil\(\w+\.from\) \+ 1/g)].map(m => m.index ?? -1);
    expect(counts).toHaveLength(2);
    const word = CHART.indexOf("const zoom = selectSemanticZoom({ visibleBarCount: count });");
    expect(word).toBeGreaterThan(counts[1]);
    expect(word - counts[1]).toBeLessThan(200);
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
    // The question lens still quiets the layers later — through the attention
    // governor, which reads the owner and never rewrites it.
    expect(CHART.indexOf("att = att.withQuestionQuiet(questionQuiet);")).toBeGreaterThan(owner);
    expect(CHART).not.toMatch(/semanticDensity\s*=\s*\{/);
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
    expect(block).toMatch(/farStructure = scaffoldingStructureRef\.current;/);
    expect(block).toMatch(/selectFarRegimeEnvelope\(\{ structure: farStructure,/);
    expect(block).toMatch(/ctx\.fillText\(n\.word,/);
    expect(block).not.toMatch(/HIGHER|LOWER/);
  });

  it("FAR pivot names stay on the pane body, inside the plot, unboxed, and are obstacles", () => {
    const far = CHART.indexOf("if (semanticDensity.depth === \"FAR\") {");
    expect(CHART.indexOf("const HEADER_FLOOR_Y = 90;")).toBeGreaterThan(-1);
    expect(CHART.indexOf("const HEADER_FLOOR_Y = 90;")).toBeLessThan(far);
    const at = CHART.indexOf("for (const n of env.named) {", far);
    expect(at).toBeGreaterThan(far);
    const loop = CHART.slice(at, CHART.indexOf("farPainted = `DIM+ENVELOPE:", at));
    expect(loop).toMatch(/ctx\.fillText\(n\.word, lx, ly\);/);
    // A HIGH that would print into the header steps below; a LOW at the foot steps above.
    expect(loop).toMatch(/if \(above && \+yn - 26 - th < HEADER_FLOOR_Y\) above = false;/);
    expect(loop).toMatch(/else if \(!above && \+yn \+ 26 \+ th > pane0Bottom - 4\) above = true;/);
    expect(loop).toMatch(/const lx = Math\.min\(Math\.max\(\+xn, tw \/ 2 \+ 4\), plotRight - tw \/ 2 - 4\);/);
    expect(loop).toMatch(/forceChips\.push\(\{ x: lx - tw \/ 2, y: ly - th \/ 2, w: tw, h: th \}\);/);
    // Halo text, no backing box (a flipped name lands on candles).
    expect(loop).not.toMatch(/fillRect/);
    // The receipt counts names that reached the glass, written after the paint.
    expect(CHART.slice(far, CHART.indexOf("delete canvas.dataset.farForm;", far))).toMatch(/canvas\.dataset\.farForm = farPainted;/);
  });

  // UPDATED 2026-09-25 (Founder: "STOP BUILDING FROM MEMORY … I STILL HAVE A
  // LOT OF JUST CARDS"). NEAR used to paint a TAPE · LAST 10 PRINTS list box
  // and name the live candle's parts in words at rest. The pins below hold the
  // new truth: tape as geometry on the bars, words only on hover/selection.
  // The full NEAR geometry law is nearGeometry.sentinel.test.ts.
  const nearBlock = () => {
    const near = CHART.indexOf("const nearDepth = semanticDensity.depth;");
    expect(near).toBeGreaterThan(-1);
    const end = CHART.indexOf("for (const k of NEAR_GLASS_RECEIPTS) delete canvas.dataset[k];", near);
    expect(end).toBeGreaterThan(near);
    return CHART.slice(near, end);
  };

  it("NEAR anatomy words come from prices, not pixels", () => {
    const block = nearBlock();
    expect(block).toMatch(/for \(const p of nearCandleAnatomyParts\(wb\.c\)\) \{/);
    // No pixel-distance equality and no hard-coded wick words in the painter.
    expect(block).not.toMatch(/Math\.abs\(\+yO - \+yC\)/);
    expect(block).not.toMatch(/"OPEN = CLOSE"|"HIGH \(WICK\)"|"LOW \(WICK\)"/);
  });

  it("the NEAR tape reads a cached per-bar owner — no per-frame spread, flatMap or sort of the captured prints", () => {
    const block = nearBlock();
    expect(block).toMatch(/const next = selectBarTape\(prints, prev, \{ barTime: bt, intervalSec: intervalN, maxDots: NEAR_TAPE_MAX_DOTS, withPath: bt === Number\(lastBar\.time\) \}\);/);
    expect(block).toMatch(/if \(next !== prev\) nearBarTapeCache\.bars\.set\(bt, next\);/);
    expect(block).not.toMatch(/accN\.keys\(\)|\[\.\.\.accN|flatMap\(|\.sort\(/);
    // The list owner is no longer read by the glass.
    expect(CHART).not.toMatch(/selectNearTape\(/);
  });

  it("NEAR words are halo text on leaders that start outside the body, placed by the keep-out owner — no boxes over the candles", () => {
    const block = nearBlock();
    const from = block.indexOf("let wordsN = 0;");
    expect(from).toBeGreaterThan(-1);
    const w = block.slice(from, block.indexOf("ctx.restore();\n", block.indexOf("forceChips.push(at);", from)));
    expect(w).toMatch(/const bodyEdge = wb\.cx - halfW - 2;/);
    expect(w).toMatch(/ctx\.moveTo\(bodyEdge, /);
    expect(w).toMatch(/const at = placeNear\(/);
    expect(w).toMatch(/ctx\.shadowBlur = 3;/);
    expect(w).not.toMatch(/fillRect/);
    // Still obstacles for everything painted after.
    expect(w).toMatch(/forceChips\.push\(at\);/);
  });

  it("the FAR envelope is recomputed only when the bars, the structure reading or the visible range change", () => {
    const far = CHART.indexOf("if (semanticDensity.depth === \"FAR\") {");
    const block = CHART.slice(far, CHART.indexOf("delete canvas.dataset.farForm;", far));
    expect(block).toMatch(/const hit = fc && fc\.bars === farBars && fc\.structure === farStructure && fc\.from === visibleFrom && fc\.to === visibleTo \? fc : null;/);
    expect(block).toMatch(/const env = hit \? hit\.vm : selectFarRegimeEnvelope\(/);
    // One call, behind the cache; no per-frame copy of the history.
    expect(block.match(/selectFarRegimeEnvelope\(/g)).toHaveLength(1);
    expect(block).not.toMatch(/barsRef\.current \?\? \[\]\)\.map/);
  });
});
