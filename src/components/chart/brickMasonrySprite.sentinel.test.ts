import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * MASONRY SPRITE (serving 196b696, BTC-USD 5m, 2026-10-11: Brick Walls alone cost +8 ms a frame —
 * a gradient, arris lines and pits per brick per frame). The courses are rendered once per wall
 * SHAPE and laid on at the wall's right end; holes / chips ride with the sprite.
 */
const MC = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");

describe("brick courses are cached by shape", () => {
  it("reads the chart", () => {
    expect(MC.length).toBeGreaterThan(100_000);
  });
  it("every brick paints through paintCourses(bctx), never straight onto ctx", () => {
    const a = MC.indexOf("const paintCourses = (bctx: CanvasRenderingContext2D) => {");
    const b = MC.indexOf("const keyB = ", a);
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
    const body = MC.slice(a, MC.indexOf("                };", a));
    expect(body).toContain("bctx.createLinearGradient(bx0, yb, bx0 + bw * 0.4, yb + courseH)");
    expect(body).not.toMatch(/[^b]ctx\./);
  });
  it("the key holds the shape and never the screen position", () => {
    expect(MC).toContain("const keyB = `${T.a},${T.d}|${Math.round(len)}|${courses}|${courseH}|${w.life}|${Math.round(w.strike * 100)}|${baseA.toFixed(2)}|${brickFaceRef.current.join(\",\")}|${breaking ? Math.round(gapMid - x1) : \"\"}|${crackXs.map(cx => Math.round(cx - x1)).join(\",\")}`;");
    expect(MC).toContain("if (sp) { holes += sp.holes; chipped += sp.chipped; brickSpritesReused++; }");
    expect(MC).toContain("ds.brickWallSprites = `REUSED:${brickSpritesReused}|DRAWN:${brickSpritesDrawn}`;");
  });
});
