/**
 * THE ANATOMY CARDS NEVER SIT ON THE CANDLES — Garden Pass 12, Defect 4.
 *
 * On the Founder's live BTC 1m camera (2026-09-24, ORDER FLOW desk) the two
 * anatomy cards were placed by fixed coordinates and covered roughly the left
 * half of the candles they were describing. The order's ruling:
 *
 *     Do not solve it by covering the market with another panel.
 *     Solve it by hierarchy. The market remains dominant.
 *
 * So a card takes a spot only where `candleHits` counts zero, and otherwise
 * folds into the two measured lines — the numbers survive, the candles win.
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
  const start = CHART.indexOf("if (layerOnRef.current.anatomyCards === true) {");
  const end = CHART.indexOf('ds.anatomyCards = "OFF";', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return CHART.slice(start, end);
})();

describe("anatomy cards preserve the candles", () => {
  it("chooses the card spot by counting candles under it, and only accepts zero", () => {
    expect(block).toMatch(/\.find\(s => candleHits\(s\.x, s\.y, pairW, ch\) === 0\)/);
  });

  it("folds into the measured lines when no clear spot exists, rather than overprinting", () => {
    expect(block).toMatch(/if \(spot\) \{ cardsLeft = spot\.x; cardsTop = spot\.y; \} else compact = true;/);
  });

  it("never magnifies the cards onto a candle", () => {
    expect(block).toMatch(/if \(cardK > 1 && candleHits\([^)]*\) > 0\) cardK = 1;/);
  });

  it("steps around chips already painted this frame", () => {
    expect(block).toMatch(/!floatingChips\.some\(c => overlaps\(c, s\.x, s\.y, pairW, ch\)\)/);
  });

  it("the folded lines clear every body under their slot and the chips, or yield their backing", () => {
    // Added 2026-09-25 (keep-out completion): the compact form kept a 0.92
    // backing on whichever of head/foot covered fewer candles, even when both
    // covered some, and never joined the chip ledger.
    // Updated 2026-09-25 (FL-06 "NO ESSAY DRAWER AS PRIMARY TRUTH"): only the
    // SELECTED object's card is on the glass now, so the folded form is one
    // line per card shown (`lineBoxH`), not a fixed two-line 34px box. The
    // keep-out law is unchanged.
    expect(block).toContain("const lineBoxH = 6 + 14 * lines.length;");
    expect(block).toMatch(/const slotsC = \[\{ x: cardsLeft, y: footY, w: lw, h: lineBoxH \}, \{ x: cardsLeft, y: headY, w: lw, h: lineBoxH \}\]\s*\.sort\(\(a, b\) => candleHits\(a\.x, a\.y, a\.w, a\.h\) - candleHits\(b\.x, b\.y, b\.w, b\.h\)\);/);
    expect(block).toContain("const koC = [...keepOut(), ...rowBodiesAt(Math.min(headY, footY), Math.max(headY, footY) + lineBoxH)];");
    expect(block).toContain("const spotC = pickSlotClearOfKeepOut(slotsC, koC, takenC) ?? pickSlotClearOfKeepOut(slotsC, koC, () => false)!;");
    expect(block).toMatch(/recordKeepOut\(keepOutLedger, spotC\);\s*const ly = spotC\.rect\.y;/);
    expect(block).toMatch(/ctx\.fillStyle = `rgba\(11,10,8,\$\{keepOutBackingAlpha\(spotC, 0\.92\)\}\)`;\s*ctx\.fillRect\(cardsLeft, ly, lw, lineBoxH\);\s*floatingChips\.push\(\{ x: cardsLeft, y: ly, w: lw, h: lineBoxH \}\);/);
  });

  it("the placed pair joins the chip ledger, so later chips step around it", () => {
    expect(block).toContain("if (!compact) floatingChips.push({ x: cardsLeft, y: cardsTop, w: pairW * cardK, h: ch * cardK });");
  });

  it("publishes how many candles the final placement covers, so the glass can be measured", () => {
    expect(block).toContain("ds.anatomyCardsCandleHits = String(candleHits(");
    expect(CHART).toMatch(/ds\.anatomyCards = "OFF";\s*delete ds\.anatomyCardsCandleHits;/);
  });
});
