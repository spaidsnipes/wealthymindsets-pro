/**
 * AT REST THE ANATOMY IS GEOMETRY; ITS NUMBERS COME WITH THE SELECTION.
 *
 * Founder, 2026-09-25 13:58 CDT, on the live TSLA 15m glass: "I STILL HAVE A
 * LOT OF JUST CARDS, NOT THE ACTUAL DESIGNS WITHIN THE CANON THAT THE CHART
 * SHOULD SHOW." Measured on that screen: two red-bordered
 * "EXHAUSTION · EFFORT 2ND÷1ST 68% · EXT 3.9× · FT 0/3 · ET 127%" chips over
 * the candles, and the anatomy cards' two folded essay lines over the volume.
 *
 * Canon FL-06 is stamped "NO ESSAY DRAWER AS PRIMARY TRUTH" and draws ④
 * EFFORT vs RESULT as an arrow pair at the push. So:
 *
 *   · every exhaustion mark draws the EFFORT arrow (push direction, shaft =
 *     the push's opening effort) and, where follow-through bars are on
 *     screen, the RESULT arrow (back, shaft = the measured shortfall from the
 *     stop line to the furthest follow-through reach);
 *   · the four-metric line is painted ONLY for the mark the one selection
 *     owner holds; an unselected mark keeps only its hit body;
 *   · the anatomy cards paint ONLY the selected, drawn object's card (the
 *     same numbers Inspect reads); nothing selected → AT_REST, nothing drawn.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const CHART = strip(readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8"));

const slice = (from: string, to: string) => {
  const start = CHART.indexOf(from);
  const end = CHART.indexOf(to, start);
  expect(start, from).toBeGreaterThan(-1);
  expect(end, to).toBeGreaterThan(start);
  return CHART.slice(start, end);
};

const exhaustion = slice("const ex = selectExhaustion(anatomy);", "if (layerOnRef.current.anatomyCards === true)");
const cards = slice("if (layerOnRef.current.anatomyCards === true) {", 'ds.anatomyCards = "OFF";');

describe("exhaustion at rest: the arrow pair, no words", () => {
  it("draws the EFFORT arrow in the push's direction beyond the fuel, sized by the owner's opening effort", () => {
    // The pair is decided by the pure owner (src/lib/chart/exhaustionEffortResult.ts, unit-tested).
    expect(exhaustion).toContain("const pair = exhaustionEffortResult(m);");
    expect(exhaustion).toContain("const eFrac = pair.effortFrac;");
    expect(exhaustion).toContain("const eBase = +yr + s * (fuelOut + 4);");
    expect(exhaustion).toContain("const eTip = eBase + s * (10 + 16 * eFrac);");
    expect(exhaustion).toMatch(/exArrow\(x, eBase, eTip, /);
  });

  it("draws the RESULT arrow back from the stop line to the furthest follow-through reach, on that bar", () => {
    expect(exhaustion).toContain("const best = pair.resultBar;");
    expect(exhaustion).toContain("const rxR = best ? ts.timeToCoordinate(best.time as never) : null;");
    expect(exhaustion).toContain("const ryR = best ? srs.priceToCoordinate(best.reach) : null;");
    expect(exhaustion).toContain("resultPx = Math.abs(+ryR - +yr);");
    expect(exhaustion).toMatch(/const rTip = \+yr - s \* Math\.max\(6, resultPx\);\s*exArrow\(\+rxR, \+yr, rTip, /);
    // Never a candle close: effort and result are the owner's numbers.
    expect(exhaustion).not.toMatch(/\.close\b/);
  });

  it("an unselected mark leaves before any words are built, keeping only its hit body", () => {
    const gate = exhaustion.indexOf("if (!markSelected) {");
    const words = exhaustion.indexOf("const chipTxt = `EXHAUSTION · EFFORT 2ND÷1ST");
    expect(gate).toBeGreaterThan(-1);
    expect(words).toBeGreaterThan(gate);
    const arm = exhaustion.slice(gate, exhaustion.indexOf("continue;", gate));
    expect(arm).toContain("anatomyHitsRef.current.push({ target: markTarget(m), rects: [padHitRect(");
    expect(arm).toContain("ctx.restore();");
    expect(arm).not.toMatch(/fillText|fillRect|floatingChips\.push|recordKeepOut/);
    // Only one place paints the metric words, and it is past the gate.
    const paints = [...exhaustion.matchAll(/ctx\.fillText\(chipTxt,/g)].map(m => m.index!);
    expect(paints.length).toBe(1);
    expect(paints[0]!).toBeGreaterThan(gate);
  });

  it("publishes what the pair measured and whether words are on the glass, withdrawn with the marks", () => {
    expect(exhaustion).toContain("effortResultDrawn.push(`${m.direction}:EFFORT_${Math.round(eFrac * 100)}%+RESULT_${resultPx == null ? \"NONE\" : `${Math.round(resultPx)}PX`}`);");
    expect(exhaustion).toMatch(/ds\.exhaustionWords = exhaustionChipPainted \? "SELECTED" : "AT_REST";/);
    expect(exhaustion).toMatch(/delete ds\.exhaustionEffortResult;\s*delete ds\.exhaustionWords;/);
    expect(CHART).toMatch(/const ANATOMY_BLOCK_RECEIPTS = \[[\s\S]*"exhaustionEffortResult", "exhaustionWords"/);
  });
});

describe("absorption shelf words: FL-06 ①'s name at rest, the numbers on selection", () => {
  const loop = slice("for (const zone of anatomy.zones) {", "ds.absorptionChips =");

  it("the desktop shelf at rest says its name and, only where the owner named one, its side", () => {
    expect(loop).toMatch(/const shelfName = zone\.holdingEdge == null\s*\? "ABSORPTION SHELF"\s*: `ABSORPTION SHELF · \$\{zone\.holdingEdge === "LOW" \? "SELL" : "BUY"\} SIDE\$\{zone\.holdingBasis === "INFERRED" \? " · INFERRED" : ""\}`;/);
    expect(loop).toContain("const shelfWords = desktopShelfInstrument && !shelfSelected ? shelfName : chip;");
    // The desktop annotation paints shelfWords; the numeric `chip` survives
    // only in the narrow backed chip.
    expect(loop).toContain("ctx.fillText(shelfWords, chipX, chipY + chipH / 2 + 0.5);");
    expect([...loop.matchAll(/ctx\.fillText\(chip,/g)].length).toBe(1);
    expect(loop).toContain("const cw2 = ctx.measureText(shelfWords).width;");
  });

  it("publishes which words are on the glass, withdrawn with the block", () => {
    expect(CHART).toMatch(/if \(shelfNumbersShown\) ds\.absorptionWords = [^;]+;\s*else if \(shelfNamesShown > 0\) ds\.absorptionWords = `\$\{shelfNamesShown\}_NAMES`;\s*else delete ds\.absorptionWords;/);
    expect(CHART).toMatch(/const ANATOMY_BLOCK_RECEIPTS = \[[\s\S]*"absorptionWords"/);
  });
});

describe("anatomy cards: only the selected object's card", () => {
  it("reads the selected, drawn reading's card — never the newest-reading pair", () => {
    expect(cards).toContain("const selCard = anatomySelReading && anatomyReadingDrawn(anatomySelReading) ? anatomySelReading.card : null;");
    expect(cards).toContain("const shown = [selCard];");
    expect(cards).not.toMatch(/selectAnatomyCards\(anatomy, selectExhaustion\(anatomy\)\)/);
    expect(cards).not.toMatch(/cards\.absorption|cards\.exhaustion/);
  });

  it("nothing selected paints nothing and says AT_REST", () => {
    const rest = cards.slice(cards.indexOf("if (!selCard) {"), cards.indexOf("} else {", cards.indexOf("if (!selCard) {")));
    expect(rest).toContain('ds.anatomyCards = "AT_REST";');
    expect(rest).toMatch(/delete ds\.anatomyCardsCandleHits;\s*delete ds\.anatomyCardsLayout;\s*delete ds\.anatomyCardsScale;/);
    expect(rest).not.toMatch(/fillText|fillRect|floatingChips/);
  });

  it("the receipt names the selected object", () => {
    expect(cards).toContain("ds.anatomyCards = `SELECTED:${selCard.kind}:${selCard.empty ? \"NONE\" : selCard.outcome}`;");
  });
});
