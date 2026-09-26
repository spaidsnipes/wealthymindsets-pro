/**
 * PRINT EVIDENCE ON THE GLASS — Big Trades, the NEAR important-print tickets,
 * the NEAR per-bar delta row and the FORCE → RESPONSE causal marks.
 *
 * Each of these paints a claim about a real execution: when it happened, which
 * side initiated it, and what price did afterwards. The canvas only projects;
 * the words and numbers come from their owners (bubbleClaim,
 * aggressorProvenanceNote, selectPrintResponse). These breadcrumbs guard the
 * seams where the canvas used to restate an owner, or state more than the
 * evidence carries.
 *
 * A breadcrumb, not a renderer. It reads source. Every block extractor asserts
 * it found its landmarks, so a rename fails loudly instead of guarding nothing.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const RAW = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "").replace(/[ \t]\/\/ .*$/gm, "");

const slice = (from: string, to: string): string => {
  const a = RAW.indexOf(from);
  expect(a, `landmark not found: ${from}`).toBeGreaterThan(-1);
  const b = RAW.indexOf(to, a + from.length);
  expect(b, `landmark not found after ${from}: ${to}`).toBeGreaterThan(a);
  return strip(RAW.slice(a, b + to.length));
};

/** The Big Trades paint pass, through its OFF branch. */
const bigTrades = () => slice("const BIG_TRADE_FULL = 5;", 'canvas.dataset.bigTradeBubbleStatus = "OFF";');

