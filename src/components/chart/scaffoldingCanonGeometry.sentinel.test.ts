/**
 * SCAFFOLDING IS DRAWN FROM THE CANON, ON THE MARKET — NOT AS CARDS OVER IT.
 *
 * Founder, 2026-09-25 13:58 CDT: "STOP BUILDING FROM MEMORY … LOOK AT THE
 * ACTUAL SCREEN. I STILL HAVE A LOT OF JUST CARDS, NOT THE ACTUAL DESIGNS
 * WITHIN THE CANON THAT THE CHART SHOULD SHOW."
 *
 * Measured on wealthymindsetspro.com/charts (TSLA 15m, 1905px, 14:00 CDT):
 * the ADVANCED / PRO depth painted a 300×266 CARD at x≈10–255 holding its own
 * EFFORT/RESULT mini line chart ("20 BARS"), over the left third of the real
 * candles; FOUNDATION painted its six-step card over the candles at the same
 * fixed spot. Plate UI-12's Pro view is geometry — dashed resistance, a
 * pressure mass rising along price into it, ↑/↓ pressure arrows, ONE plaque.
 *
 * This sentinel pins the new truth (it REPLACES the fixed-spot scaffolding
 * card of 2026-09-24; no earlier pin described it):
 *   · PRO paints no card and no second chart: its mass is planned from the
 *     chart's own transforms (timeToCoordinate / priceToCoordinate), filled
 *     inside a candle cut-out, and its one plaque is placed by the keep-out
 *     owner, strict, with a leader to a real bar.
 *   · FOUNDATION / INTERMEDIATE dock through `dockClearOfCandles` against
 *     every candle in view and every chip on the glass.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SRC = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

function scaffoldingBlock(): string {
  const at = SRC.indexOf('/* ── SCAFFOLDING — "SAME SKILL. DEEPER MASTERY. LESS HAND-HOLDING." ──');
  expect(at).toBeGreaterThan(-1);
  const end = SRC.indexOf("// REFUSAL IS A FIRST-CLASS RENDER.", at);
  expect(end).toBeGreaterThan(at);
  return SRC.slice(at, end);
}
const block = scaffoldingBlock();
const code = strip(block);
const proAt = code.indexOf('if (depth === "PRO") {');
const cardAt = code.indexOf("} else {", code.indexOf('ds.scaffoldingPlaque = `${spot.mode}', proAt) + 1);
const pro = code.slice(proAt, code.indexOf("const candleRects: GlassRect[] = [];", proAt));
const cards = code.slice(code.indexOf("const candleRects: GlassRect[] = [];", proAt));

describe("ADVANCED / PRO — geometry on the real candles, no card", () => {
  it("the branch exists and is the geometry, not the old card", () => {
    expect(proAt).toBeGreaterThan(-1);
    expect(cardAt).toBeGreaterThan(proAt);
    expect(pro).toContain('ds.scaffoldingForm = "GEOMETRY";');
  });

  it("paints no mini-chart: no effort/result curves, no grid, no second axis, no bar-count caption", () => {
    expect(pro).not.toMatch(/effortCurve|resultCurve/);
    expect(pro).not.toMatch(/for \(let k = 0; k <= 4; k\+\+\)/); // the toy chart's grid
    expect(pro).not.toMatch(/\bgx\b|\bgy\b|\bgh\b|\bgw\b/);
    expect(pro).not.toMatch(/`\$\{n\} BARS`/);
    // The discretion line belongs in Inspect, not on the glass.
    expect(code).not.toContain("PURE SIGNAL");
  });

  it("the only filled box is the ONE plaque, sized by PRO_PLAQUE and placed by the keep-out owner", () => {
    const fills = [...pro.matchAll(/ctx\.fillRect\(([^)]*)\)/g)].map(m => m[1]);
    expect(fills.length).toBeGreaterThan(0);
    for (const f of fills) expect(f).toBe("plaque.x, plaque.y, plaque.w, plaque.h");
    expect(pro).toMatch(/proPlaqueSlots\(sleeve, PRO_PLAQUE,/);
    expect(pro).toMatch(/placeClearOfKeepOut\(slots\.preferred, \[\.\.\.keepOut\(\), \.\.\.rowBodiesAt\(yLo, yHi\)\], \{\s*minX, blockers: \[\.\.\.floatingChips, \.\.\.sleeveBoxes\(sleeve\)\], strict: true, alternates: slots\.alternates,/);
    expect(pro).toMatch(/recordKeepOut\(keepOutLedger, spot\);/);
    expect(pro).toMatch(/panel\(keepOutBackingAlpha\(spot, 0\.94\)\)/);
    expect(pro).toMatch(/floatingChips\.push\(plaque\);/);
  });

  it("the mass is planned on the chart's own transforms and filled inside a candle cut-out", () => {
    expect(code).toMatch(/const tsS = chart\.timeScale\(\);/);
    expect(code).toMatch(/const xOf = \(t: number\) => \{ const v = tsS\.timeToCoordinate\(t as never\);/);
    expect(code).toMatch(/const yOf = \(p: number\) => \{ const v = srs\.priceToCoordinate\(p\);/);
    expect(pro).toMatch(/planProSleeve\(sc, \{ timeToX: xOf, priceToY: yOf \}, bsp\)/);
    const clipAt = pro.indexOf('ctx.clip(cut, "evenodd");');
    expect(clipAt).toBeGreaterThan(-1);
    expect(pro).toMatch(/cut\.rect\(xb - bsp \* 0\.42, top, bsp \* 0\.84, bot - top\);/);
    // Every fill of the mass happens after the cut-out and before it is released.
    const releaseAt = pro.indexOf("ctx.restore();", pro.indexOf("for (const sg of sleeve.segments.slice(1))"));
    const massFill = pro.indexOf("traceMass(); ctx.fill();");
    expect(massFill).toBeGreaterThan(clipAt);
    expect(releaseAt).toBeGreaterThan(massFill);
  });

  it("the arrows sit at the window's right edge and point the read's measured trends", () => {
    expect(pro).toMatch(/const ax = Math\.min\(plotRight - 6, last\.x \+ hb \+ 9\);/);
    expect(pro).toMatch(/\{ yA: last\.bottom \+ 4, yB: last\.bottom \+ 22, trend: effDyn\.trend, word: effDyn\.label \}/);
    expect(pro).toMatch(/\{ yA: last\.top - 22, yB: last\.top - 4, trend: resDyn\.trend, word: resDyn\.label \}/);
  });

  it("the leader runs from the plaque to ONE real bar of the window", () => {
    expect(pro).toMatch(/const bar = Math\.abs\(pc - first\.x\) < Math\.abs\(pc - last\.x\) \? first : last;/);
    expect(pro).toMatch(/ctx\.lineTo\(tipX, tipY\)/);
  });

  it("the old anatomy-cards reservation no longer holds room for a Pro card", () => {
    expect(SRC).toMatch(/if \(sDepth === "FOUNDATION" \|\| sDepth === "INTERMEDIATE"\) \{\s*const sx = cardsLeft, sy = 176 - 9;\s*const \{ w: sw, h: sh \} = SCAFFOLD_CARD_BOX\[sDepth\];/);
  });
});

describe("FOUNDATION / INTERMEDIATE — one card, docked clear of every candle", () => {
  it("the dock reads every candle in view (high→low, wicks included) and every chip on the glass", () => {
    expect(cards).toMatch(/const xb = xOf\(b\.time\), yh = yOf\(b\.high\), yl = yOf\(b\.low\);/);
    expect(cards).toMatch(/candleRects\.push\(\{ x: xb - half, y: Math\.min\(yh, yl\) - 3, w: half \* 2, h: Math\.abs\(yl - yh\) \+ 6 \}\);/);
    expect(cards).toMatch(/dockClearOfCandles\(\{\s*size: \{ w: f\.w \* f\.k, h: f\.h \* f\.k \},\s*bounds, candles: candleRects, blockers: floatingChips,/);
  });

  it("the card paints only at the docked rect, and yields its backing when the camera has no room", () => {
    expect(cards).toMatch(/const \{ x: cx0, y: cy0 \} = pick\.dock\.rect;/);
    expect(cards).toMatch(/ctx\.translate\(cx0, cy0\);/);
    expect(cards).toMatch(/ctx\.fillStyle = panel\(yielded \? 0\.3 : 0\.97\);\s*ctx\.fillRect\(0, 0, w, h\);/);
    // Exactly one filled box: the card itself (the old separate crumb strip is gone).
    expect([...cards.matchAll(/ctx\.fillRect\(/g)]).toHaveLength(1);
    expect(code).not.toMatch(/ctx\.fillRect\(x0, top, w, h\)|ctx\.fillRect\(x0, y0 - 9, 290, 18\)/);
    expect(cards).toMatch(/floatingChips\.push\(\{ x: cx0, y: cy0, w: w \* k, h: h \* k \}\);/);
  });

  it("the card's room is under the header, inside the plot, left of now, right of an active lens column", () => {
    expect(code).toMatch(/const minX = Math\.max\(12, keepOutMinX\(\) \+ \(lensColumnActive \? 2 : 8\)\);/);
    expect(cards).toMatch(/const bounds = \{ x0: minX, y0: HEADER_FLOOR_Y \+ 4, x1: Math\.min\(plotRight - 8, newestX \+ bsp\), y1: floorY \};/);
  });

  it("publishes what it did: form, dock, candles covered, scale", () => {
    for (const k of ["scaffoldingForm", "scaffoldingDock", "scaffoldingCardCandleHits", "scaffoldingScale"]) {
      expect(cards, k).toMatch(new RegExp(`ds\\.${k} = `));
    }
    expect(cards).toMatch(/ds\.scaffoldingCardCandleHits = String\(countRectHits\(pick\.dock\.rect, candleRects\)\);/);
  });
});

describe("every depth", () => {
  it("withdraws its glass receipts before painting, and after a frame with no measured read", () => {
    expect(code).toMatch(/for \(const k of SCAFFOLDING_GLASS_RECEIPTS\) delete ds\[k\];\s*const depth = scaffoldingDepthRef\.current;/);
    const trailing = SRC.slice(SRC.indexOf("canvas.dataset.scaffolding = depth === \"OFF\""));
    expect(trailing.slice(0, 600)).toContain("for (const k of SCAFFOLDING_GLASS_RECEIPTS) delete canvas.dataset[k];");
  });

  it("the swings stay ON PRICE, dashed from the bar that made them, with a □ on that bar", () => {
    expect(code).toMatch(/ctx\.moveTo\(xp != null && xp > 0 \? xp : 0, yy\); ctx\.lineTo\(W - 76, yy\);/);
    expect(code).toMatch(/ctx\.strokeRect\(Math\.round\(xp\) - 4\.5, kind === "LOW" \? yy \+ 4 : yy - 13, 9, 9\);/);
    expect(code).toContain("const t = `${tag} · ${lvl.toFixed(pxDp)}`;");
  });

  it("the scaffolding ink asks the attention governor", () => {
    expect(code).toMatch(/ctx\.globalAlpha = att\.alpha\("scaffolding"\);/);
  });
});
