/**
 * PERFORMANCE (serving NQ1! 5m, 2026-10-06): Weather alone cost a 14–16 ms
 * mean frame with 54 ms spikes — ~70 canvas blur filters per frame redrawing
 * a heat layer whose pixels are a pure function of the cells' geometry. The
 * layer is now redrawn only when that geometry changes. These pins keep the
 * cache honest: every input that shapes a pixel is in the key, and the blur
 * draws run only inside the replay.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");
const at = MC.indexOf("const heatDraws: (() => void)[] = [];");
const block = MC.slice(at, MC.indexOf("ds.heatLensUntimed = String(untimed);", at));

describe("the heat layer is redrawn only when what it paints changes", () => {
  it("the key carries the canvas size, the device transform, the regulator and every cell's index, span, band, alpha, tone and intensity", () => {
    expect(at).toBeGreaterThan(0);
    expect(block).toContain("heatKeyParts.push(`${cell.index}:${cx0.toFixed(2)}:${cx1.toFixed(2)}:${top.toFixed(2)}:${band.toFixed(2)}:${alpha}:${tone}:${cell.intensity}`);");
    expect(block).toContain("const heatKey = `${hc.width}x${hc.height}|${T.a},${T.b},${T.c},${T.d},${T.e},${T.f}|${heat.maxOpacity}|${heatKeyParts.join(\";\")}`;");
  });
  it("every blur filter and gradient on the heat layer sits inside a replayed draw, and the layer is cleared only when it is replayed", () => {
    const loopBody = block.slice(0, block.indexOf("const T = mainCtx.getTransform();"));
    const firstDraw = loopBody.indexOf("heatDraws.push(() => {");
    expect(firstDraw).toBeGreaterThan(0);
    for (const m of loopBody.matchAll(/ctxHeat\.filter = `blur/g)) expect(m.index!).toBeGreaterThan(firstDraw);
    expect(block).toMatch(/if \(heatDraws\.length > 0 && heatKey !== heatLayerKeyRef\.current\) \{\s*ctxHeat\.setTransform\(1, 0, 0, 1, 0, 0\);\s*ctxHeat\.clearRect\(0, 0, hc\.width, hc\.height\);\s*ctxHeat\.setTransform\(T\);\s*for \(const draw of heatDraws\) draw\(\);/);
    expect(block.match(/clearRect\(/g)).toHaveLength(1);
  });
  it("the receipt names which happened; the counts stay the drawn counts", () => {
    expect(block).toContain('ds.heatLensLayer = "REDRAWN";');
    expect(block).toContain('ds.heatLensLayer = "REUSED";');
    expect(block).toContain("contours = heatContoursCachedRef.current;");
  });
});
