/**
 * LIVING PROFILE REACHES THE CANDLES — H-703, family F04 Profiles.
 *
 * `selectLivingProfile` publishes real, measured prices — HVN and LVN — with
 * the bucket LOW edge as the price. Its only consumer had been `LivingProfileView`,
 * a card. The classic PRICES-TRAPPED-IN-A-DRAWER defect, third occurrence.
 *
 * Two guards pulling opposite ways, the same shape as the four order-flow
 * sentinels above:
 *
 *   1. The marks MUST reach the axis at the compiler's own bucket prices.
 *   2. NOTHING ELSE may. `weight`, `distanceFromPoc` and the raw `volume`
 *      would map onto a price scale without complaint, and every such mapping
 *      is a level the house invented.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

const CHART = strip(read("src/components/chart/MainChart.tsx"));
const ROOM = strip(read("src/components/chart/ChartsDashboard.tsx"));

const block = (() => {
  const at = CHART.indexOf("const lp = livingProfileRef.current");
  expect(at, "the living-profile block was renamed or removed").toBeGreaterThan(-1);
  // Bounded by the next known landmark — no fixed reach.
  const candidates = ["selectHeatLens", "P-601 HEAT LENS", "/* ══"];
  let end = -1;
  for (const c of candidates) {
    const i = CHART.indexOf(c, at + 100);
    if (i > 0 && (end < 0 || i < end)) end = i;
  }
  expect(end, "no landmark follows this block").toBeGreaterThan(at);
  return CHART.slice(at, end);
})();

describe("the reading reaches the chart", () => {
  it("the room hands the CHART the same glass verdict", () => {
    expect(ROOM).toMatch(/livingProfileGlass=\{livingProfileGlass\}/);
    expect(ROOM).toMatch(/selectLivingProfileGlass\(livingProfileVM\)/);
  });

  it("the chart accepts it as a prop and re-derives nothing", () => {
    expect(CHART).toMatch(/livingProfileGlass\?: LivingProfileGlass \| null/);
    expect(CHART).not.toMatch(/\bselectLivingProfile\s*\(/);
    expect(CHART).not.toMatch(/\bselectLivingProfileGlass\s*\(/);
  });

  it("the overlay reads it through a ref, not through its dependency array", () => {
    expect(CHART).toMatch(/livingProfileRef/);
    const deps = CHART.slice(CHART.lastIndexOf("}, [footprintType"));
    expect(deps.slice(0, 400)).not.toMatch(/\blivingProfile(?:Glass)?\b/);
  });
});

describe("H-703 — the histogram paints on the canvas, not the dots alone", () => {
  it("EVERY BUCKET the compiler emitted is a point of ONE filled body (P110 · the auction body)", () => {
    // The line the Founder pointed at was "six annotation dots called a
    // profile". Then it was hairline rows in an 84px lane. Canon P110: one
    // gold body fused to price — every bucket a point of it, filled once.
    expect(block).toMatch(/for \(const b of lp\.bars\)/);
    expect(block).toMatch(/silhouette\.push\(\{ x: rightEdge - width, y: y \+ rowH \/ 2 \}\);/);
    expect(block).toMatch(/ctx\.fillStyle = g; ctx\.fill\(bodyPath\);/);
    expect(block).toMatch(/ds\.livingProfileForm = `BODY:\$\{runPts\.length\}`;/);
  });

  it("the body never tints a candle: every candle under it is cut out of the fill (Defect 4)", () => {
    // Pin updated 2026-09-25 (Sentinel P1-1): the cut-out is ONE Path2D built
    // once per frame and shared by everything the body paints in its room.
    // Pin updated again 2026-09-25 (P-110 canon pass): the Path2D moved up to
    // the whole profile family (profileCandleCut, from the one cut-out owner
    // chartKeepOut.candleCutOutRects over every candle in view), because
    // Composite, VRP, TPO, Structure and Memory painted through the candles
    // Living was cut round. Living's wrapper keeps its candles-kept receipt.
    const cutAt = block.indexOf("const clipToCandleCutOut = () => {");
    const cutFn = block.slice(cutAt, block.indexOf('clipProfileToCandles("LIVING");', cutAt) + 40);
    expect(cutFn.length).toBeGreaterThan(200);
    expect(cutFn).toContain("if (xb == null || +xb < rightEdge - bodyW - 16 - bsp || +xb > rightEdge + bsp) continue;");
    expect(cutFn).toContain("ds.livingProfileCandlesKept = String(candlesKept);");
    expect(cutFn).toContain('clipProfileToCandles("LIVING");');
    const family = CHART.slice(CHART.indexOf("function profileCandleCut() {"), CHART.indexOf("function profileCandlesAt(yTop: number, yBot: number) {"));
    expect(family.length).toBeGreaterThan(500);
    expect(family).toContain("path.rect(0, 0, W, H);");
    expect(family).toContain("for (const r of rects) path.rect(r.x, r.y, r.w, r.h);");
    expect(family).toMatch(/candleCutOutRects\(barsRef\.current \?\? \[\], \{[\s\S]*?\}, -1e9, 1e9\);/);
    expect(family).toContain('ctx.clip(profileCandleCut().path, "evenodd");');
    const cut = block.search(/ctx\.save\(\); clipToCandleCutOut\(\);\s*const C = LIVING_BODY_CANON;/);
    const grad = block.indexOf("const g = ctx.createLinearGradient(rightEdge, 0, rightEdge - bodyW, 0);");
    const fill = block.indexOf("ctx.fillStyle = g; ctx.fill(bodyPath);");
    expect(cut).toBeGreaterThan(-1);
    expect(grad).toBeGreaterThan(cut);
    expect(fill).toBeGreaterThan(grad);
    // No restore between the cut and the fill: the fill is inside the cut.
    expect(block.slice(cut, fill)).not.toContain("ctx.restore();");
    expect(block).toMatch(/ctx\.restore\(\); \/\/ releases the candle cut-out/);
  });

  it("the VAH/VAL rules, the memory ghosts and the POC glow and dot paint inside the same cut-out", () => {
    // Added 2026-09-25 (Sentinel P1-1): with the body sized from bodyW (up to
    // 360px) these reached across ~25 older candles while only the body fill
    // was cut round them.
    // Pin updated 2026-09-25 (P-110 canon pass): the column wash is gone (the
    // plate has none; the solid body carries "inside value"); the VAH/VAL
    // rules that replaced it run across the plot BEHIND the candles.
    const livingOnly = block.slice(0, block.indexOf("const cp = compositeProfileRef.current;"));
    expect(livingOnly.length).toBeGreaterThan(9000);
    expect(livingOnly).not.toMatch(/ctx\.fillStyle = pk\.rgba\("WASH", 0\.0[46]\);/);
    expect(block).toMatch(/ctx\.save\(\); clipToCandleCutOut\(\);\s*const edgeHi = pk\.rgbaAs\("EDGE_HIGH", "ANCHOR", LIVING_BODY_CANON\.edgeRuleAlpha\);/);
    expect(block).toContain("ctx.restore(); // releases the rules' candle cut-out");
    const ghosts = block.slice(block.indexOf('ctx.globalAlpha = att.alpha("sessionGhosts");'), block.indexOf("ctx.globalAlpha = livingAlpha;"));
    const open = ghosts.indexOf("ctx.save(); clipToCandleCutOut();");
    const close = ghosts.indexOf("ctx.restore(); // releases the ghosts' candle cut-out");
    expect(open).toBeGreaterThan(-1);
    expect(close).toBeGreaterThan(open);
    // Every ghost fill and edge stroke sits between the two; the names are words and print after.
    for (const draw of ["ctx.fillRect(gRight - w, Math.round(+y - rh / 2), w, rh);", "ctx.lineWidth = 1; ctx.stroke();"]) {
      const at = ghosts.indexOf(draw);
      expect(at, draw).toBeGreaterThan(open);
      expect(at, draw).toBeLessThan(close);
    }
    expect(ghosts.indexOf("for (const n of ghostNames) ctx.fillText(n.text, n.x, n.y);")).toBeGreaterThan(close);
    // Pin updated 2026-09-25 (P-110 canon pass): the dashed POC rule now runs
    // across the whole plot inside the same cut, and the glow and dot take
    // the plate's sizes from LIVING_BODY_CANON, at the middle of the POC row.
    const glowAt = block.indexOf("const glow = ctx.createRadialGradient(");
    const poc = block.slice(block.lastIndexOf("ctx.save(); clipToCandleCutOut();", glowAt), block.indexOf("releases the POC mark's candle cut-out", glowAt));
    expect(poc).toMatch(/^ctx\.save\(\); clipToCandleCutOut\(\);\s*ctx\.setLineDash\(\[\.\.\.C\.pocRuleDash\]\);/);
    expect(poc).toContain("ctx.lineTo(plotRight, Math.round(+yp) + 0.5)");
    expect(poc).toContain("const glow = ctx.createRadialGradient(px, +yp, 0, px, +yp, C.pocGlowRadius);");
    expect(poc).toContain("ctx.arc(px, +yp, C.pocDotRadius, 0, Math.PI * 2);");
    expect(block).toContain("const px = rightEdge - Math.max(1, Math.round(pocBar.share * bodyW)) / 2;");
  });

  it("width comes from `share` — a NORMALISED number, never volume — on the body's scale", () => {
    expect(block).toMatch(/b\.share \* bodyW/);
    expect(block).not.toMatch(/b\.volume/);
    // The body's room is the stack plan's (planProfileStack: ≤ its target,
    // never into the left 140px, neighbours moved left of it).
    expect(block).toMatch(/const bodyW = Math\.max\(histMax, stackPlan\.livingBodyWidth \?\? histMax\);/);
  });

  it("paints the value-area BAND before the bars, so the bars sit on top of it", () => {
    // Two prices become one band — the compiler's boundaries read as a band
    // rather than two disconnected hairlines. Order matters: fill first.
    const bandIdx = block.indexOf("lp.vah != null && lp.val != null");
    const barsIdx = block.indexOf("for (const b of lp.bars)");
    expect(bandIdx).toBeGreaterThan(-1);
    expect(barsIdx).toBeGreaterThan(bandIdx);
  });

  it("POC bucket gets its own ink — the trader can find it without hunting", () => {
    expect(block).toMatch(/b\.isPoc/);
  });

  it("prints POC · VAH · VAL prices beside the histogram (tagged LIVING when stacked)", () => {
    // Pin updated 2026-09-25: prices at the market's own precision (pxDp, pricePrecision.ts).
    expect(block).toMatch(/`(?:\$\{tag\})?POC \$\{lp\.poc\.toFixed\(pxDp\)\}`/);
    expect(block).toMatch(/`(?:\$\{tag\})?VAH \$\{lp\.vah\.toFixed\(pxDp\)\}`/);
    expect(block).toMatch(/`(?:\$\{tag\})?VAL \$\{lp\.val\.toFixed\(pxDp\)\}`/);
  });

  it("joins the shared profile lane system instead of painting over the VP columns", () => {
    // Geometry comes from the ONE stack plan, which counts the VP columns.
    expect(block).toMatch(/stackPlan\.lanes\.LIVING/);
    expect(CHART).toMatch(/fixedLanes: \(fixedVPActive \? 1 : 0\) \+ \(sessionVPActive \? 1 : 0\)/);
  });

  it("caps the histogram width so it cannot eat the whole canvas", () => {
    // The cap moved to the one lane owner: solo geometry lives in soloLane.
    expect(block).toMatch(/stackPlan\.lanes\.LIVING \?\? soloLane\(W\)/);
    const plan = read("src/lib/marketData/viewModels/profileStackPlan.ts");
    expect(plan).toMatch(/Math\.min\(160, Math\.round\(canvasWidth \* 0\.16\)\)/);
  });
});

describe("A NODE IS A PRICE, and only a price", () => {
  it("passes only the compiler's own price to a coordinate function", () => {
    expect(block).toMatch(/srs\.priceToCoordinate\(m\.price\)/);
    expect(block).not.toMatch(
      /Coordinate\([^)]*(?:eight|olume|hare|istance|ntraded)/,
    );
  });

  it("counts marks actually painted rather than the whole list", () => {
    expect(block).toMatch(/if \(yr == null\) continue/);
    expect(block).toMatch(/drawnMarks\+\+/);
    expect(block).toMatch(/ds\.livingProfileMarks = String\(drawnMarks\)/);
  });

  it("never reads a tempting size field — the compiler emits none", () => {
    // `LivingProfileGlass` deliberately does not carry raw volumes, distances,
    // or shares. This file must not try to fish them out.
    expect(block).not.toMatch(/m\.(?:volume|distanceFromPoc|shareOfTotal)\b/);
  });
});

describe("HVN vs LVN — told apart by mark shape, never by hue", () => {
  it("chooses the SHAPE from kind, not a colour", () => {
    expect(block).toMatch(/m\.kind === "HVN"/);
    expect(block).toMatch(/fillRect|strokeRect/);
  });

  it("HVN is filled, LVN is hollow — fill/weight law, not hue", () => {
    // Filled = the market lingered here; hollow = a level nobody chose.
    // Absence rendered as an outline, not as a value.
    //
    // The primitive changed with H-703's histogram: annotation dots use
    // arc + fill (HVN) vs arc + stroke (LVN) rather than rect. The rule is
    // the same — one is a filled disc, the other is a ring.
    expect(block).toMatch(/ctx\.arc\(/);
    expect(block).toMatch(/ctx\.fill\(\)/);
    expect(block).toMatch(/ctx\.stroke\(\)/);
  });

  it("spends no green and no red on the marks", () => {
    const rgbas = [...block.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)];
    expect(rgbas.length, "no literal colours found — did the block move?").toBeGreaterThan(0);
    for (const m of rgbas) {
      const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
      expect(g > r && g > b, `green-dominant colour on the marks: ${m[0]}`).toBe(false);
      expect(r > g * 1.6 && r > b * 1.6, `red-dominant colour on the marks: ${m[0]}`).toBe(false);
    }
  });
});

describe("the trader can quiet this layer, and the chart says WHICH silence it is", () => {
  it("a switched-off layer paints NOTHING", () => {
    expect(block).toMatch(/if \(on && lp\?\.drawn\) \{/);
  });

  it("reads the switch from a REF, never from the overlay's dependency array", () => {
    expect(block).toMatch(/const on = layerOnRef\.current\.livingProfile/);
    const deps = CHART.slice(CHART.lastIndexOf("}, [footprintType"));
    expect(deps.slice(0, 400)).not.toMatch(/livingProfileOnChart/);
  });

  it("the switch travels as its OWN prop, not as a null verdict", () => {
    expect(CHART).toMatch(/livingProfileOnChart\?: boolean/);
    expect(ROOM).toMatch(/livingProfileOnChart=\{livingProfileOn\}/);
  });

  it("OFF and NO_READING are different words in the receipt", () => {
    expect(block).toMatch(/ds\.livingProfile = on \? \(lp \? lp\.reason : "NO_READING"\) : "OFF"/);
  });
});

describe("the layer publishes a receipt in every state", () => {
  it("stamps the reason even when nothing is painted", () => {
    expect(block).toMatch(/ds\.livingProfile = on \?/);
  });

  it("withdraws ancillary receipts on OFF or when unpainted", () => {
    expect(block.match(/delete ds\.livingProfileMarks/g)?.length).toBeGreaterThanOrEqual(2);
    expect(block.match(/delete ds\.livingProfileUntraded/g)?.length).toBeGreaterThanOrEqual(2);
  });
});

describe("the Living level names never run under the price axis", () => {
  // Serving TSLA 1h desktop, 2026-09-25: solo, "VAH / POC / VAL" printed right
  // of the lane and the axis cut them to "VA" / "PO".
  it("every Living level is a chip right-aligned INSIDE the plot edge (P-110 / M47)", () => {
    // Pin updated 2026-09-25 (P-110 canon pass): no word right of the lane at
    // all any more — every level is the family's gold chip, right-aligned to
    // the plot's edge less LEVEL_CHIP_EDGE_GAP, so no chip can run under the axis.
    expect(block).not.toContain("ctx.fillText(text, rightEdge + 4, +yr);");
    expect(block).toMatch(/levelChip\(\+yr, text, ink\);\s*livingChips\+\+;/);
    expect(block).toContain("ds.livingProfileLabels = `CHIPS:${livingChips}`;");
    expect(CHART).toContain("const rightX = opts.leftX != null ? opts.leftX + cw : opts.rightX ?? plotRight - LEVEL_CHIP_EDGE_GAP;");
    expect(CHART).toMatch(/"livingProfileCandlesKept", "livingProfileLabels",/);
  });
});
