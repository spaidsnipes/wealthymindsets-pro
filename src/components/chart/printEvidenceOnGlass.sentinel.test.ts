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
  it("the inscription and the ticket format through the zone-aware owner", () => {
    const b = bigTrades();
    const uses = b.match(/formatBubbleClock\(b\.anchorTime, tzRef\.current, clock24hRef\.current\)/g) ?? [];
    // Positive control: both the in-bubble time and the NEAR ticket's first line.
    expect(uses.length).toBe(2);
  });

  it("no unlabelled UTC clock is printed from the execution time", () => {
    const b = bigTrades();
    expect(b).toContain("anchorTime");
    expect(b).not.toMatch(/toISOString\(\)\.slice\(11/);
  });
});

/** The NEAR important-print ticket. */
const ticket = () => slice('if (ticketDepth === "NEAR" && bubbleRank <= 3', "ctx.fillText(lines[1], tx + 8, ty + 24);");

describe("the important-print ticket stays on the plot and leads with its provenance", () => {
  it("clamps x to the plot and y to pane 0 after choosing a side", () => {
    const b = ticket();
    expect(b).toContain("const maxTX = plotRight - tw - 4, maxTY = pane0Bottom - th - 4;");
    const flip = b.indexOf("if (tx < 4) tx = b.x + b.r + 24;");
    const clampX = b.indexOf("tx = Math.max(4, Math.min(maxTX, tx));");
    expect(flip).toBeGreaterThan(-1);
    expect(clampX).toBeGreaterThan(flip);
    expect(b).toMatch(/if \(ty > maxTY\) \{ ty = maxTY; for \(let k = 0; k < 4 && ticketBusy\(ty\); k\+\+\) ty -= th \+ 6; \}/);
  });

  it("puts the side's provenance before the size, in the owner's words", () => {
    const b = ticket();
    expect(b).toContain('const sideNote = provT === "INFERRED" ? aggressorProvenanceNote(provT)?.chip : null;');
    expect(b).toContain("`${sideNote ? `${sideNote} · ` : \"\"}${formatBubbleVolume(size)} @ ${buy ? \"ASK\" : \"BID\"}`");
    expect(b).not.toContain("SIDE INFERRED");
  });
});

/** The NEAR per-bar delta row. */
const deltaRow = () => slice("const depthD = semanticDensityForBarCount(nD).depth;", "/* camera mid-transition */");

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
