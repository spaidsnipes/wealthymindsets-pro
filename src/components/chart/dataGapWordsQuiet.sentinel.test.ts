/**
 * LABEL SOUP — every one-interval hole printed "NO BAR · 1 interval" (TSLA
 * 15m in the Founder's Chrome, 2026-09-27: dozens stacked down the left).
 * Bridges stay (the fidelity fact); words go to the holes that matter.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");

describe("data-gap words", () => {
  it("a short hole speaks only if it is one of the two newest on camera (no private depth rule)", () => {
    expect(MC).toContain(".sort((a, b) => b.fromTime - a.fromTime).slice(0, 2)) shortWordAllowed.add(g.fromTime);");
    expect(MC).toContain("if (g.emptyIntervals < 3 && !shortWordAllowed.has(g.fromTime)) { wordsWithheld++; continue; }");
  });
  it("words never stack on each other, and the withheld count is published", () => {
    expect(MC).toContain("if (gapWordRects.some(r => rect.x < r.x + r.w");
    expect(MC).toContain("canvas.dataset.dataGapsWordsWithheld = String(wordsWithheld);");
  });
  it("the bridge itself is still drawn for every hole", () => {
    const at = MC.indexOf("const shortWordAllowed = new Set<number>();");
    const loop = MC.slice(at, at + 3000);
    const bridge = loop.indexOf("ctx.beginPath(); ctx.moveTo(+x0 + 3, +y0); ctx.lineTo(+x1 - 3, +y1); ctx.stroke();");
    const quiet = loop.indexOf("!shortWordAllowed.has(g.fromTime)");
    expect(bridge).toBeGreaterThan(0);
    expect(quiet).toBeGreaterThan(bridge);
  });
});
