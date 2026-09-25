/**
 * THE FOOTPRINT MODES DRAW THE CANON, NOT CARDS — 2026-09-25.
 *
 * Serving (BTC-USD 1m, NEAR, live Coinbase tape) showed every per-candle
 * order-flow mode as a stack of boxes: a solid delta chip over each column
 * that read "0" beside a "−0.05" under the same bar, "5.1×" ratio chips,
 * "AGG BUYS 0.67" pills and 2×2 grids, Delta Bubbles sitting on a full cell
 * grid, and Big Trades as rings with separate rectangular tickets that
 * overlapped each other, the candles and the bubbles. The Founder: "STOP
 * BUILDING FROM MEMORY … I STILL HAVE ALOT OF JUST CARDS".
 *
 * The geometry now lives in src/lib/chart/footprintCanon.ts (tested there);
 * this breadcrumb pins the canvas to it:
 *   · Big Trades (F07A · G04): the words INSIDE the disc, at most ONE callout
 *     placed through the keep-out owner, a response path only from real
 *     closed bars;
 *   · every layer's alpha comes from the attention governor;
 *   · no mode paints a box chip; every column and bubble is an obstacle;
 *   · one bar has one delta, from one owner.
 *
 * A breadcrumb, not a renderer: it reads source. Every slice asserts its
 * landmarks, so a rename fails loudly instead of guarding nothing.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { FOOTPRINT_MODE_RECEIPTS } from "@/lib/chart/footprintCanon";

const RAW = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "").replace(/[ \t]\/\/ .*$/gm, "");
const CODE = strip(RAW);

const slice = (from: string, to: string): string => {
  const a = CODE.indexOf(from);
  expect(a, `landmark not found: ${from}`).toBeGreaterThan(-1);
  const b = CODE.indexOf(to, a + from.length);
  expect(b, `landmark not found after ${from}: ${to}`).toBeGreaterThan(a);
  return CODE.slice(a, b);
};

/** Every footprint mode, from the frame's withdrawal to the O-06 receipt. */
const region = () => slice("for (const k of FOOTPRINT_MODE_RECEIPTS) delete canvas.dataset[k];", "const fpBars = fpBarsPainted + fpTrailBars.size;");
const mode = (open: string, close: string) => slice(open, close);
const bidAsk = () => mode('if (effectiveFP === "bid-ask") {', 'if (effectiveFP === "delta") {');
const delta = () => mode('if (effectiveFP === "delta") {', 'if (effectiveFP === "volume-profile") {');
const vp = () => mode('if (effectiveFP === "volume-profile") {', 'if (effectiveFP === "imbalance") {');
const imbalance = () => mode('if (effectiveFP === "imbalance") {', 'if (effectiveFP === "aggressive-passive") {');
const aggPassive = () => mode('if (effectiveFP === "aggressive-passive") {', 'if (effectiveFP === "big-trades" || bigTradesOverlay) {');
const bigTrades = () => mode('if (effectiveFP === "big-trades" || bigTradesOverlay) {', 'canvas.dataset.bigTradeBubbleCount = "0";');

