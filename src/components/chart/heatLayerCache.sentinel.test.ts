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
    const firstDraw = loopBody.indexOf("heatDraws.push(() => paintHeatCellSprite(cellSpriteKey, { x: cx0, y: top }, reach, (ctxHeat: CanvasRenderingContext2D) => {");
    expect(firstDraw).toBeGreaterThan(0);
    for (const m of loopBody.matchAll(/ctxHeat\.filter = `blur/g)) expect(m.index!).toBeGreaterThan(firstDraw);
    expect(block).toMatch(/if \(heatDraws\.length > 0 && heatKey !== heatLayerKeyRef\.current\) \{\s*ctxHeat\.setTransform\(1, 0, 0, 1, 0, 0\);\s*ctxHeat\.clearRect\(0, 0, hc\.width, hc\.height\);\s*ctxHeat\.setTransform\(T\);\s*for \(const draw of heatDraws\) draw\(\);/);
    expect(block.match(/clearRect\(/g)).toHaveLength(1);
  });
  // 2026-10-10 19:45: sprites are keyed on the cell's SHAPE, not its position (serving 750e093: the
  // position key re-blurred 11 of 12 cells every frame on a live chart). Laid on at the origin's device pixel.
  it("a cell whose shape did not change is composited from its sprite, keyed by the device scale, regulator and the cell's shape", () => {
    expect(block).toContain("const cellSpriteKey = `${cell.index}:${cw.toFixed(1)}:${band.toFixed(1)}:${alpha}:${tone}:${cell.intensity}`;");
    expect(block).not.toMatch(/cellSpriteKey = [^;]*(cx0|top)\b/);
    expect(block).toContain("const key = `${T.a},${T.d}|${heat.maxOpacity}|${part}`;");
    expect(block).toContain("ctxHeat.drawImage(sprite.canvas, Math.round(T.a * origin.x + T.e) + sprite.x, Math.round(T.d * origin.y + T.f) + sprite.y);");
    expect(block).toContain("contours += sprite.contours;");
    expect(block).toContain("ds.heatLensCellSprites = `REUSED:${heatSpritesReused}|DRAWN:${heatSpritesDrawn}`;");
  });
  // 2026-10-11 G19 Mansion: on a live 15s tape every print re-normalised each cell's ink by a few
  // thousandths and every autoscale nudge moved a band by a sub-pixel, so all sprites were re-blurred
  // every frame (REUSED:0|DRAWN:11). The cell is inked at the glass's own resolution.
  it("a cell is inked at the glass quantum — 1/32 ramp, 1/200 opacity, whole-pixel band and span", () => {
    const loop = MC.slice(MC.indexOf("GLASS QUANTUM"), at > 0 ? MC.indexOf("ds.heatLensUntimed = String(untimed);", at) : 0);
    expect(loop).toContain("const quantumCells = heat.cells.map(c => ({ ...c, intensity: Math.round(c.intensity * 32) / 32, opacity: Math.round(c.opacity * 200) / 200 }));");
    expect(loop).toContain("const orderedCells = hctx ? quantumCells.sort((a, b) => a.intensity - b.intensity) : [];");
    expect(loop).toContain("const band = Math.max(1, Math.round(bandMeasured));");
    expect(loop).toContain("const top = Math.min(+yh, +yl) + (bandMeasured - band) / 2;");
    expect(loop).toContain("const cw = Math.max(1, Math.round(cx1 - cx0));");
    // The sprite never reaches for the unquantised right edge.
    expect(loop.slice(loop.indexOf("heatDraws.push("), loop.indexOf("painted++;"))).not.toMatch(/\bcx1\b/);
  });
  it("the receipt names which happened; the counts stay the drawn counts", () => {
    expect(block).toContain('ds.heatLensLayer = "REDRAWN";');
    expect(block).toContain('ds.heatLensLayer = "REUSED";');
    expect(block).toContain("contours = heatContoursCachedRef.current;");
  });
});
