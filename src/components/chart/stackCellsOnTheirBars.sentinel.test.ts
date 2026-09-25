/**
 * THE STACK'S CELLS SIT ON THE BARS THAT BUILT IT, OR NOWHERE.
 *
 * Garden 12 review: `stackAnchor` clamped an off-screen formation to the plot
 * edge, so a stack formed twenty bars back painted gold slabs on whichever
 * bars sat at x = 0 — bars that built nothing — while the anchor receipt kept
 * naming a formation key. Placement is now decided in
 * `src/lib/chart/stackedImbalanceAnchor.ts` (unit-tested); this file checks
 * the paint block obeys it.
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
  const start = CHART.indexOf("selectStackedImbalanceGlass(imbalanceStackRef.current)");
  const end = CHART.indexOf("delete ds.imbalanceStackAnchor;\n        }", start);
  expect(start, "the stack glass call was renamed or removed").toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return CHART.slice(start, end);
})();

describe("stack placement on the glass", () => {
  it("takes its placement from the tested owner, not a local clamp", () => {
    expect(CHART).toMatch(/import \{[^}]*\bstackAnchor\b[^}]*\} from "@\/lib\/chart\/stackedImbalanceAnchor";/);
    expect(CHART).not.toMatch(/^function stackAnchor\(/m);
    expect(block).toMatch(/const placement = stackAnchor\(chart, barsRef\.current \?\? \[\], glass\.formedFrom, glass\.formedTo, plotRight\);/);
  });

  it("the receipt names the placement word, never a formation key for bars not in view", () => {
    expect(block).toMatch(/ds\.imbalanceStackAnchor = placement\.kind === "ON_BARS" \? placement\.key : placement\.kind;/);
  });

  it("a stack formed after every bar in view draws nothing (no lookahead)", () => {
    expect(block).toMatch(/if \(yHiR != null && yLoR != null && placement\.kind !== "FORMED_AFTER_VIEW"\) \{/);
  });

  it("cells are painted only from an ON_BARS placement", () => {
    expect(block).toMatch(/const anchor = placement\.kind === "ON_BARS" \? placement : null;/);
    const calls = [...block.matchAll(/paintStackCell\(ctx, (\w+),/g)].map(m => m[1]);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every(a => a === "anchor")).toBe(true);
  });

  it("each slab is painted from the span-bounded owner, with no minimum length", () => {
    const at = CHART.indexOf("function paintStackCell(");
    expect(at).toBeGreaterThan(-1);
    const body = CHART.slice(at, CHART.indexOf("\n}\n", at));
    expect(body).toMatch(/const \{ x, w \} = stackSlab\(a, weight\);/);
    expect(body).toMatch(/ctx\.fillRect\(x, /);
    expect(body).toMatch(/ctx\.strokeRect\(x \+ 0\.5, /);
    expect(body).not.toMatch(/Math\.max\(a\.x1 - a\.x0/);
    expect(body).not.toMatch(/a\.x0/);
  });

  it("the stack chip steps around chips already on the glass and registers its own", () => {
    // Updated 2026-09-25 (FL-06 direct annotation + keep-out): the chip-free
    // slot is still found first (`let chipY`), then the keep-out owner may
    // move it to a chip-free slot that also clears the candle bodies; desktop
    // paints the words unboxed, narrow keeps the backed box. The chip is still
    // registered before any paint — boxed or not.
    const chip = block.slice(block.indexOf("const chipX = anchored"), block.lastIndexOf("ctx.fillText(glass.label"));
    expect(chip.length).toBeGreaterThan(0);
    expect(chip).toMatch(/const stackChipHit = \(y: number\) => floatingChips\.some\(/);
    expect(chip).toMatch(/let chipY = stackChipSlots\.find\(y => !stackChipHit\(y\)\)/);
    expect(chip).toMatch(/pickSlotClearOfKeepOut\(\s*stackSlotRects,\s*\[\.\.\.keepOut\(\), \.\.\.rowBodiesAt\(/);
    expect(chip).toMatch(/s => stackChipHit\(s\.y\),/);
    expect(chip).toContain("if (stackSpot) { chipY = stackSpot.rect.y; recordKeepOut(keepOutLedger, stackSpot); }");
    expect(chip).toMatch(/floatingChips\.push\(\{ x: chipX, y: chipY, w: chipW, h: chipH \}\);/);
    // The chip is registered before anything paints after it.
    const push = chip.indexOf("floatingChips.push(");
    expect(push).toBeLessThan(chip.indexOf("ctx.fillText(glass.label"));
    expect(push).toBeLessThan(chip.indexOf("ctx.fillRect(chipX, chipY"));
    expect(chip.indexOf("ctx.fillRect(chipX, chipY")).toBeGreaterThan(-1);
  });

  it("desktop words are a direct annotation; the backed box is narrow-only and yields to candles", () => {
    const words = block.slice(block.indexOf("if (W >= 960) {", block.indexOf("const chipX = anchored")));
    const desktop = words.slice(0, words.indexOf("} else {"));
    expect(desktop).toContain("ctx.fillText(glass.label, chipX + 6, chipY + chipH / 2 + 0.5);");
    expect(desktop).not.toMatch(/fillRect|strokeRect/);
    expect(words).toContain("ctx.fillStyle = `rgba(14,12,8,${stackSpot ? keepOutBackingAlpha(stackSpot, 0.92) : 0.92})`;");
    expect(block).toMatch(/ds\.imbalanceStackLabel = stackSpot \? `\$\{stackSpot\.mode\}\$\{stackSpot\.onCandles \? ":YIELDED" : ""\}` : "CHIPS_FULL";/);
    expect([...block.matchAll(/delete ds\.imbalanceStackLabel;/g)].length).toBe(2);
  });
});