describe("a print's time is stated in the axis's zone", () => {
  it("the inscription formats through the zone-aware owner", () => {
    const b = bigTrades();
    const uses = b.match(/formatBubbleClock\(b\.anchorTime, tzRef\.current, clock24hRef\.current\)/g) ?? [];
    // Positive control: the in-bubble TIME line (F07A). 2026-09-25: the NEAR
    // ticket that carried the second use is gone — the time lives inside the
    // disc, the G04 callout names side / size / rank, never a second clock.
    expect(uses.length).toBe(1);
  });

  it("no unlabelled UTC clock is printed from the execution time", () => {
    const b = bigTrades();
    expect(b).toContain("anchorTime");
    expect(b).not.toMatch(/toISOString\(\)\.slice\(11/);
  });
});

/**
 * THE ONE G04 CALLOUT. 2026-09-25 (footprint canon): the NEAR "important
 * print" tickets — up to three boxed "time · price / size @ ASK" cards per
 * frame — overlapped each other, the candles and the bubbles on serving. They
 * are replaced by at most ONE gold leader callout (G04), the rest living inside
 * the discs (F07A) and in Inspect. What these pins held for the tickets — on
 * the plot, inside pane 0, the side in its owner's words — they hold for it.
 */
const callout = () => slice("const calloutDepth = semanticDensity.depth;", "canvas.dataset.bigTradeCallout = calloutReceipt;");

describe("the one G04 callout stays on the plot, clear of the candles, in its owners' words", () => {
  it("is chosen once, by the callout owner, from the frame's one depth", () => {
    const b = bigTrades();
    expect(b.match(/pickBigTradeCallout\(/g) ?? []).toHaveLength(1);
    // 2026-09-26 (F07B clusters): the one selection is located on this
    // frame's DISCS first — a selected print inside a cluster selects its
    // cluster — so the callout receives that disc's key. Candidates are the
    // discs, never a cluster's members.
    expect(callout()).toContain("{ depth: calloutDepth, selectedKey: selDiscKey, hoveredKey },");
    expect(callout()).toContain("bigDiscs.map(b => ({ key: b.spawnKey, magnitude: Math.abs(b.value),");
    expect(slice("const bigClusters = clusterBigTrades<BigClusterInput>(", "const BIG_TRADE_FULL = 5;"))
      .toContain("const selDiscKey = clusterHolding(bigClusters, selectedBubbleKey)?.key ?? null;");
  });

  // Carried from the NEAR builder's ticket gate (2026-09-25: "three tickets
  // at rest were the knot of boxed numbers by the price axis"): at NEAR the
  // print's words come ONLY for the selected or hovered print. The owner says
  // NEAR_QUIET otherwise (footprintCanon.test.ts), and the canvas hands it
  // exactly those two keys — never a rank.
  it("at NEAR the callout is words on selection or hover, never at rest", () => {
    const b = callout();
    // 2026-09-26 (F07B clusters): hover is read off the drawn discs.
    expect(b).toContain("const hoveredKey = hoverId != null ? bigDiscs.find(b => b.id === hoverId)?.spawnKey ?? null : null;");
    expect(b).not.toMatch(/bubbleRank|BIG_TRADE_FULL/);
  });

  it("is placed by the keep-out owner: clear of every body in view, the header band, the plot, pane 0 and every chip", () => {
    const b = callout();
    expect(b).toMatch(/const bodies = spanCandleKeepOut\(barsRef\.current \?\? \[\], \{/);
    expect(b).toMatch(/const spot = pickSlotClearOfKeepOut\(\s*bigTradeCalloutSlots\(b, \{ w: cw, h: chh \}\),\s*bodies,/);
    expect(b).toContain("s => s.x < 4 || s.x + s.w > plotRight - 4 || s.y < HEADER_FLOOR_Y || s.y + s.h > pane0Bottom - 4 || rectHits(s, forceChips) > 0,");
    // Nowhere clear is said, never forced.
    expect(b).toContain('calloutReceipt = "NONE:NO_ROOM";');
    // A backing that still sits on a protected body yields.
    expect(b).toContain("keepOutBackingAlpha(spot, 0.92)");
  });

  it("registers itself as an obstacle after it paints", () => {
    const b = callout();
    const paint = b.indexOf("ctx.fillRect(r.x, r.y, r.w, r.h);");
    const push = b.indexOf("forceChips.push({ x: r.x, y: r.y, w: r.w, h: r.h });");
    expect(paint).toBeGreaterThan(-1);
    expect(push).toBeGreaterThan(paint);
  });

  it("says side, size and rank in the owners' words — never its own", () => {
    const b = callout();
    expect(b).toMatch(/const rank = sessionSizePercentile\(Math\.abs\(b\.value\), bigTradePrintAccRef\.current\.values\(\)\);/);
    expect(b).toContain("const words = bigTradeCalloutLines({");
    expect(b).toContain("priceText: b.anchorPrice.toFixed(pxDp)");
    expect(b).not.toMatch(/AGGRESSIVE|SIDE INFERRED|PERCENTILE/);
  });

  it("no boxed print tickets remain", () => {
    const b = bigTrades();
    expect(b).not.toMatch(/printTickets|ticketBusy|importantPrintTickets/);
  });
});

/** The NEAR per-bar delta row. */
// Landmark is the row's depth read — the frame's one semantic-zoom owner.
const deltaRow = () => slice("const depthD = semanticDensity.depth;", "/* camera mid-transition */");

describe("the NEAR delta row sits in pane 0, on the volume band's edge", () => {
  it("is anchored to pane0Bottom and the volume scale's top margin, not the container height", () => {
    const b = deltaRow();
    expect(b).toContain('chart.priceScale("vol").options().scaleMargins?.top');
    expect(b).toMatch(/const yD = Math\.max\(20, pane0Bottom \* volTop - 8\);/);
    expect(b).not.toMatch(/\bH\s*-\s*axisHD\b/);
    expect(b).not.toMatch(/\bH\b/);
  });

  it("counts only labels on the plot", () => {
    const b = deltaRow();
    expect(b).toMatch(/if \(xr == null \|\| \+xr < 0 \|\| \+xr > plotRight\) continue;/);
    expect(b).toContain("printed++");
  });
});

describe("the NEAR delta row never overprints itself or an earlier chip", () => {
  it("measures every label and thins to one bar in k when the bars are closer than a label", () => {
    const b = deltaRow();
    expect(b).toContain("w: ctx.measureText(text).width");
    expect(b).toMatch(/const strideD = Math\.max\(1, Math\.ceil\(\(maxWD \+ 6\) \/ Math\.max\(1, bsp\)\)\);/);
    // A cadence fixed to bar time, not to the newest visible bar.
    expect(b).toMatch(/Math\.round\(r\.t \/ stepD\) % strideD !== 0\) continue;/);
  });

  it("skips a label that touches its neighbour or a chip, and registers what it draws", () => {
    const b = deltaRow();
    const guard = b.indexOf("if (lx < lastRightD || hitD(lx, ly, lw, lh)) continue;");
    const draw = b.indexOf("ctx.fillText(r.text, r.x, yD);");
    const push = b.indexOf("forceChips.push({ x: lx, y: ly, w: lw, h: lh });");
    expect(guard).toBeGreaterThan(-1);
    expect(draw).toBeGreaterThan(guard);
    expect(push).toBeGreaterThan(draw);
    expect(b).toMatch(/const hitD = [^;]*forceChips\.some\(/);
  });

  it("says when bars were left out, and does not print the row without saying so", () => {
    const b = deltaRow();
    expect(b).toContain("1 IN ${strideD} BARS");
    expect(b).toContain("if (tagX != null && pickD.length) {");
    expect(b).toContain("forceChips.push({ x: tagX, y: tagY, w: tagW, h: 12 });");
  });

  it("the row's receipts are withdrawn when no row is drawn", () => {
    const b = deltaRow();
    for (const k of ["nearBarDeltaStride", "nearBarDeltaBasis"]) {
      const sets = b.match(new RegExp(`canvas\\.dataset\\.${k} = `, "g")) ?? [];
      const dels = b.match(new RegExp(`delete canvas\\.dataset\\.${k};`, "g")) ?? [];
      expect(sets.length, k).toBe(1);
      expect(dels.length, k).toBe(2);
    }
  });
});

describe("the NEAR delta row states how its sides were known", () => {
  it("classifies each contributing print by the flow owner's rule and combines weakest-link", () => {
    const b = deltaRow();
    expect(b).toContain("const accD = bigTradePrintAccRef.current;");
    expect(b).toContain("const p = aggressorProvenanceOf(pr.aggressorMethod);");
    expect(b).toContain("const basisD = weakestAggressorProvenance(sawP, sawI, sawU);");
    // Only prints that moved the sums count toward the basis.
    expect(b).toContain("if (!(pr.bid > 0 || pr.ask > 0)) continue;");
  });

  it("prints the provenance owner's chip in the row's tag, never its own words", () => {
    const b = deltaRow();
    expect(b).toContain("const chipD = aggressorProvenanceNote(basisD)?.chip;");
    expect(b).toMatch(/const tagD = `Δ\$\{chipD \? ` · \$\{chipD\}` : ""\}/);
    expect(b).not.toContain("SIDE INFERRED");
  });

  it("reads only the prints that arrived since the last frame", () => {
    const b = deltaRow();
    expect(b).toContain("for (; e.n < prints.length; e.n++) {");
    expect(b).toMatch(/deltaBasisCache\?\.acc !== accD/);
    expect(b).not.toMatch(/\.flatMap\(|\.sort\(/);
  });
});

describe("the five full bubbles are the five largest prints, not the five grown furthest", () => {
  it("ranks by the claimed magnitude, never by the animated radius", () => {
    const b = bigTrades();
    // 2026-09-26 (F07B clusters): the ranking loop runs over the cluster
    // owner's discs; a cluster ranks by its members' summed claim (`value`).
    const loops = b.match(/for \(const b of \[\.\.\.bigDiscs\]\.sort\(\(a, z\) => .*\) \{/g) ?? [];
    expect(loops.length, "the ranking loop was renamed or removed").toBe(1);
    expect(loops[0]).toBe("for (const b of [...bigDiscs].sort((a, z) => Math.abs(z.value) - Math.abs(a.value))) {");
    expect(b).not.toMatch(/for \(const b of \[\.\.\.bubblesRef\.current\]\.sort\(/);
    // The hovered and the SELECTED print are never demoted to a quiet ring —
    // the selected object is loudest — and neither takes a rank from the five.
    expect(b).toContain("if (bubbleRank++ >= BIG_TRADE_FULL && hoverId !== b.id && !selB) {");
  });
});

/**
 * 2026-09-25 (footprint canon, F07A): a bubble's words live INSIDE the bubble.
 * The label that stepped OUT on a leader when it would overprint (and its
 * `bigTradeLabelsStaggered` receipt) is gone: what the chord cannot hold is
 * not written — the rest lives in Inspect. The disc itself is the obstacle.
 */
describe("a bubble's words never leave the bubble; the disc is an obstacle for later chips", () => {
  it("writes only the lines the chord holds, and registers the disc after painting it", () => {
    const b = bigTrades();
    expect(b).not.toMatch(/outside = true|bubbleLabelRects|labelX/);
    const fit = b.indexOf("const inscription = fitBubbleInscription(b.r, bigTradeInscriptionLines(b.r,");
    const write = b.indexOf("ctx.fillText(l.text, b.x, b.y + l.dy);");
    const reg = b.indexOf("forceChips.push({ x: b.x - b.r - 4, y: b.y - b.r - 4, w: 2 * b.r + 8, h: 2 * b.r + 8 });");
    expect(fit).toBeGreaterThan(-1);
    expect(write).toBeGreaterThan(fit);
    expect(reg).toBeGreaterThan(write);
  });
});

describe("Big Trades receipts are withdrawn when the layer stops", () => {
  it("the OFF branch withdraws every receipt the ON pass writes, beyond its count and status", () => {
    // 2026-09-26 (H-501 permission): the gate also asks the ONE permission table.
    const onStart = RAW.indexOf('if (effectiveFP === "big-trades" || (bigTradesOverlay && att.paints("bigTrades"))) {');
    const offStart = RAW.indexOf("// Left big-trades mode", onStart);
    // 2026-09-25: the footprint receipt now publishes right after this branch
    // (so it can count the bubbles); the OFF slice ends where it begins.
    const offEnd = RAW.indexOf("O-06 · THE FOOTPRINT RECEIPT", offStart);
    expect(onStart).toBeGreaterThan(-1);
    expect(offStart).toBeGreaterThan(onStart);
    expect(offEnd).toBeGreaterThan(offStart);
    const on = strip(RAW.slice(onStart, offStart));
    const off = strip(RAW.slice(offStart, offEnd));
    const written = new Set([...on.matchAll(/canvas\.dataset\.([A-Za-z0-9_]+)\s*=(?!=)/g)].map(m => m[1]));
    // Positive control: the ON pass's own receipts were found.
    expect(written.size).toBeGreaterThanOrEqual(8);
    // 2026-09-25: the canon's receipts (F07A discs, inscriptions, response
    // paths, the one G04 callout) replace the ticket / staggered-label ones.
    for (const k of ["bigTradesDrawn", "bigTradeInscribed", "responsePaths", "bigTradeCallout", "bigTradeCalloutSlot", "bigTradeQuieted"]) expect(written.has(k), k).toBe(true);
    expect(off).toContain("delete canvas.dataset[k];");
    const stated = new Set([...off.matchAll(/canvas\.dataset\.([A-Za-z0-9_]+)\s*=(?!=)/g)].map(m => m[1]));
    const listed = new Set([...off.matchAll(/"([A-Za-z0-9_]+)"/g)].map(m => m[1]));
    const missing = [...written].filter(k => !stated.has(k) && !listed.has(k));
    expect(missing).toEqual([]);
  });

  it("a selection that draws no envelope says NONE instead of keeping the last one", () => {
    const b = forceResponse();
    expect(b).toContain("let envelopeDrawn = false;");
    const set = b.indexOf("canvas.dataset.printEnvelope = pr.medianRange.toFixed(2);");
    const flag = b.indexOf("envelopeDrawn = true;");
    const none = b.indexOf('if (!envelopeDrawn) canvas.dataset.printEnvelope = "NONE";');
    expect(set).toBeGreaterThan(-1);
    expect(flag).toBeGreaterThan(set);
    expect(none).toBeGreaterThan(flag);
  });
});

/** The FORCE → RESPONSE pass on the selected print, through its no-selection branch. */
const forceResponse = () => slice("const sp = selectedPrintRef.current;", "delete canvas.dataset.printEnvelope;");

describe("the FORCE states the print's side as its claim owner does", () => {
  it("the side and its caption come from describeBubbleClaim, with the print's aggressorMethod", () => {
    const b = forceResponse();
    expect(b).toMatch(/describeBubbleClaim\(\{ kind: "big-trade", bid: sp\.bid, ask: sp\.ask, price: sp\.priceLevel, aggressorMethod: sp\.aggressorMethod \}\)/);
    expect(b).toContain("const side = claim.side;");
    expect(b).toMatch(/plate\(\["FORCE", `\(\$\{claim\.heading\}\)`\]/);
  });

  it("no caption in the block hard-codes AGGRESSIVE", () => {
    const b = forceResponse();
    expect(b).toContain('plate(["FORCE"');
    expect(b).not.toMatch(/AGGRESSIVE/);
  });

  it("an inferred side dashes the FORCE arrow and qualifies the RESPONSE", () => {
    const b = forceResponse();
    expect(b).toContain('const sideInferred = aggressorProvenanceOf(sp.aggressorMethod) === "INFERRED";');
    const dash = b.indexOf("ctx.setLineDash(sideInferred ? [6, 4] : []);");
    const shaft = b.indexOf("ctx.moveTo(ax0, ay0);");
    expect(dash).toBeGreaterThan(-1);
    expect(shaft).toBeGreaterThan(dash);
    expect(b).toMatch(/sideInferred \? \["vs an INFERRED side"\]/);
  });
});

describe("causal-mark plates stay in pane 0 and step off earlier chips", () => {
  const plateFn = () => {
    const b = forceResponse();
    const a = b.indexOf("const plate = (lines: string[], x: number, y: number, gold: boolean) => {");
    expect(a).toBeGreaterThan(-1);
    const z = b.indexOf("return { x: tx, y: ty, w: tw, h: th };", a);
    expect(z).toBeGreaterThan(a);
    return b.slice(a, z);
  };

  it("bounds the plate by the plot and pane 0, not the container", () => {
    const p = plateFn();
    expect(p).toContain("const tx = Math.max(4, Math.min(Math.min(W - 100, plotRight - 4) - tw, x));");
    expect(p).toContain("const hiY = Math.max(96, pane0Bottom - th - 4);");
  });

  it("searches for a free slot against forceChips before it paints, then registers itself", () => {
    const p = plateFn();
    expect(p).toMatch(/const busy = \(v: number\) => forceChips\.some\(/);
    const search = p.indexOf("for (let k = 1; k <= 3 && busy(ty); k++) {");
    const paint = p.indexOf("ctx.fillRect(tx, ty, tw, th);");
    const push = p.indexOf("forceChips.push({ x: tx, y: ty, w: tw, h: th });");
    expect(search).toBeGreaterThan(-1);
    expect(paint).toBeGreaterThan(search);
    expect(push).toBeGreaterThan(paint);
  });

  it("the DEBT leader starts from where its plate actually landed", () => {
    const b = forceResponse();
    const placed = b.indexOf("const debt = plate([\"UNPAID EVIDENCE DEBT\"");
    const leader = b.indexOf("ctx.moveTo(ex < debt.x ? debt.x : debt.x + debt.w, debt.y + debt.h / 2);");
    expect(placed).toBeGreaterThan(-1);
    expect(leader).toBeGreaterThan(placed);
  });
});

describe("the RESPONSE is graded on closed bars only", () => {
  it("names the still-forming bar by the header's close proof and hands it to the selector", () => {
    const b = forceResponse();
    expect(b).toMatch(/selectChartCloseLabel\(Number\(newestBar\.time\), timeframe, Date\.now\(\)\)\.forming/);
    expect(b).toMatch(/selectPrintResponse\([\s\S]{0,300}\{ formingBarTime \}\)/);
  });

  it("the response is recomputed only when the bars, the selection or the forming bar change", () => {
    const b = forceResponse();
    expect(b).toContain("const pr = cachedPr ?? selectPrintResponse(");
    expect(b).toMatch(/printResponseCache\.bars === respBars && printResponseCache\.sp === sp\s*&& printResponseCache\.formingBarTime === formingBarTime/);
    expect(b).toContain("if (!cachedPr) printResponseCache = { bars: respBars, sp, formingBarTime, vm: pr };");
    // No per-frame copy of the history to feed it.
    expect(b).toContain("respBars");
    expect(b).not.toMatch(/respBars\.map\(|barsRef\.current \?\? \[\]\)\.map\(/);
  });

  it("the RESPONSE arrow is drawn only on a final verdict with a published close", () => {
    const b = forceResponse();
    expect(b).toContain('if (pr.verdict !== "PENDING" && pr.endClose != null) {');
    expect(b).toContain("response bars closed");
  });
});
