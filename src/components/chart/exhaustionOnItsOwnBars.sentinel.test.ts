/**
 * THE EXHAUSTION MARK SITS ON THE BARS ITS OWNER MEASURED.
 *
 * Garden 12 review. The chart rebuilt the push backwards from the extreme
 * (`iEx - pushBars + 1 … iEx`) and the follow-through slots forwards from it
 * (`iEx + 1 … iEx + 3`). The extreme is not always the push's last bar, so the
 * fuel landed on the origin bar and dropped the faded last bar, and the slots
 * sat one bar early. `selectExhaustion` now publishes the push's span and the
 * bars follow-through was counted on; the canvas only projects them.
 *
 * The slot "fill" branch could never run — a mark exists only when follow-
 * through is 0 of FT_BARS — so the rings are plainly hollow: each is a bar
 * that failed.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const CHART = strip(readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8"));

const block = (() => {
  const start = CHART.indexOf("const ex = selectExhaustion(anatomy);");
  const end = CHART.indexOf("if (layerOnRef.current.anatomyCards === true)", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return CHART.slice(start, end);
})();

describe("exhaustion geometry", () => {
  it("draws the fuel on the push's own span, from the owner", () => {
    expect(block).toMatch(/if \(ab\.time < m\.pushStartTime\) continue;/);
    expect(block).toMatch(/if \(ab\.time > m\.pushEndTime\) break;/);
    // The scan found the fuel it is about before asserting absences: ONE
    // ribbon on the push's own extremes, thick where that bar's effort was
    // (GP12 H-701A — a column per bar is absorption's grammar, not this).
    expect(block).toMatch(/rib\.push\(\{ x: \+xb, y: \+yb, t: 1 \+ ab\.effortNorm \* 10 \}\);/);
    expect(block).toMatch(/for \(let i = rib\.length - 1; i >= 0; i--\) ctx\.lineTo/);
    // The failure is a stop line at the push's own extreme (the mark price).
    expect(block).toMatch(/ctx\.moveTo\(xFrom, \+yr\); ctx\.lineTo\(xTo, \+yr\);/);
    expect(block).not.toMatch(/m\.pushBars/);
    expect(block).not.toMatch(/ab\.time === m\.time/);
  });

  it("rings the bars follow-through was measured on, and every ring is hollow", () => {
    const at = block.indexOf("for (const t of m.followThroughTimes) {");
    expect(at).toBeGreaterThan(-1);
    const ring = block.slice(at, block.indexOf("}", at));
    expect(ring).toMatch(/ctx\.arc\(\+xb, y0, 3, 0, Math\.PI \* 2\); ctx\.stroke\(\);/);
    expect(ring).not.toMatch(/ctx\.fill\(\)/);
    expect(block).not.toMatch(/k < m\.followThrough/);
  });

  it("the geometry receipt lists what each mark drew and is withdrawn when none drew", () => {
    expect(block).toMatch(/exhaustionDrawn\.push\(`FUEL:\$\{fuel\}\+SLOTS:\$\{rings\}`\);/);
    expect(block).toMatch(/if \(exhaustionDrawn\.length > 0\) ds\.exhaustionGeometry = exhaustionDrawn\.join\("\|"\);\s*else delete ds\.exhaustionGeometry;/);
  });

  it("a chip that could only print over another chip holds its words, and says so", () => {
    // Serving TSLA 5m, 2026-09-25: the EXHAUSTION chip printed over the
    // absorption shelf's own name when no slot within reach was clear.
    expect(block).toContain('const chipOnChip = spotX.mode === "BLOCKED" && rectHits(spotX.rect, floatingChips) > 0;');
    const drawArm = block.slice(block.indexOf("if (chipOnChip) {"), block.indexOf("ctx.restore();", block.indexOf("if (chipOnChip) {")));
    expect(drawArm).toContain("exhaustionChipsYielded++;");
    // The words, backing and ledger entry live only in the not-yielded arm.
    const elseArm = drawArm.slice(drawArm.indexOf("} else {"));
    expect(elseArm).toContain("ctx.fillText(chipTxt, cxx + 6, cy + 7.5);");
    expect(elseArm).toContain("floatingChips.push({ x: cxx, y: cy, w: cw, h: 14 });");
    expect(block).toMatch(/if \(exhaustionChipsYielded > 0\) ds\.exhaustionChipsYielded = String\(exhaustionChipsYielded\);\s*else delete ds\.exhaustionChipsYielded;/);
  });
});

