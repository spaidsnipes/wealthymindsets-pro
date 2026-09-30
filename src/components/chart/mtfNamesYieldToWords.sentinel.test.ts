/**
 * MTF band names yield to words already on the glass (serving TSLA 15m,
 * 2026-09-30: "NO BAR · 1 interval" printed on "4H ANCESTRY BAND"). The gap
 * words paint first and announce themselves; the name slides along its own
 * body or stays quiet, and announces itself in turn.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");

describe("MTF band names never print over other words", () => {
  it("nameIn checks the chips, slides, or stays quiet", () => {
    const body = MC.slice(MC.indexOf("const nameIn = ("), MC.indexOf("const nameIn = (") + 2200);
    expect(body).toContain("const clear = [(x0 + x1) / 2, x0 + 8 + w / 2, x1 - 8 - w / 2].find(");
    expect(body).toContain("...floatingChips,");
    expect(body).toContain("...rowBodiesAt(yMid - 7, yMid + 7),");
    expect(body).toContain("!nameBlockers.some(");
    expect(body).toContain("if (clear == null) return;");
    expect(body).toContain("floatingChips.push({ x: clear - w / 2 - 2, y: yMid - 7, w: w + 4, h: 14 });");
  });
  it("gap words are among the chips it can see", () => {
    expect(MC.indexOf("forceChips.push({ x: mx - tw / 2, y: my - 12, w: tw, h: 13 });"))
      .toBeLessThan(MC.indexOf("const floatingChips: { x: number; y: number; w: number; h: number }[] = [...forceChips];"));
  });
});

describe("the tag places before the name", () => {
  it("a name never pushes its own tag off the right edge", () => {
    expect(MC.indexOf('tag("4H", top + h / 2')).toBeLessThan(MC.indexOf('nameIn("4H ANCESTRY BAND"'));
    expect(MC.indexOf('tag("1H", top + h / 2')).toBeLessThan(MC.indexOf('nameIn("1H NODE"'));
  });
});

describe("the contradiction glyph sits behind words already on the glass", () => {
  it("its zone, arrows and crack are clipped around every chip", () => {
    const at = MC.indexOf('ctx.globalAlpha = att.alpha("contradiction");\n                  ctx.clip(cutC, "evenodd");');
    expect(at).toBeGreaterThan(-1);
    const block = MC.slice(at, at + 900);
    expect(block).toContain("for (const r of floatingChips) {");
    expect(block).toContain("ctx.rect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);");
  });
});

describe("MTF tags stay out of profile columns", () => {
  it("the family's column edge is part of the tag's keep-out", () => {
    expect(MC).toContain("const colLeftT = Math.min(pclT.prev, pclT.cur);");
    expect(MC).toContain("[...keepOut(), ...rowBodiesAt(ty, ty + TAG_H), ...profileColT],");
  });
});

describe("the WAIT tag's leader passes behind words", () => {
  it("its stroke is clipped around every chip but the plate's own", () => {
    const at = MC.indexOf("for (const q of floatingChips.slice(0, -1)) {");
    expect(at).toBeGreaterThan(MC.indexOf("floatingChips.push({ x: spotT.rect.x, y: spotT.rect.y, w: spotT.rect.w, h: spotT.rect.h });"));
    expect(MC.slice(at, at + 500)).toContain("ctx.beginPath(); ctx.moveTo(x, pinY); ctx.lineTo(r.x + r.w / 2, endY); ctx.stroke();");
  });
});

describe("every leader passes behind words (one owner)", () => {
  it("the five plate/word leaders clip through clipOutChips", () => {
    expect(MC).toContain('import { clipOutChips } from "@/lib/chart/clipOutChips";');
    expect(MC.match(/clipOutChips\(ctx, W, H, /g)?.length ?? 0).toBeGreaterThanOrEqual(5);
  });
});
