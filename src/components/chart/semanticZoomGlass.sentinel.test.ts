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

  it("NEAR anatomy words come from prices, not pixels; tape prices use the house formatter", () => {
    const near = CHART.indexOf("const nearDepth = semanticDensity.depth;");
    expect(near).toBeGreaterThan(-1);
    const block = CHART.slice(near, CHART.indexOf("delete canvas.dataset.nearTape;", near));
    expect(block).toMatch(/for \(const p of nearCandleAnatomyParts\(lastBar\)\) \{/);
    // No pixel-distance equality and no hard-coded wick words in the painter.
    expect(block).not.toMatch(/Math\.abs\(\+yO - \+yC\)/);
    expect(block).not.toMatch(/"OPEN = CLOSE"|"HIGH \(WICK\)"|"LOW \(WICK\)"/);
    // Sub-dollar prints keep their digits: the tape owner formats with
    // formatBubblePrice (unit-tested there); the painter prints its string.
    expect(block).toMatch(/ctx\.fillText\(t\.price, /);
    expect(block).not.toMatch(/\.price\.toFixed\(2\)/);
  });

  it("the TAPE column reads a cached owner — no per-frame spread, flatMap or sort of the captured prints", () => {
    const near = CHART.indexOf("const nearDepth = semanticDensity.depth;");
    const anatomyEnd = CHART.indexOf("canvas.dataset.nearAnatomy = String(parts);", near);
    expect(anatomyEnd).toBeGreaterThan(near);
    const tape = CHART.slice(anatomyEnd, CHART.indexOf("delete canvas.dataset.nearTape;", near));
    expect(tape).toMatch(/nearTapeCache = selectNearTape\(bigTradePrintAccRef\.current, nearTapeCache\);/);
    expect(tape).toMatch(/const prints = nearTapeCache\.vm\.rows;/);
    expect(tape).not.toMatch(/\.keys\(\)|flatMap\(|\.sort\(/);
  });

  it("the TAPE column prints each row's side at its fidelity and the legend whenever a side is not observed", () => {
    const near = CHART.indexOf("const nearDepth = semanticDensity.depth;");
    const anatomyEnd = CHART.indexOf("canvas.dataset.nearAnatomy = String(parts);", near);
    const tape = CHART.slice(anatomyEnd, CHART.indexOf("delete canvas.dataset.nearTape;", near));
    expect(tape).toMatch(/const tapeNote = nearTapeCache\.vm\.fidelityNote;/);
    expect(tape).toMatch(/ctx\.fillText\(tapeNote, /);
    expect(tape).toMatch(/ctx\.fillText\(t\.glyph, /);
    // The painter never mints a bare initiator sign of its own.
    expect(tape).not.toMatch(/\? "\+" : "−"/);
  });

  it("NEAR anatomy words are halo text on leaders that start outside the live body — no boxes over the candles", () => {
    const near = CHART.indexOf("const nearDepth = semanticDensity.depth;");
    const anatomy = CHART.slice(near, CHART.indexOf("canvas.dataset.nearAnatomy = String(parts);", near));
    expect(anatomy).toMatch(/ctx\.fillText\(w\.word, lxw - 4, ly\);/);
    expect(anatomy).toMatch(/ctx\.shadowBlur = 3;/);
    expect(anatomy).not.toMatch(/fillRect/);
    expect(anatomy).toMatch(/const bodyEdge = cx - halfW - 2;/);
    expect(anatomy).toMatch(/ctx\.moveTo\(bodyEdge, /);
    expect(anatomy).not.toMatch(/moveTo\(cx - 6,/);
    // Still obstacles for everything painted after.
    expect(anatomy).toMatch(/forceChips\.push\(\{ x: lxw - tw - 2, y: ly - 7, w: tw, h: 14 \}\);/);
  });

  it("the TAPE column yields the left column to Scaffolding and the Question Lens, steps around earlier chips, and reports only rows on the glass", () => {
    const near = CHART.indexOf("const nearDepth = semanticDensity.depth;");
    const anatomyEnd = CHART.indexOf("canvas.dataset.nearAnatomy = String(parts);", near);
    const tape = CHART.slice(anatomyEnd, CHART.indexOf("delete canvas.dataset.nearTape;", near));
    expect(tape).toMatch(/const tapeYieldsTo = scaffoldingDepthRef\.current !== "OFF" \? "SCAFFOLDING"\s*: layerOnRef\.current\.questionLens === true && W >= 640 \? "QUESTION_LENS"/);
    expect(tape).toMatch(/\} else if \(tapeYieldsTo\) \{\s*canvas\.dataset\.nearTape = `YIELDED:\$\{tapeYieldsTo\}`;/);
    expect(tape).toMatch(/forceChips\.some\(r => colX < r\.x \+ r\.w && colX \+ colW > r\.x && y < r\.y \+ r\.h && y \+ colH > r\.y\)/);
    expect(tape).toMatch(/const compactTape = W < 640;/);
    // Every write of the receipt, and the count only after the pixels.
    const writes = [...tape.matchAll(/canvas\.dataset\.nearTape = ([^;]+);/g)].map(m => m[1]);
    expect(writes).toEqual(['"NO_TAPE"', "`YIELDED:${tapeYieldsTo}`", '"NO_ROOM"', "compactTape ? `COMPACT:${shown}` : String(shown)"]);
    expect(tape.indexOf("canvas.dataset.nearTape = compactTape")).toBeGreaterThan(tape.indexOf("ctx.fillRect(colX, colY, colW, colH);"));
    expect(tape.indexOf("ctx.fillRect(colX, colY, colW, colH);")).toBeGreaterThan(tape.indexOf("if (colY == null) {"));
    // The plates it yields to still paint at that spot (the reason for the yield).
    expect(CHART).toMatch(/const y0 = 176;/);
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