describe("every footprint pixel's loudness comes from the attention governor", () => {
  it("no footprint layer sets globalAlpha to anything but the governor's answer", () => {
    const sets = [...region().matchAll(/ctx\.globalAlpha\s*=\s*([^;]+);/g)].map(m => m[1].trim());
    // Positive control: cells, trail, bubbles, words and the callout all ask.
    expect(sets.length).toBeGreaterThanOrEqual(10);
    for (const rhs of sets) expect(rhs, rhs).toMatch(/^att\.(alpha|textAlpha)\("(footprint|bubbles|bigTrades)"/);
  });

  it("each cell mode asks for the footprint layer before it paints", () => {
    for (const [name, b] of [["bid-ask", bidAsk()], ["volume-profile", vp()], ["imbalance", imbalance()]] as const) {
      const ask = b.indexOf('ctx.globalAlpha = att.alpha("footprint");');
      const firstFill = b.indexOf("ctx.fillRect(");
      expect(ask, name).toBeGreaterThan(-1);
      expect(firstFill, name).toBeGreaterThan(ask);
    }
  });
});

describe("no mode paints a card", () => {
  it("no rounded chip, pill, 2×2 grid or private ratio word survives in any mode", () => {
    const r = region();
    // Any spelling of a rounded chip (`roundRect(`, `roundRect?.(`, a helper
    // named for it) — measured: `\(`-only let `ctx.roundRect?.(` through.
    expect(r).not.toMatch(/roundRect|\brr\(/);
    expect(r).not.toMatch(/AGG BUYS|AGG SELLS|SELLS INTO LOW|BUYS INTO HIGH/);
    expect(r).not.toMatch(/toFixed\(1\)\}×/);
    expect(r).not.toMatch(/showWinner|getBarRoles\(/);
    expect(r).not.toMatch(/fmtV\(netDelta\)/);
  });

  it("Delta Bubbles and Agg/Passive are the trail alone: no rows, no cells", () => {
    for (const [name, b] of [["delta", delta()], ["aggressive-passive", aggPassive()]] as const) {
      expect(b, name).not.toMatch(/fpLevels\(|getBarFootprint\(|fillRect\(/);
    }
  });
});

describe("M46 · Bid × Ask is a grid of cells that fit their words", () => {
  it("an untraded row is blank; the words are the fitter's, never two numbers side by side", () => {
    const b = bidAsk();
    expect(b).toContain("if (!(lv.total > 0)) return;");
    expect(b).toContain("const t = fitBidAskCellText(lv.bid, lv.ask, fmtV, measureCell, colW - 4, cellFs(rH));");
    expect(b).not.toMatch(/"left", fs\)|"right", fs\)/);
  });

  it("the column is an obstacle for every later word (the NEAR anatomy words yield to it)", () => {
    expect(bidAsk()).toContain("forceChips.push({ x, y: yH, w: colW, h: fullH });");
    expect(vp()).toContain("forceChips.push({ x, y: yH, w: right - x, h: fullH });");
    expect(imbalance()).toContain("forceChips.push({ x: x - 4, y: yH, w: colW + 8, h: fullH });");
  });
});

describe("one bar, one delta, one owner", () => {
  it("the column's delta and the NEAR volume-band row read the same function and say it the same way", () => {
    expect(CODE.match(/barTapeDelta\(getBarSubProfile\(c\)\)/g) ?? []).toHaveLength(2);
    expect(bidAsk()).toContain("const text = signedFlowText(bd.delta, fmtV);");
    expect(slice("const depthD = semanticDensity.depth;", "canvas.dataset.nearBarDelta =")).toContain("const text = signedFlowText(dlt, fmtV);");
  });

  it("the column's delta is halo text over the column, only where the badge gate allows, never on a chip", () => {
    const b = bidAsk();
    const gate = b.indexOf("if (showBadges) {");
    const clear = b.indexOf("if (rect.y >= HEADER_FLOOR_Y && !chipHits(rect)) {");
    const push = b.indexOf("forceChips.push(rect);");
    expect(gate).toBeGreaterThan(-1);
    expect(clear).toBeGreaterThan(gate);
    expect(push).toBeGreaterThan(clear);
  });
});

describe("Volume Profile and Imbalance draw with their owners", () => {
  it("the histogram row is the VP owner's length and split; the POC is the family's POC ink; numbers wait for NEAR", () => {
    const b = vp();
    expect(b).toContain("const hr = footprintHistogramRow(lv, maxTot, colW);");
    expect(b).toContain('ctx.fillStyle = pk.rgba("POC", 0.9);');
    expect(b).toContain("if (vpNumbers && rH >= 11) {");
    expect(b).toContain("if (tx + tw <= x + bsp - 2) {");
  });

  it("imbalance leans by the stacked owner's rule; words only for runs, placed after every column is on the glass", () => {
    const b = imbalance();
    expect(b).toContain("const reads = readImbalanceRows(levels);");
    expect(b).toContain("for (const run of imbalanceRuns(reads)) {");
    expect(b).toContain("words.push({ word: imbalanceRunWord(run),");
    const columnsDone = b.indexOf("forceChips.push({ x: x - 4, y: yH, w: colW + 8, h: fullH });");
    const wordLoop = b.indexOf("for (const w of words) {");
    expect(wordLoop).toBeGreaterThan(columnsDone);
    expect(b).toMatch(/!chipHits\(s\)\);/);
  });
});

describe("the Nectar trail rings sit on real prices and are obstacles", () => {
  it("Agg/Passive: one ring per zone from the zone owner, sized by the bubble owner against the frame's peak", () => {
    const b = aggPassive();
    expect(b).toContain("const zones = getDeltaBubbleLevels(c);");
    expect(b).toContain("const ring = aggPassiveRing(z.priceLevel, c.low, c.high, z.bid, z.ask);");
    expect(b).toContain("const apPeak = bubbleFramePeak(ringsAP.map(r => r.volume));");
    expect(b).toContain("const rad = deltaBubbleRadius(r.volume, apPeak);");
    expect(b).toContain("const lbl = r.price.toFixed(pxDp);");
    expect(b).toContain("forceChips.push({ x: r.x - rad - 2, y: r.y - rad - 2, w: 2 * rad + 4, h: 2 * rad + 4 });");
  });

  it("Delta Bubbles register every disc that is on the plot", () => {
    expect(delta()).toContain("forceChips.push({ x: b.x - Rx - 4, y: b.y - Ry - 4, w: 2 * Rx + 8, h: 2 * Ry + 8 });");
  });
});

describe("F07A · G04 · F06 — Big Trades on price", () => {
  it("the words are fitted INSIDE the disc: SIZE / TIME / ↑PRICE, the price at the market's precision", () => {
    const b = bigTrades();
    expect(b).toContain("const inscription = fitBubbleInscription(b.r, bigTradeInscriptionLines(b.r,");
    expect(b).toContain("`${buy ? \"↑\" : \"↓\"} ${b.anchorPrice.toFixed(pxDp)}`");
    expect(b).toContain("ctx.fillText(l.text, b.x, b.y + l.dy);");
  });

  it("the response path is drawn only from real closed bars, and not at all before they exist", () => {
    const b = bigTrades();
    expect(b).toMatch(/const btForming = btNewest && selectChartCloseLabel\(Number\(btNewest\.time\), timeframe, Date\.now\(\)\)\.forming/);
    expect(b).toContain("const pts = memoBigTradeResponsePath(b.spawnKey, { timeSec: b.anchorTime, price: b.anchorPrice, side: b.side }, btBars, btForming);");
    const none = b.indexOf("if (!pts) return;");
    const stroke = b.indexOf("ctx.setLineDash([4, 4]);");
    expect(none).toBeGreaterThan(-1);
    expect(stroke).toBeGreaterThan(none);
    // Paths are painted BEFORE the discs, so a disc sits on its own path.
    expect(b.indexOf("responsePaths++;")).toBeLessThan(b.indexOf("for (const b of [...bubblesRef.current].sort("));
  });

  it("at most ONE callout: chosen once, after every disc is on the glass, never inside a loop", () => {
    const b = bigTrades();
    expect(b.match(/pickBigTradeCallout\(/g) ?? []).toHaveLength(1);
    expect(b.match(/bigTradeCalloutLines\(/g) ?? []).toHaveLength(1);
    const discsDone = b.indexOf("canvas.dataset.bigTradesDrawn = String(bigDrawn);");
    const pick = b.indexOf("pickBigTradeCallout(");
    expect(pick).toBeGreaterThan(discsDone);
    // The callout's block is a plain block, not a loop body.
    const before = b.slice(discsDone, pick);
    expect(before).not.toMatch(/\bfor\s*\(|\.forEach\(/);
  });

  it("every disc and quiet ring is an obstacle for the chrome that paints after it", () => {
    const b = bigTrades();
    expect(b).toContain("forceChips.push({ x: b.x - b.r - 4, y: b.y - b.r - 4, w: 2 * b.r + 8, h: 2 * b.r + 8 });");
    expect(b).toContain("forceChips.push({ x: b.x - rq - 2, y: b.y - rq - 2, w: 2 * rq + 4, h: 2 * rq + 4 });");
  });
});

describe("per-mode receipts speak only for this frame", () => {
  it("every per-mode receipt is withdrawn before any mode paints, and some mode writes each one", () => {
    const withdraw = CODE.indexOf("for (const k of FOOTPRINT_MODE_RECEIPTS) delete canvas.dataset[k];");
    expect(withdraw).toBeGreaterThan(-1);
    expect(withdraw).toBeLessThan(CODE.indexOf('if (effectiveFP === "bid-ask") {'));
    for (const k of FOOTPRINT_MODE_RECEIPTS) {
      expect(CODE, k).toMatch(new RegExp(`(canvas\\.dataset|dsFp)\\.${k}\\s*=(?!=)`));
    }
  });
});
