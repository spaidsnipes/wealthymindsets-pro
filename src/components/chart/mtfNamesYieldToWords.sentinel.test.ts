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
    const body = MC.slice(MC.indexOf("const nameIn = ("), MC.indexOf("const nameIn = (") + 1400);
    expect(body).toContain("const clear = [(x0 + x1) / 2, x0 + 8 + w / 2, x1 - 8 - w / 2].find(");
    expect(body).toContain("!floatingChips.some(");
    expect(body).toContain("if (clear == null) return;");
    expect(body).toContain("floatingChips.push({ x: clear - w / 2 - 2, y: yMid - 7, w: w + 4, h: 14 });");
  });
  it("gap words are among the chips it can see", () => {
    expect(MC.indexOf("forceChips.push({ x: mx - tw / 2, y: my - 12, w: tw, h: 13 });"))
      .toBeLessThan(MC.indexOf("const floatingChips: { x: number; y: number; w: number; h: number }[] = [...forceChips];"));
  });
});
