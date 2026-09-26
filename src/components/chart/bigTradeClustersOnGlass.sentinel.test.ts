/**
 * F07B · BIG TRADES ARE CLUSTERED BEFORE THEY PAINT — 2026-09-26.
 *
 * Serving (BTC-USD 1m, MID ≈43 bars, 03:55 CDT): four prints within one
 * minute at ~84209–84211 were four gold discs drawn on top of each other at
 * the live edge; their inscriptions overprinted. GP12 §64 "Merge labels",
 * §60 "Actual time. Actual price. … Selectable. Inspectable."
 *
 * The rule lives in footprintCanon.clusterBigTrades (bigTradeClusters.test.ts).
 * This breadcrumb pins the canvas to it: every Big Trades pixel after the
 * cull is painted from the cluster owner's discs, the overlap receipt is
 * computed from what was actually drawn, and hover/click hit-test the same
 * discs so a cluster is one target whose members open in Inspect.
 *
 * A breadcrumb, not a renderer: it reads source, and every slice asserts its
 * landmarks so a rename fails loudly instead of guarding nothing.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

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

/** From the cluster step to the end of the ON branch. */
const painted = () => slice("const bigClusters = clusterBigTrades<BigClusterInput>(", "canvas.dataset.bigTradeBubbleCount = \"0\";");
const drawLoop = () => slice("for (const b of [...bigDiscs].sort(", "canvas.dataset.bigTradesDrawn = String(bigDrawn);");

describe("the paint clusters the frame's prints through the one owner", () => {
  it("every print after the cull goes to clusterBigTrades at its TARGET radius and claimed size, capped by the size owner", () => {
    const cull = CODE.indexOf("bubblesRef.current = survivors.length > cap");
    const cluster = CODE.indexOf("const bigClusters = clusterBigTrades<BigClusterInput>(bubblesRef.current.map(b => ({");
    expect(cull).toBeGreaterThan(-1);
    expect(cluster).toBeGreaterThan(cull);
    const p = painted();
    expect(p).toContain("key: b.spawnKey, x: b.x, y: b.y, r: b.baseR, size: Math.abs(b.value),");
    expect(p).toContain("timeSec: b.anchorTime, barTime: b.anchorBarTime, price: b.anchorPrice, bid: b.bid, ask: b.ask, b,");
    expect(p).toContain("})), { maxR: BIG_TRADE_MAX_R });");
    expect(CODE.match(/clusterBigTrades</g) ?? []).toHaveLength(1);
  });

  it("a lone print is its own bubble; a cluster disc takes the owner's centre, radius and summed claim", () => {
    const p = painted();
    expect(p).toContain("if (c.members.length === 1) return c.members[0].b;");
    expect(p).toContain("x: c.x, y: c.y,");
    expect(p).toContain("baseR: c.r,");
    expect(p).toContain("r: clusterRadius(c.members.map(m => m.b.r), BIG_TRADE_MAX_R),");
    expect(p).toContain("value: (side === \"buy\" ? 1 : -1) * c.size,");
    expect(p).toContain("spawnKey: c.key,");
  });

  it("after the cluster step no Big Trades pixel reads the raw prints — paths, discs, callout all read the discs", () => {
    const p = painted();
    // (The per-PRINT receipts above this — count, top, oldest — speak for the
    // prints on purpose; the pixels start at the hover read.)
    const from = p.indexOf("const hoverId = bubbleHoverRef.current;");
    expect(from).toBeGreaterThan(p.indexOf("canvas.dataset.bigTradeClusters ="));
    const afterReceipts = p.slice(from, p.indexOf("if (effectiveFP === \"big-trades\") {"));
    // Positive control: the region holds the draw loop and the callout.
    expect(afterReceipts).toContain("pickBigTradeCallout(");
    expect(afterReceipts).toContain("fitBubbleInscription(");
    expect(afterReceipts).not.toMatch(/bubblesRef\.current/);
    expect(afterReceipts).toContain("const byClaim = [...bigDiscs].sort(");
  });

  it("the membrane breathes by the owner's constant, which the touch rule already counts", () => {
    expect(drawLoop()).toContain("const wob = 1 + Math.sin(t) * BIG_TRADE_BREATH;");
    expect(drawLoop()).not.toMatch(/Math\.sin\(t\) \* 0\.\d/);
  });

  it("a cluster disc writes TOTAL ×n and its anchor price (the member count reaches the inscription owner)", () => {
    expect(drawLoop()).toContain("bigClusterOf.get(b.spawnKey)?.members.length ?? 1), measureInscription);");
  });

  it("the one callout is offered only discs, and names a cluster as a cluster", () => {
    const c = slice("const calloutDepth = semanticDensity.depth;", "canvas.dataset.bigTradeCallout = calloutReceipt;");
    expect(c).toContain("bigDiscs.map(b => ({ key: b.spawnKey,");
    expect(c).toContain("cluster: bigClusterOf.has(b.spawnKey) ? { n: bigClusterOf.get(b.spawnKey)!.members.length, total: Math.abs(b.value) } : null,");
  });
});

