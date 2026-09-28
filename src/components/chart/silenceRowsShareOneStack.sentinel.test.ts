/**
 * Silence lines share one row stack (serving NQ1! 5m, 2026-09-28): the
 * Derivatives Pressure silence ("no option positioning for NQ1!") and the Risk
 * on Price silence ("no position drawn") were both hard-coded at H - 114 and
 * printed over each other. Every lower-left silence line takes its row from
 * the one allocator declared at the top of draw().
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");

describe("lower-left silence lines never share a row", () => {
  it("one allocator, declared before any layer paints", () => {
    const decl = MC.indexOf("const takeSilenceRow = (): number =>");
    expect(decl).toBeGreaterThan(-1);
    expect(decl).toBeLessThan(MC.indexOf("GARDEN 15 §2–§7 · DERIVATIVES PRESSURE"));
  });
  it("no silence line is hard-coded to the shared row", () => {
    expect(MC).not.toMatch(/fillText\([^)]*,\s*12,\s*H - 114\)/);
    expect(MC.match(/const rowY = takeSilenceRow\(\);/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });
});

describe("gap words never print inside the price legend's headroom", () => {
  it("a word that would rise into the legend hangs below its bridge, or waits", () => {
    expect(MC).toContain("for (const cy of [yTop - 10, yBot + 16, yTop - 24, yBot + 30]) {");
    expect(MC).toContain("if (cy - 12 < BELOW_PRICE_LEGEND || cy > H) continue;");
  });
});

describe("gap words never print on a candle", () => {
  it("a chip that would overlap the one candle cut-out waits", () => {
    const gap = MC.slice(MC.indexOf("const gapWordRects:"), MC.indexOf("canvas.dataset.dataGapsWorded"));
    expect(gap).toContain("if (gapWordRects.some(hits(q)) || profileCandleCut().rects.some(hits(q))) continue;");
    expect(gap).toContain("if (!Number.isFinite(my)) { wordsWithheld++; continue; }");
  });
});
