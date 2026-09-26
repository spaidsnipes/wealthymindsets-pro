/**
 * THE FOUR ON-CHART LENSES DRAW THE CANON'S GEOMETRY, NOT CARDS.
 *
 * Founder, 2026-09-25: "STOP BUILDING FROM MEMORY … WORK SIDE BY SIDE WITH THE
 * VISUALS CANON … I STILL HAVE A LOT OF JUST CARDS, NOT THE ACTUAL DESIGNS
 * WITHIN THE CANON." Serving TSLA 15m desktop that afternoon:
 *
 *   H-401  two boxed LEANS UP / LEANS DOWN text cards over the candles at the
 *          top-left, the zone a separate band far right.
 *   H-801  no fan at all — two TYPICAL REACH names, one at the top edge on the
 *          bar clock, one floating for a price off the axis.
 *   H-704  the receipt said 12 pivots DRAWN; the glass showed a few faint
 *          marks (pivots off camera were counted), bias word in the header band.
 *   H-1001 nothing at all on glass with the layer on and no position drawn.
 *
 * Each plate's drawing, pinned (2026-09-25):
 *
 *   H-401 / F14  ONE PRICE ZONE — dashed box at the zone's prices from its
 *                birth to NOW; UP arrow left, crack, DOWN arrow right; the
 *                family names under the arrows and UNRESOLVED under the crack.
 *   H-801 / F03  the analogue FAN from the open through NOW and projected
 *                right; caption; MARKET SURPRISE flag; CAMERA STAYS ON NOW.
 *   M32 / H-704  chevrons + letters at the swings, the last high/low as level
 *                rules named at the axis, the bias word through the keep-out.
 *   F17A / H-1001 R ticks on the reward bracket; callouts placed by the
 *                keep-out owner with no card border; the silence named.
 *
 * Every pin is a predicate over the source, and each is proved able to fail:
 * the MUTATIONS table breaks one thing at a time in a copy of the source and
 * asserts the matching pin goes red. A pin that cannot fail is not a pin.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const RAW = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");

// From the start of the line holding `a` (so a header comment is cut whole
// and stripped) to the start of the line holding `b`.
const between = (src: string, a: string, b: string) => {
  const i = src.indexOf(a);
  if (i < 0) return "";
  const j = src.indexOf(b, i + a.length);
  return j < 0 ? "" : src.slice(src.lastIndexOf("\n", i) + 1, src.lastIndexOf("\n", j) + 1);
};

// Blocks are cut from the RAW source by their header comments, then stripped.
const blocks = (raw: string) => ({
  envelope: strip(between(raw, "H-801 · EXPECTED ENVELOPE — the analogue fan", "H-401 · CONTRADICTION NOT AVERAGED")),
  contradiction: strip(between(raw, "H-401 · CONTRADICTION NOT AVERAGED", "PROFILE STACK PLAN — one owner")),
  structure: strip(between(raw, "H-704 · MARKET STRUCTURE — swing highs and lows on price", "F13 · SEMANTIC ZOOM TAG")),
  risk: strip(between(raw, "H-1001 · RISK ON PRICE — hardware brackets", "THE RECEIPT — torn from the same DECISION_ID")),
  raw,
});

type Pin = { name: string; holds: (b: ReturnType<typeof blocks>) => boolean };

const PINS: Pin[] = [
  // ── H-401 ────────────────────────────────────────────────────────────────
  { name: "H-401 zone box at the zone's prices, birth → NOW", holds: b =>
      b.contradiction.includes("const box = contradictionZoneBox({") &&
      b.contradiction.includes("xNow: +xN + bsp * 0.5 + 2,") &&
      b.contradiction.includes("yA: +yA, yB: +yB,") &&
      b.contradiction.includes("const xF = cv.bandFrom != null ? tsC.timeToCoordinate(cv.bandFrom as never) : null;") },
  { name: "H-401 arrows and crack from the glyph owner", holds: b =>
      b.contradiction.includes("const g = contradictionGlyph(box);") &&
      b.contradiction.includes("for (const a of [g.up, g.down]) {") &&
      b.contradiction.includes("const pts = arrowOutline(a);") &&
      b.contradiction.includes("crackStrokes(g.crack).forEach(") },
  { name: "H-401 candles cut out of the zone, arrows and crack", holds: b =>
      /for \(const r of candleCutOutRects\(bsC, \{[\s\S]*?\}, box\.x0, box\.x1\)\) cutC\.rect/.test(b.contradiction) &&
      b.contradiction.includes('ctx.clip(cutC, "evenodd");') },
  { name: "H-401 minimal words: family names, (UP)/(DOWN), UNRESOLVED", holds: b =>
      b.contradiction.includes('const gUp = group(cv.up.map(l => l.family), "(UP)");') &&
      b.contradiction.includes('const gDown = group(cv.down.map(l => l.family), "(DOWN)");') &&
      b.contradiction.includes('t: "UNRESOLVED"') &&
      b.contradiction.includes("contradictionLabelRow(g, sizes, belowY)") },
  { name: "H-401 words through the keep-out owner, ledger and chips", holds: b =>
      b.contradiction.includes("const spot = placeClearOfKeepOut(pref, koC, { minX: keepOutMinX(), blockers: floatingChips, strict: true });") &&
      b.contradiction.includes("recordKeepOut(keepOutLedger, spot);") &&
      b.contradiction.includes("ctx.fillStyle = `rgba(11,10,8,${keepOutBackingAlpha(spot, 0.85)})`;") &&
      b.contradiction.includes("const fits = (y: number) => y >= HEADER_FLOOR_Y + 2 && y + tallest <= SAFE_BOT;") },
  { name: "H-401 no cards: no LEANS columns, no evidence text on glass", holds: b =>
      b.contradiction.length > 0 &&
      !b.contradiction.includes("LEANS UP") && !b.contradiction.includes("LEANS DOWN") &&
      !b.contradiction.includes("l.evidence") && !b.contradiction.includes("colW") },
  // Added 2026-09-25 after the serving check: the WAIT debt tag (placed later
  // against the chip ledger) landed on the DOWN arrow — the zone was never
  // registered. The whole glyph joins the ledger after its word row.
  { name: "H-401 the zone (box ∪ arrows ∪ crack) joins the chip ledger after its words", holds: b =>
      b.contradiction.includes("const zoneTop = Math.min(box.yTop, g.yTop), zoneBot = Math.max(box.yBot, g.yBot);") &&
      b.contradiction.includes("const zoneChip = { x: box.x0, y: zoneTop, w: bw, h: zoneBot - zoneTop };") &&
      /for \(const \[key, grp, anchorX\][\s\S]*?floatingChips\.push\(zoneChip\);/.test(b.contradiction) &&
      b.contradiction.includes("delete ds.contradictionRegistered;") &&
      b.contradiction.includes("ds.contradictionRegistered =") },
  { name: "H-401 prices in the market's decimals, receipts withdrawn each frame", holds: b =>
      b.contradiction.includes("dp: pxDp,") &&
      b.contradiction.includes("delete ds.contradictionGeometry;") &&
      b.contradiction.includes("ds.contradictionGeometry =") },

  // ── H-801 ────────────────────────────────────────────────────────────────
  { name: "H-801 the fan: bands and five dashed edges from the fan owner", holds: b =>
      b.envelope.includes("const poly = fanBandPolygon(cols.map(c => ({ x: c.x, lo: c[lo], hi: c[hi] })));") &&
      b.envelope.includes('band("y10", "y90", 0.07);') &&
      b.envelope.includes('band("y25", "y75", 0.08);') &&
      b.envelope.includes("for (const s of smoothSegments(pts)) ctx.quadraticCurveTo(s.cx, s.cy, s.x, s.y);") &&
      ["y90", "y10", "y75", "y25", "y50"].every(k => b.envelope.includes(`edge("${k}",`)) },
  { name: "H-801 projected right of NOW by logical index", holds: b =>
      b.envelope.includes("const xl = tsE.logicalToCoordinate((lastIdxE + (k - fan.nowK)) as never);") &&
      b.envelope.includes("const fwd = inView.filter(c => c.k > fan.nowK).length;") },
  // The axis edge now rides the header-floor clip rect (updated 2026-09-25).
  { name: "H-801 candles cut out of the fan, fan stops at the axis", holds: b =>
      b.envelope.includes('ctx.clip(cutE, "evenodd");') &&
      /ctx\.rect\(0, HEADER_FLOOR_Y, plotRightE, /.test(b.envelope) &&
      /candleCutOutRects\(barsE, \{/.test(b.envelope) },
  // Added 2026-09-25 after the serving check: the upper bands ran up to y≈68,
  // under the bar clock, the semantic badge and INSPECT.
  { name: "H-801 the fan is clipped at the header floor and the pane bottom, with a receipt", holds: b =>
      b.envelope.includes("ctx.rect(0, HEADER_FLOOR_Y, plotRightE, Math.max(0, paneBotE - HEADER_FLOOR_Y));") &&
      b.envelope.includes("const clippedTop = inView.filter(c => Math.min(c.y90, c.y10) < HEADER_FLOOR_Y).length;") &&
      b.envelope.includes("ds.expectedEnvelopeClipped = [") &&
      b.envelope.includes("delete ds.expectedEnvelopeClipped;") &&
      !b.envelope.includes("ctx.rect(0, 0, plotRightE, H);") },
  { name: "H-801 every chip already on the glass is cut out of the fan, one clip per chip", holds: b =>
      /for \(const r of floatingChips\) \{\s*ctx\.beginPath\(\);\s*ctx\.rect\(0, 0, W, H\);\s*ctx\.rect\(r\.x - 2, r\.y - 2, r\.w \+ 4, r\.h \+ 4\);\s*ctx\.clip\("evenodd"\);\s*\}/.test(b.envelope) &&
      // …and the clip is taken BEFORE the first band is filled.
      b.envelope.indexOf("for (const r of floatingChips) {") < b.envelope.indexOf('band("y10", "y90", 0.07);') },
  { name: "H-801 CAMERA STAYS ON NOW — the block never writes a scale or the camera", holds: b =>
      b.envelope.length > 0 &&
      !/applyOptions|setVisibleRange|setVisibleLogicalRange|scrollToPosition|scrollToRealTime|fitContent|autoscaleInfoProvider|addSeries|addLineSeries|addAreaSeries|setAutoScale|manualPriceRangeRef/.test(b.envelope) },
  { name: "H-801 caption and MARKET SURPRISE flag, with receipts", holds: b =>
      b.envelope.includes("const capT = `analogue envelope n=${nNow} · prior sessions, same bar from the open`;") &&
      b.envelope.includes("const flagT = `MARKET SURPRISE · ${sp.matchedBy} of ${sp.n} went this far`;") &&
      b.envelope.includes("delete ds.expectedEnvelopeFan;") &&
      b.envelope.includes("ds.expectedEnvelopeFan = `STEPS:") },
  { name: "H-801 geometry and words each ask the governor", holds: b =>
      b.envelope.includes('ctx.globalAlpha = att.alpha("expectedEnvelope");') &&
      b.envelope.includes('ctx.globalAlpha = att.textAlpha("expectedEnvelope");') },

  // ── H-704 ────────────────────────────────────────────────────────────────
  { name: "H-704 the receipt counts only pivots on camera", holds: b =>
      /if \(x < 0 \|\| x > plotRightS \|\| y < 0 \|\| y > paneBotS\) continue;\s*onCamera\+\+;/.test(b.structure) &&
      b.structure.includes("if (painted > 0) ds.marketStructurePivots = String(painted);") &&
      b.structure.includes('if (onCamera === 0) ds.marketStructure = "OFF_CAMERA";') },
  { name: "H-704 chevrons, letters beside their own swing, level rules behind candles", holds: b =>
      b.structure.includes("ctx.lineTo(m.x - s, tipY + dir * s * 1.3);") &&
      b.structure.includes('if (spot.mode === "BLOCKED" || Math.abs(spot.rect.x - pref.x) > 10) continue;') &&
      b.structure.includes('ctx.clip(cutS, "evenodd");') &&
      b.structure.includes('`${m.kind === "HIGH" ? "SWING HIGH" : "SWING LOW"} ${m.price.toFixed(pxDp)}`') },
  { name: "H-704 bias word through the keep-out owner, never in the header band", holds: b =>
      b.structure.length > 0 &&
      !b.structure.includes("W - 168") &&
      b.structure.includes("ds.marketStructureBiasPlaced = spot.mode;") &&
      /const pref = \{ x: plotRightS - 6 - tw, y: Math\.max\(HEADER_FLOOR_Y \+ 2,/.test(b.structure) },

  // Added 2026-09-26 after serving ES1! 15m: "SWING H◉UNRESOLVED" — a BLOCKED
  // name kept its preferred rect and painted over the H-901 coin and the
  // newest bodies. BLOCKED is not painted; the coin is on the ledger first.
  { name: "H-704 a BLOCKED level name is not painted, and the H-901 coin is on the ledger before it places", holds: b =>
      /recordKeepOut\(keepOutLedger, spot\);\s*if \(spot\.mode === "BLOCKED"\) \{\s*levels\.push\([^\n]*:BLOCKED`\);\s*continue;\s*\}\s*floatingChips\.push\(\{ x: spot\.rect\.x, y: spot\.rect\.y, w: tw, h: th \}\);\s*named\.push\(spot\.rect\);/.test(b.structure) &&
      b.raw.indexOf("floatingChips.push(spotC.rect);") > -1 &&
      b.raw.indexOf("floatingChips.push(spotC.rect);") < b.raw.indexOf("H-704 · MARKET STRUCTURE — swing highs and lows on price") },
  { name: "H-704 a BLOCKED bias plate is not painted", holds: b =>
      /if \(spot\.mode !== "BLOCKED"\) \{\s*floatingChips\.push\(\{ x: spot\.rect\.x, y: spot\.rect\.y, w: tw, h: th \}\);\s*ctx\.fillStyle = `rgba\(11,10,8,\$\{keepOutBackingAlpha\(spot, 0\.82\)\}\)`;\s*ctx\.fillRect\(spot\.rect\.x, spot\.rect\.y, tw, th\);\s*lines\.forEach/.test(b.structure) },

  // ── H-1001 ───────────────────────────────────────────────────────────────
  { name: "H-1001 the silence is named when nothing is bracketed", holds: b =>
      b.risk.includes('"RISK ON PRICE · no position drawn — Draw › Long / Short Position to bracket its risk"') &&
      b.risk.includes("floatingChips.push({ x: 12, y: H - 114 - 7, w: ctx.measureText(silentR).width, h: 14 });") &&
      b.risk.includes("ds.riskOnPriceSilence = rv.reason;") },
  { name: "H-1001 callouts placed by the keep-out owner, no card border, no ad-hoc slide", holds: b =>
      b.risk.includes("const spotR = placeClearOfKeepOut(prefR, [...keepOut(), ...rowBodiesAt(prefR.y, prefR.y + h)], {") &&
      !b.risk.includes("x -= 24;") &&
      !b.risk.includes("ctx.strokeRect(x + 0.5, y - h / 2 + 0.5, w - 1, h - 1);") },
  { name: "H-1001 R ticks on the reward bracket from the tick owner", holds: b =>
      b.risk.includes('for (const tk of rewardRTicks(rv.side === "SHORT" ? "SHORT" : "LONG", rv.entry, rv.riskPerUnit, rv.rr)) {') &&
      b.risk.includes('if (ticksR.length) ds.riskOnPriceTicks = ticksR.join(",");') },
];

// One mutation per pin: each must turn exactly that pin red.
const MUTATIONS: { pin: string; from: string | RegExp; to: string }[] = [
  { pin: "H-401 zone box at the zone's prices, birth → NOW", from: "xNow: +xN + bsp * 0.5 + 2,", to: "xNow: W * 0.34," },
  { pin: "H-401 arrows and crack from the glyph owner", from: "crackStrokes(g.crack).forEach(", to: "[].forEach(" },
  { pin: "H-401 candles cut out of the zone, arrows and crack", from: 'ctx.clip(cutC, "evenodd");', to: "" },
  { pin: "H-401 minimal words: family names, (UP)/(DOWN), UNRESOLVED", from: 'group(cv.up.map(l => l.family), "(UP)")', to: 'group(cv.up.map(l => l.evidence), "LEANS UP")' },
  { pin: "H-401 words through the keep-out owner, ledger and chips", from: "blockers: floatingChips, strict: true });\n                    recordKeepOut(keepOutLedger, spot);", to: "blockers: floatingChips });\n                    recordKeepOut(keepOutLedger, spot);" },
  { pin: "H-401 no cards: no LEANS columns, no evidence text on glass", from: "ctx.textAlign = \"left\";\n                  // THE ZONE IS AN OBSTACLE TOO", to: "ctx.fillText(\"LEANS UP\", 0, 0);\n                  // THE ZONE IS AN OBSTACLE TOO" },
  { pin: "H-401 the zone (box ∪ arrows ∪ crack) joins the chip ledger after its words", from: "floatingChips.push(zoneChip);", to: "" },
  { pin: "H-401 prices in the market's decimals, receipts withdrawn each frame", from: "            dp: pxDp,\n", to: "" },
  { pin: "H-801 the fan is clipped at the header floor and the pane bottom, with a receipt", from: "ctx.rect(0, HEADER_FLOOR_Y, plotRightE, Math.max(0, paneBotE - HEADER_FLOOR_Y));", to: "ctx.rect(0, 0, plotRightE, H);" },
  { pin: "H-801 every chip already on the glass is cut out of the fan, one clip per chip", from: "ctx.rect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);\n                ctx.clip(\"evenodd\");", to: "ctx.clip(\"evenodd\");" },
  { pin: "H-801 the fan: bands and five dashed edges from the fan owner", from: 'edge("y50", [2, 4], 0.6, 1);', to: "" },
  { pin: "H-801 projected right of NOW by logical index", from: "tsE.logicalToCoordinate((lastIdxE + (k - fan.nowK)) as never)", to: "null" },
  { pin: "H-801 candles cut out of the fan, fan stops at the axis", from: 'ctx.clip(cutE, "evenodd");', to: "" },
  { pin: "H-801 CAMERA STAYS ON NOW — the block never writes a scale or the camera", from: "const tsE = chart.timeScale();", to: 'const tsE = chart.timeScale(); chart.priceScale("right").applyOptions({ autoScale: false });' },
  { pin: "H-801 caption and MARKET SURPRISE flag, with receipts", from: "        delete ds.expectedEnvelopeFan;\n", to: "" },
  { pin: "H-801 geometry and words each ask the governor", from: 'ctx.globalAlpha = att.alpha("expectedEnvelope");', to: "ctx.globalAlpha = 1;" },
  { pin: "H-704 the receipt counts only pivots on camera", from: "if (x < 0 || x > plotRightS || y < 0 || y > paneBotS) continue;", to: "" },
  { pin: "H-704 chevrons, letters beside their own swing, level rules behind candles", from: 'if (spot.mode === "BLOCKED" || Math.abs(spot.rect.x - pref.x) > 10) continue;', to: "" },
  { pin: "H-704 bias word through the keep-out owner, never in the header band", from: "ds.marketStructureBiasPlaced = spot.mode;", to: 'ctx.fillText(word, W - 168, 6);' },
  { pin: "H-704 a BLOCKED level name is not painted, and the H-901 coin is on the ledger before it places", from: "if (spot.mode === \"BLOCKED\") {\n                levels.push", to: "if (false) {\n                levels.push" },
  { pin: "H-704 a BLOCKED bias plate is not painted", from: "if (spot.mode !== \"BLOCKED\") {\n                floatingChips.push", to: "if (true) {\n                floatingChips.push" },
  { pin: "H-1001 the silence is named when nothing is bracketed", from: "? \"RISK ON PRICE · no position drawn — Draw › Long / Short Position to bracket its risk\"", to: "? \"\"" },
  { pin: "H-1001 callouts placed by the keep-out owner, no card border, no ad-hoc slide", from: "ctx.fillStyle = color; ctx.fillRect(x, y - h / 2, 2, h);", to: "ctx.strokeStyle = color; ctx.strokeRect(x + 0.5, y - h / 2 + 0.5, w - 1, h - 1);" },
  { pin: "H-1001 R ticks on the reward bracket from the tick owner", from: 'if (ticksR.length) ds.riskOnPriceTicks = ticksR.join(",");', to: "" },
];

describe("the four lenses draw the canon's geometry (Sentinel, 2026-09-25)", () => {
  const live = blocks(RAW);

  it("finds every block", () => {
    for (const [k, v] of Object.entries(live)) expect(v.length, k).toBeGreaterThan(1500);
  });

  for (const pin of PINS) {
    it(pin.name, () => {
      expect(pin.holds(live)).toBe(true);
    });
  }

  it("every pin can fail — each mutation turns its own pin red", () => {
    expect(new Set(MUTATIONS.map(m => m.pin)).size).toBe(PINS.length);
    for (const m of MUTATIONS) {
      const pin = PINS.find(p => p.name === m.pin);
      expect(pin, m.pin).toBeDefined();
      const hits = typeof m.from === "string" ? RAW.split(m.from).length - 1 : (RAW.match(m.from) ?? []).length;
      expect(hits, `mutation target for "${m.pin}" must exist exactly once`).toBe(1);
      const mutated = RAW.replace(m.from, m.to);
      expect(pin!.holds(blocks(mutated)), `"${m.pin}" stayed green under its mutation`).toBe(false);
    }
  });
});
