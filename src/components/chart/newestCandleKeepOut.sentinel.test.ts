/**
 * THE NEWEST CANDLES ARE A KEEP-OUT — Garden Pass 12, Defect 4.
 *
 *     Candle-preservation zones … the market remains dominant.
 *
 * The profile stack's label column, the Profile Memory labels, the selected
 * zone's callout, the Value Migration dPOC name and the narrow absorption chip
 * all print opaque backings, and all of them land at the live edge, because
 * that is where "now" is. Each one
 * now asks the ONE keep-out owner (src/lib/chartKeepOut.ts) where it may
 * print: it slides off the newest 3 bodies, and when nothing is clear its
 * backing yields — the words are never deleted.
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

describe("one keep-out owner per frame", () => {
  it("builds the boxes from the chart's own bars and transforms, through the pure owner", () => {
    const getter = slice("const keepOut = () => {", "const keepOutMinX");
    expect(getter).toMatch(/newestCandleKeepOut\(barsRef\.current \?\? \[\]/);
    expect(getter).toMatch(/tsK\.timeToCoordinate\(/);
    expect(getter).toMatch(/srs\.priceToCoordinate\(/);
    expect(getter).toMatch(/barSpacing: bsp/);
  });

  it("withdraws the receipt with the glass clear and republishes it only from the ledger", () => {
    expect(CHART).toMatch(/ctx\.clearRect\(0, 0, W, H\);\s*for \(const k of KEEP_OUT_RECEIPTS\) delete canvas\.dataset\[k\];/);
    expect(CHART).toMatch(/const keepOutNow = keepOutReceipt\(keepOutLedger\);\s*if \(keepOutNow\) Object\.assign\(canvas\.dataset, keepOutNow\);/);
  });
});

describe("the profile family's level chips yield to the candles", () => {
  // Pin moved 2026-09-25 (P-110 canon pass). The one label column LEFT of the
  // stack became the family's level chips at the plot's RIGHT edge (P-110 /
  // M47), and its keep-out grew from bodies to bodies AND WICKS: on serving
  // (TSLA 15m) "CMP VAH / POC / VAL" printed on the big red Sep-25 candle.
  const chip = slice("const levelChip = (y: number, text: string, ink: string, opts:", "const quietWords = (text: string, pref: WordsAt, ink: string");

  it("never prints inside the header band, and two chips never share a row", () => {
    expect(chip).toContain("const floorY = opts.floorY ?? HEADER_FLOOR_Y;");
    expect(chip).toContain("let yy = nearestFreeLabelY(Math.max(y, rowFloor), levelChipYs, LEVEL_CHIP_H + 1);");
    // …and a second name floored onto the same row steps DOWN, never back up.
    expect(chip).toMatch(/if \(yy < rowFloor\) \{\s*yy = rowFloor;\s*while \(levelChipYs\.some\(t => Math\.abs\(t - yy\) < LEVEL_CHIP_H \+ 1\)\) yy \+= LEVEL_CHIP_H \+ 1;\s*\}/);
  });

  it("asks the keep-out where the chip may print: every candle body and wick under its slots, every chip, strictly", () => {
    expect(chip).toMatch(/placeClearOfKeepOut\(\s*slots\.preferred,\s*\[\.\.\.keepOut\(\), \.\.\.profileCandlesAt\(slots\.top, slots\.bottom\)\],\s*\{ minX: Math\.max\(keepOutMinX\(\), opts\.minX \?\? 4\), blockers: floatingChips, strict: true, alternates \},?\s*\)/);
    const rows = slice("function profileCandlesAt(yTop: number, yBot: number) {", "function drawWMVP(");
    expect(rows).toContain("profileCandleCut().rects.filter(r => r.y < yBot && r.y + r.h > yTop)");
    const cut = slice("function profileCandleCut() {", "function clipProfileToCandles(species: string) {");
    expect(cut).toMatch(/candleCutOutRects\(barsRef\.current \?\? \[\], \{/);
    expect(cut).toMatch(/barSpacing: bsp/);
    expect(chip).toMatch(/recordKeepOut\(keepOutLedger, spotL\)/);
  });

  it("fills gold only where the placement is clear; on a candle its fill yields", () => {
    expect(chip).toMatch(/if \(spotL\.onCandles\) \{\s*ctx\.fillStyle = `rgba\(11,10,8,\$\{keepOutBackingAlpha\(spotL, 0\.9\)\}\)`;/);
    expect(chip).toMatch(/\} else \{\s*ctx\.fillStyle = ink;\s*ctx\.fillRect\(r\.x, r\.y, r\.w, r\.h\);/);
  });

  it("ties a moved or slid chip back to its price with a dotted leader", () => {
    expect(chip).toMatch(/if \(levelChipNeedsLeader\(r, y, spotL\.mode === "SLID"\)\) \{[\s\S]*?setLineDash\(\[1, 2\]\)[\s\S]*?lineTo\(anchorX, y\)/);
  });
});

describe("Profile Memory labels yield to the newest bodies", () => {
  const memory = slice("const text = `S-${l.sessionsAgo} ${l.kind}", "ds.profileMemoryLevels = String(drawn);");

  it("asks the keep-out, sliding only along the level's own line and never left of its birth", () => {
    // Pin updated 2026-09-25 (serving NQ1! 5m, every species on): strict —
    // the label column's names are chips too — and it joins the chip ledger.
    // Pin updated again 2026-09-25 (keep-out completion): the name's row runs
    // back over older candles, so every body under that row counts too.
    // …and again 2026-09-25 (P-110 canon pass): every WICK under the row too.
    expect(memory).toMatch(/placeClearOfKeepOut\(\s*\{ x: lx, y: y - 7, w, h: 14 \},\s*\[\.\.\.keepOut\(\), \.\.\.rowBodiesAt\(y - 7, y \+ 7\), \.\.\.profileCandlesAt\(y - 7, y \+ 7\)\],\s*\{ minX: Math\.max\(x0, keepOutMinX\(\)\), blockers: floatingChips, strict: true \},?\s*\)/);
    expect(memory).toContain("floatingChips.push({ x: spotM.rect.x, y: spotM.rect.y, w, h: 14 });");
    expect(memory).toMatch(/recordKeepOut\(keepOutLedger, spotM\)/);
  });

  it("paints backing and words where the placement says, at an alpha it allows", () => {
    expect(memory).toMatch(/ctx\.fillStyle = `rgba\(11,10,8,\$\{keepOutBackingAlpha\(spotM, 0\.80\)\}\)`;\s*ctx\.fillRect\(spotM\.rect\.x, spotM\.rect\.y, w, 14\);/);
    expect(memory).toMatch(/ctx\.fillText\(text, spotM\.rect\.x \+ 4, y\);/);
    expect(memory).not.toMatch(/fillRect\(lx,/);
  });
});

describe("the selected-zone callout clears the newest bodies and the chips on the glass", () => {
  const callout = slice('const l1 = "SELECTED ZONE";', "selectedPainted = z.object.objectId;");

  it("is a slot test against keep-out ∪ floatingChips, with the mirror slot under the zone", () => {
    // Pin updated 2026-09-25 (keep-out completion): a zone born in history
    // hangs its callout over older candles, so every body under the rows it
    // may take is a keep-out; it may step one box further out either side,
    // and its slide stops where its right edge meets the zone's left.
    expect(callout).toMatch(/placeClearOfKeepOut\(\s*\{ x: cxAbove, y: byAbove, w, h: bh2 \},\s*\[\.\.\.keepOut\(\), \.\.\.rowBodiesAt\(Math\.min\(byAbove, byHigher\), Math\.max\(byAbove, byLower\) \+ bh2\)\],/);
    expect(callout).toMatch(/minX: Math\.max\(keepOutMinX\(\), Math\.min\(cxAbove, x0 - w\)\),/);
    expect(callout).toMatch(/blockers: floatingChips,\s*strict: true,/);
    expect(callout).toContain("const byHigher = byAbove - bh2 - 6, byLower = byBelow + bh2 + 6;");
    expect(callout).toContain("...(byBelow + bh2 <= pane0Bottom - 4 ? [{ x: cxAbove, y: byBelow, w, h: bh2 }] : []),");
    expect(callout).toContain("...(byHigher >= HEADER_FLOOR_Y ? [{ x: cxAbove, y: byHigher, w, h: bh2 }] : []),");
    expect(callout).toContain("...(byLower + bh2 <= pane0Bottom - 4 ? [{ x: cxAbove, y: byLower, w, h: bh2 }] : []),");
    expect(callout).toMatch(/alternates: zoneAlternates,/);
    expect(callout).toMatch(/recordKeepOut\(keepOutLedger, spotZ\)/);
    expect(callout).toMatch(/const cx = spotZ\.rect\.x, by = spotZ\.rect\.y;/);
  });

  it("keeps its leader on the zone from whichever side it landed, and yields its backing only on candles", () => {
    expect(callout).toMatch(/ctx\.moveTo\(Math\.round\(footX\) \+ 0\.5, boxAboveZone \? by \+ bh2 : by\)/);
    expect(callout).toMatch(/ctx\.fillStyle = `rgba\(11,10,8,\$\{keepOutBackingAlpha\(spotZ, 0\.92\)\}\)`;\s*ctx\.fillRect\(cx, by, w, bh2\);/);
    expect(callout).toMatch(/floatingChips\.push\(\{ x: cx, y: by, w, h: bh2 \}\);/);
  });
});

describe("the Value Migration name, printed at its newest point, yields to the newest bodies", () => {
  const dpoc = slice("const text = `dPOC ${last.poc.toFixed(pxDp)}", "ds.valueMigrationPoints = String(drawn);");

  it("asks the keep-out, with the mirror row under the line before a slide", () => {
    // Pin updated 2026-09-25 (serving NQ1! 5m: the 0.82 backing hid the ten
    // bodies before "now"): every body under its own row is a keep-out too,
    // and it may step just above / below those bodies before sliding.
    expect(dpoc).toMatch(/const rowBodies = spanCandleKeepOut\(barsRef\.current \?\? \[\], \{/);
    expect(dpoc).toContain("}, x, x + w);");
    expect(dpoc).toContain("const rowAlternates = [{ x, y: y + 24 - 7, w, h: 14 }];");
    // Stepping up never enters the header band (serving TSLA 1h FAR: the
    // name touched the DOM evidence chip).
    expect(dpoc).toContain("if (above >= HEADER_FLOOR_Y) rowAlternates.push({ x, y: above, w, h: 14 });");
    expect(dpoc).toMatch(/placeClearOfKeepOut\(\s*\{ x, y: y - 7, w, h: 14 \},\s*\[\.\.\.keepOut\(\), \.\.\.rowBodies\],\s*\{ minX: keepOutMinX\(\), blockers: floatingChips, alternates: rowAlternates \},?\s*\)/);
    expect(dpoc).toMatch(/recordKeepOut\(keepOutLedger, spotV\)/);
    expect(dpoc).toContain("ds.valueMigrationLabel = `${spotV.mode}${spotV.onCandles ? \":YIELDED\" : \"\"}`;");
  });

  it("paints backing and words where the placement says, at an alpha it allows", () => {
    expect(dpoc).toMatch(/ctx\.fillStyle = `rgba\(11,10,8,\$\{keepOutBackingAlpha\(spotV, 0\.82\)\}\)`;\s*ctx\.fillRect\(spotV\.rect\.x, spotV\.rect\.y, w, 14\);/);
    expect(dpoc).toMatch(/ctx\.fillText\(text, spotV\.rect\.x \+ 4, spotV\.rect\.y \+ 7\);/);
  });
});

describe("the narrow absorption chip's backing yields to the newest bodies", () => {
  const chip = slice("const chip = `ABSORPTION ${ratioTxt} ${zone.strength}`;", "ds.absorptionChips =");

  it("picks its slot against the chips AND, when backed, the keep-out", () => {
    expect(chip).toMatch(/const hit = \(y: number\) => \[\.\.\.absorbChipRects, \.\.\.floatingChips\]\.some\(/);
    // Pin updated 2026-09-25 (keep-out completion): a shelf formed in history
    // hangs its chip over the older candles that made it, so every body under
    // the slots' span is a keep-out too, not only the newest three.
    expect(chip).toContain("const slotRects = slots.map(y => ({ x: chipX, y: Math.max(2, y), w: chipW, h: chipH }));");
    expect(chip).toMatch(/pickSlotClearOfKeepOut\(\s*slotRects,\s*desktopShelfInstrument \? \[\] : \[\s*\.\.\.keepOut\(\),\s*\.\.\.rowBodiesAt\(Math\.min\(\.\.\.slotRects\.map\(s => s\.y\)\), Math\.max\(\.\.\.slotRects\.map\(s => s\.y \+ s\.h\)\)\),?\s*\],\s*s => hit\(s\.y\),?\s*\)/);
    expect(chip).toMatch(/if \(chipSpot == null\) \{ absorbChipsHidden\+\+; continue; \}/);
    expect(chip).toMatch(/recordKeepOut\(keepOutLedger, chipSpot\);\s*const chipY = chipSpot\.rect\.y;/);
  });

  it("paints the backed form at an alpha the placement allows", () => {
    expect(chip).toMatch(/ctx\.fillStyle = `rgba\(14,12,8,\$\{keepOutBackingAlpha\(chipSpot, 0\.92\)\}\)`;\s*ctx\.fillRect\(chipX, chipY, chipW, chipH\);/);
  });
});

describe("the exhaustion chip clears every body under its row and the chips on the glass", () => {
  // Added 2026-09-25 (keep-out completion): the chip (0.88 backing) is centred
  // on its mark, so it spanned the push's own candles with no keep-out at all.
  const ex = slice("const chipTxt = `EXHAUSTION · EFFORT 2ND÷1ST", "exhaustionDrawn.length > 0");

  it("takes a strict slot test: a step further out, the mirror side, then a slide that still reaches its mark", () => {
    expect(ex).toContain("const exAlternates = [up ? cy - 16 : cy + 16, up ? y0 + 12 : y0 - 26]");
    expect(ex).toMatch(/ay >= HEADER_FLOOR_Y && ay \+ 14 <= pane0Bottom &&\s*!\(lensBand && ay < 158 && ay \+ 14 > 96\) && !\(lensCol\(ay\) && cxx < QUESTION_LENS_COLUMN_RIGHT\)/);
    expect(ex).toMatch(/placeClearOfKeepOut\(\s*\{ x: cxx, y: cy, w: cw, h: 14 \},\s*\[\.\.\.keepOut\(\), \.\.\.rowBodiesAt\(Math\.min\(\.\.\.exRows\), Math\.max\(\.\.\.exRows\) \+ 14\)\],/);
    expect(ex).toMatch(/minX: Math\.max\(4, x - cw - 16, lensCol\(cy\) \? QUESTION_LENS_COLUMN_RIGHT : 4\),\s*blockers: floatingChips,\s*strict: true,\s*alternates: exAlternates,/);
    expect(ex).toMatch(/recordKeepOut\(keepOutLedger, spotX\);\s*cxx = spotX\.rect\.x; cy = spotX\.rect\.y;/);
  });

  it("paints, publishes and hit-tests where the placement says, at an alpha it allows", () => {
    expect(ex).toMatch(/ctx\.fillStyle = `rgba\(20,8,8,\$\{keepOutBackingAlpha\(spotX, 0\.88\)\}\)`;\s*ctx\.fillRect\(cxx, cy, cw, 14\);\s*floatingChips\.push\(\{ x: cxx, y: cy, w: cw, h: 14 \}\);/);
    expect(ex).not.toContain('ctx.fillStyle = "rgba(20,8,8,0.88)"');
  });
});

describe("the Structure Profile's name and LEG POC chip clear every body under their rows", () => {
  // Added 2026-09-25 (keep-out completion): both chips (0.82 backing) print
  // right of the swing over the leg's own candles, with no keep-out at all.
  const chipFn = slice("const chip = (text: string, x: number, y: number) => {", "`STRUCTURE · FROM ${kind}");

  it("tests the chip-free row strictly, then the rows a step away, then a slide that stops at the anchor", () => {
    expect(chipFn).toMatch(/const rowsS: number\[\] = \[y\];\s*for \(let step = 1; step <= 6; step\+\+\) \{/);
    expect(chipFn).toContain("if (down + 2 <= pane0Bottom) rowsS.push(down);");
    expect(chipFn).toContain("if (up - 12 >= HEADER_FLOOR_Y) rowsS.push(up);");
    expect(chipFn).toContain("const altsS = rowsS.filter(r => r !== cy).map(r => ({ x: cx, y: r - 12, w, h: 14 }));");
    // Pin updated again 2026-09-25 (P-110 canon pass): bodies AND wicks.
    expect(chipFn).toContain("const bandS = [Math.min(cy, ...rowsS) - 12, Math.max(cy, ...rowsS) + 2] as const;");
    expect(chipFn).toMatch(/placeClearOfKeepOut\(\s*\{ x: cx, y: cy - 12, w, h: 14 \},\s*\[\.\.\.keepOut\(\), \.\.\.rowBodiesAt\(bandS\[0\], bandS\[1\]\), \.\.\.profileCandlesAt\(bandS\[0\], bandS\[1\]\)\],\s*\{ minX: Math\.max\(keepOutMinX\(\), Math\.min\(cx, x0 - w - 6\)\), blockers: floatingChips, strict: true, alternates: altsS \},?\s*\)/);
    expect(chipFn).toMatch(/recordKeepOut\(keepOutLedger, spotP\)/);
  });

  it("paints backing and words where the placement says, at an alpha it allows", () => {
    expect(chipFn).toMatch(/ctx\.fillStyle = `rgba\(11,10,8,\$\{keepOutBackingAlpha\(spotP, 0\.82\)\}\)`;\s*ctx\.fillRect\(spotP\.rect\.x, spotP\.rect\.y, w, 14\);/);
    expect(chipFn).toContain("ctx.fillText(text, spotP.rect.x + 4, spotP.rect.y + 12);");
    expect(chipFn).not.toContain('ctx.fillStyle = "rgba(11,10,8,0.82)"');
  });
});