describe("receipts: bigTradeClusters and bigTradeOverlaps", () => {
  it("bigTradeClusters counts the multi-print clusters and their members", () => {
    expect(painted()).toContain("canvas.dataset.bigTradeClusters = `${bigClusterOf.size}/${[...bigClusterOf.values()].reduce((s, c) => s + c.members.length, 0)}`;");
  });

  it("bigTradeOverlaps is measured from every disc and quiet ring actually drawn, after the loop", () => {
    const d = drawLoop();
    expect(d).toContain("drawnDiscs.push({ x: b.x, y: b.y, r: rq });");
    expect(d).toContain("drawnDiscs.push({ x: b.x, y: b.y, r: Math.max(Rx, Ry) });");
    const receipt = CODE.indexOf("canvas.dataset.bigTradeOverlaps = String(countCircleOverlaps(drawnDiscs));");
    expect(receipt).toBeGreaterThan(CODE.indexOf("drawnDiscs.push({ x: b.x, y: b.y, r: Math.max(Rx, Ry) });"));
    expect(receipt).toBeLessThan(CODE.indexOf("canvas.dataset.bigTradesDrawn = String(bigDrawn);"));
  });

  it("both receipts are withdrawn when the layer stops", () => {
    const off = slice("bigTradeFrameRef.current = { discs: [], clusters: new Map(), intervalSec: 60 };", "const dsFp = canvas.dataset;");
    expect(off).toContain("\"bigTradeClusters\", \"bigTradeOverlaps\"] as const) delete canvas.dataset[k];");
  });
});

describe("hover and click hit-test the discs that were drawn", () => {
  it("the frame publishes its discs and clusters once, and the OFF branch clears them", () => {
    expect(CODE.match(/bigTradeFrameRef\.current = \{ discs: bigDiscs, clusters: bigClusterOf, intervalSec: intervalSec \?\? 60 \};/g) ?? []).toHaveLength(1);
    expect(CODE).toContain("bigTradeFrameRef.current = { discs: [], clusters: new Map(), intervalSec: 60 };");
  });

  it("a click on a cluster selects the CLUSTER through the one onSelectBigTrade path, with its members, rank and bar dots", () => {
    const click = slice("const bigFrame = bigTradeFrameRef.current;", "const tapeHit = ");
    expect(click).toContain("const hit = [...bigFrame.discs, ...deltaBubblesRef.current].reverse().find(");
    expect(click).not.toMatch(/\[\.\.\.bubblesRef\.current, \.\.\.deltaBubblesRef\.current\]/);
    expect(click).toContain("const rankC = sessionSizePercentile(hitCluster.size, accC.values());");
    expect(click).toContain("barDots: clusterBarDots(hitCluster.barTimes, bigFrame.intervalSec),");
    expect(click.match(/onSelectBigTrade\?\.\(/g) ?? []).toHaveLength(2);
  });

  it("hover reads the same discs", () => {
    expect(CODE).toContain("const bubbles = [...bigTradeFrameRef.current.discs, ...deltaBubblesRef.current];");
    expect(CODE).not.toContain("const bubbles = [...bubblesRef.current, ...deltaBubblesRef.current];");
  });
});
