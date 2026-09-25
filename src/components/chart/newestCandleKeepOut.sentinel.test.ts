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

describe("the profile stack's label column yields to the newest bodies", () => {
  const stackLabel = slice("const stackLabel = (y: number, text: string, ink: string) => {", "ctx.restore();\n        };");

  it("never prints inside the price legend's band", () => {
    expect(stackLabel).toContain("const legendFloor = PRICE_LEGEND_OVERLAY_H + 7;");
    expect(stackLabel).toContain("let yy = nearestFreeLabelY(Math.max(y, legendFloor), stackLabelYs, 12);");
    // …and a second name floored onto the same row steps DOWN, never back up.
    expect(stackLabel).toMatch(/if \(yy < legendFloor\) \{\s*yy = legendFloor;\s*while \(stackLabelYs\.some\(t => Math\.abs\(t - yy\) < 12\)\) yy \+= 12;\s*\}/);
  });

  it("asks the keep-out where the label may print, stepping around chips too", () => {
    // Pin updated 2026-09-25 (serving TSLA 1h): the column sits left of the
    // Living body over older candles, so every body on its own row counts too.
    expect(stackLabel).toMatch(/placeClearOfKeepOut\(\s*\{ x: stackPlan\.labelRight - lwS - 3, y: yy - 5\.5, w: lwS \+ 5, h: 11 \},\s*\[\.\.\.keepOut\(\), \.\.\.rowBodiesAt\(yy - 5\.5, yy \+ 5\.5\)\],\s*\{ minX: keepOutMinX\(\), blockers: floatingChips \},?\s*\)/);
    const rows = slice("const rowBodiesAt = (yTop: number, yBot: number) => {", "return bodiesInView.filter(");
    expect(rows).toMatch(/spanCandleKeepOut\(barsRef\.current \?\? \[\]/);
    expect(rows).toMatch(/barSpacing: bsp/);
    expect(stackLabel).toMatch(/recordKeepOut\(keepOutLedger, spotS\)/);
  });

  it("paints the backing where the placement says, at an alpha the placement allows", () => {
    expect(stackLabel).toMatch(/ctx\.fillStyle = `rgba\(11,10,8,\$\{keepOutBackingAlpha\(spotS, 0\.72\)\}\)`;\s*ctx\.fillRect\(spotS\.rect\.x, spotS\.rect\.y, spotS\.rect\.w, spotS\.rect\.h\);/);
    expect(stackLabel).not.toMatch(/fillRect\(stackPlan\.labelRight/);
  });

  it("ties a slid label back to the lane at the true price with a dotted leader", () => {
    expect(stackLabel).toMatch(/if \(spotS\.mode === "SLID"\) \{[\s\S]*?setLineDash\(\[1, 2\]\)[\s\S]*?lineTo\(stackPlan\.stackLeft, y\)/);
  });
});

describe("Profile Memory labels yield to the newest bodies", () => {
  const memory = slice("const text = `S-${l.sessionsAgo} ${l.kind}", "ds.profileMemoryLevels = String(drawn);");

  it("asks the keep-out, sliding only along the level's own line and never left of its birth", () => {
    // Pin updated 2026-09-25 (serving NQ1! 5m, every species on): strict —
    // the label column's names are chips too — and it joins the chip ledger.
    expect(memory).toMatch(/placeClearOfKeepOut\(\s*\{ x: lx, y: y - 7, w, h: 14 \},\s*keepOut\(\),\s*\{ minX: Math\.max\(x0, keepOutMinX\(\)\), blockers: floatingChips, strict: true \},?\s*\)/);
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
    expect(callout).toMatch(/placeClearOfKeepOut\(\s*\{ x: cxAbove, y: byAbove, w, h: bh2 \},\s*keepOut\(\),/);
    expect(callout).toMatch(/blockers: floatingChips,\s*strict: true,/);
    expect(callout).toMatch(/alternates: byBelow \+ bh2 <= pane0Bottom - 4 \? \[\{ x: cxAbove, y: byBelow, w, h: bh2 \}\] : \[\]/);
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
