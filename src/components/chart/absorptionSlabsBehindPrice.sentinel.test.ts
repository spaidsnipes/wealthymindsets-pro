/**
 * F06A · THE ABSORPTION SHELF IS SLABS OF MATERIAL BEHIND PRICE (2026-09-27).
 * The veil (≤ 0.16) was the price of painting ON the candles. Every candle
 * body is now cut out of the slabs first, so the rows can carry body while
 * price stays sovereign — and side ink still appears only where the owner
 * names a side.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");
const at = MC.indexOf("F06A · SLABS WITH BODY");
const block = at > 0 ? MC.slice(at, at + 2200) : "";

describe("absorption slabs", () => {
  it("cut the candles out before filling, so body never covers price", () => {
    expect(block.length).toBeGreaterThan(0);
    const cut = block.indexOf('ctx.clip(cutS, "evenodd");');
    const fill = block.indexOf("for (const r of rowRects) ctx.fillRect(r.x, r.y, r.w, r.h);");
    expect(cut).toBeGreaterThan(0);
    expect(fill).toBeGreaterThan(cut);
  });
  it("body strength follows the owner's side claim (none < inferred < provider)", () => {
    expect(block).toContain("const rowFillA = rowSideInk == null ? 0.26 : rowSideInferred ? 0.30 : 0.38;");
  });
  it("each slab has a lit top edge", () => {
    expect(block).toContain("Each slab's lit top edge");
  });
});
