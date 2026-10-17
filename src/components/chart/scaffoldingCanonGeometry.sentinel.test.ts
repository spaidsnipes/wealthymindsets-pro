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
const pro = code.slice(proAt, code.indexOf("const avoidS", proAt));

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
    expect(pro).toMatch(/placeClearOfKeepOut\(slots\.preferred, \[\.\.\.keepOut\(\), \.\.\.rowBodiesAt\(yLo, yHi\)\], \{\s*minX, blockers: \[\.\.\.floatingChips, \.\.\.sleeveBoxes\(sleeve\), \.\.\.waitSlots, \.\.\.\(ruleStrip \? \[ruleStrip\] : \[\]\)\], strict: true, alternates: slots\.alternates,/);
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

// Added 2026-09-26 — coordinator side-by-side at 04:57 CDT (TSLA 15m, 80 bars,
// scaff:PRO) found two gaps against UI-12 PRO and one collision:
//   1. the plate's dashed resistance rule the mass flattens into was missing
//      (only the generic full-width swing lines were there);
//   2. the plaque read "1.00× EVEN · CAUTION" in one line instead of the
//      plate's title / big number / grade marks / grade line;
//   3. at 80 bars the plaque sat where H-101's WAIT tag lands.
describe("ADVANCED / PRO — the plate's resistance rule and plaque hierarchy", () => {
  it("draws ONE dashed rule on the level the read is pushing into, across the window, named by its kind", () => {
    expect(pro).toMatch(/if \(sc\.pushingInto\) \{\s*const lvlR = sc\.pushingInto === "SWING ABOVE" \? sc\.swingAbove : sc\.swingBelow;\s*const yR = lvlR == null \? null : yOf\(lvlR\);/);
    expect(pro).toMatch(/const x0R = first\.x - hb, x1R = ax \+ 4;/);
    expect(pro).toMatch(/ctx\.moveTo\(x0R, yyR\); ctx\.lineTo\(x1R, yyR\);/);
    expect(pro).toMatch(/const wordR = `\$\{sc\.pushingInto\} · \$\{gPx\(lvlR\)\}`;/);
    expect(code).not.toMatch(/HTF/);
    // Inked by the cell that meets it — maroon when the push stopped paying.
    expect(pro).toMatch(/const meetConv = sleeve\.segments\.at\(-1\)\?\.conversion \?\? null;/);
    expect(pro).toMatch(/const ruleInk = RULE_INK\[meetConv \?\? "NONE"\];/);
    expect(pro).toMatch(/"NOT CONVERTING": "rgba\(200,96,76,/);
    // Its generic full-width line steps back so there is one rule, not two.
    expect(code).toMatch(/ctx\.strokeStyle = depth === "PRO" && tag === sc\.pushingInto \? "rgba\(237,230,211,0\.22\)" : "rgba\(237,230,211,0\.55\)";/);
    // Its name is placed by the keep-out owner and registered.
    expect(pro).toMatch(/const labR = placeClearOfKeepOut\(\{ x: x0R, y: lyR, w: twR, h: 11 \}, \[\.\.\.keepOut\(\), \.\.\.rowBodiesAt\(lyR, lyR \+ 11\)\], \{\s*minX, blockers: floatingChips, strict: true,/);
    expect(pro).toMatch(/floatingChips\.push\(labR\.rect\);/);
    expect(pro).toMatch(/ds\.scaffoldingResistance = /);
  });

  it("the plaque reads title → big ratio → grade marks → grade line, with no invented percent", () => {
    const words = pro.slice(pro.indexOf("const { x: qx, y: qy, w: qw, h: qh } = plaque;"), pro.indexOf("floatingChips.push(plaque);"));
    const order = [
      'ctx.fillText("RESULT PER EFFORT · RECENT HALF", qc, qy + 27);',
      "ctx.fillText(ratio, qc, qy + 54);",
      "ctx.fillText(marks, qc, qy + 76);",
      "qc, qy + 94);",
    ].map(k => words.indexOf(k));
    for (const i of order) expect(i).toBeGreaterThan(-1);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(words).toMatch(/ctx\.font = font\(800, 30\);/); // S-12H scale, 2026-10-16
    expect(words).toContain("`${sc.resultPerEffort.toFixed(2)}×`");
    expect(words).not.toMatch(/%|\* 100|EFFICIENCY RATIO/);
    // Marks come from the owner grade only.
    expect(words).toContain("const marks = gradeMarks(sc.conversion);");
    expect(words).not.toMatch(/★/);
  });

  it("the plaque leaves H-101's WAIT slots free and is registered before H-101 places its tag", () => {
    expect(pro).toMatch(/const tagW = debtTagRef\.current;/);
    expect(pro).toMatch(/waitSlots\.push\(\{ x: xW - wW \/ 2 - 4, y: yLW \+ 22, w: wW \+ 8, h: 28 \}, \{ x: xW - wW \/ 2 - 4, y: yHW - 50, w: wW \+ 8, h: 28 \}\);/);
    expect(pro).toMatch(/minX, blockers: \[\.\.\.floatingChips, \.\.\.waitSlots\], strict: true,/);
    const pushAt = SRC.indexOf("floatingChips.push(plaque);");
    const h101 = SRC.indexOf("/* ══ H-101 · THE DEBT TAG LIVES ON THE EVENT");
    expect(pushAt).toBeGreaterThan(-1);
    expect(h101).toBeGreaterThan(pushAt);
    const tag = SRC.slice(h101, SRC.indexOf("canvas.dataset.debtTag = tagState;", h101));
    // The tag still steps around every chip registered before it (the plaque
    // included) — now also around the MarketObject pins (2026-09-27).
    // Garden 19 §15 (2026-10-07, Sheriff A1): the newest candles' column (bodies AND wicks,
    // `newestColumnRects()`) joins the keep-out — price sovereignty outranks the old pin.
    expect(tag).toMatch(/placeClearOfKeepOut\(below, \[\.\.\.keepOut\(\), \.\.\.newestColumnRects\(\), \.\.\.rowBodiesAt\([\s\S]{0,400}?blockers: \[\.\.\.floatingChips, \.\.\.marketObjectPinRectsRef\.current\],\s*strict: true,/);
  });
});

// Restated 2026-10-16 (Founder: "the scaffolding shouldn't be just cards"): FOUNDATION / INTERMEDIATE are drawn ON the
// candles from canon plate S-12G (src/lib/chart/scaffoldOnGlass.ts). The card form is retired from the glass.
describe("FOUNDATION / INTERMEDIATE — on the glass (plate S-12G), no card", () => {
  const GLASS = readFileSync(path.join(process.cwd(), "src/lib/chart/scaffoldOnGlass.ts"), "utf8");
  it("the room hands the painter every candle in view and every word already on the glass", () => {
    expect(SRC).toContain("const avoidS: { x: number; y: number; w: number; h: number }[] = [...keepOut(), ...floatingChips];");
    expect(SRC).toContain("avoidS.push({ x: xb - hG, y: Math.min(yh, yl) - 3, w: hG * 2, h: Math.abs(yl - yh) + 6 });");
    expect(SRC).toContain("const outG = paintScaffoldOnGlass(ctx, {");
  });
  it("every tag it places is registered, and a tag with no clear place is listed — never laid on price", () => {
    expect(SRC).toContain("for (const r of outG.rects) floatingChips.push(r);");
    expect(SRC).toContain('for (const l of outG.listed) displacedNotes.push({ layer: "STRUCTURE", text: l.text, x: l.x, y: l.y });');
    expect(GLASS).toContain("const r = cands.find(c => inPlot(c) && !hits(c, taken)) ?? rail.find(c => inPlot(c) && !hits(c, taken));");
  });
  it("the six steps are drawn where their evidence is", () => {
    for (const k of ["1 · STRUCTURE", "2 · EFFORT", "3 · RESULT", "4 · LOCATION", "5 · ORDER FLOW", "6 · CAUTION"]) expect(GLASS).toContain(k);
    expect(GLASS).toContain('`STRUCTURE — ${s1.verdict}`');
    expect(GLASS).toContain("arrow(xb0, yb0 + off, xb1, yb1 + off, I.BLUE, 3.2);");
  });
  it("publishes what it did: form and steps on the glass", () => {
    expect(SRC).toContain("ds.scaffoldingForm = `GLASS:${depth}`;");
    expect(SRC).toContain("ds.scaffoldingGlass = outG.receipt;");
    expect(SRC).not.toContain("CARD:${pick.form}");
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
    expect(code).toContain("const t = `${tag} · ${gPx(lvl)}`;");
  });

  it("the scaffolding ink asks the attention governor", () => {
    expect(code).toMatch(/ctx\.globalAlpha = att\.alpha\("scaffolding"\);/);
  });
});
