/**
 * THE WAIT ORGANISM HAS ONE OWNER — H-101 / F05A / F06A.
 *
 * 2026-09-25: the decision rail stopped resting as four cards and became ONE
 * plaque, and the chart grew H-101's brass DEBT TAG on the event bar. Both are
 * new PIXELS for an old decision, and new pixels are exactly how a second
 * decision owner sneaks in: a tag that decides for itself when to say WAIT, a
 * plaque with its own idea of the standing, a room that picks "the newest
 * candle" because the event bar was inconvenient.
 *
 * This file pins the wiring so none of that can happen quietly:
 *
 *   (a) the room COMPOSES the tag from the compiler's reading and the canonical
 *       event bar, and hands it to the primary chart only;
 *   (b) the chart places it through the keep-out owner, prints the compiled
 *       word (never a literal), and names its state in every frame;
 *   (c) the rail reads the plaque from one selector call, draws the word once,
 *       and holds no decision state of its own.
 *
 * A breadcrumb, not a renderer. It reads source. The behaviour is proven in
 * selectWaitPlaque.test.ts and DecisionSpineBand.test.tsx.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const CHART = strip(read("src/components/chart/MainChart.tsx"));
const ROOM = strip(read("src/components/chart/ChartsDashboard.tsx"));
const RAIL = strip(read("src/components/experience/DecisionSpineBand.tsx"));

function tagBlock(): string {
  const a = CHART.indexOf("const tagT = debtTagRef.current;");
  const receipts = CHART.indexOf("canvas.dataset.attentionTiers = att.tiersReceipt();");
  // The paper/broker price-line words (2026-09-26) paint right after the tag,
  // so they step around it; the tag's block ends where theirs begins.
  const b = CHART.indexOf("const wordsP = [...priceLineWordsRef.current.paper");
  expect(a, "the H-101 tag block is missing").toBeGreaterThan(-1);
  expect(b, "the tag must paint before the price-line words").toBeGreaterThan(a);
  expect(receipts, "the tag must paint before the frame's receipts").toBeGreaterThan(b);
  return CHART.slice(a, b);
}

describe("(a) the room composes the tag — it never decides one", () => {
  it("reads the compiler's reading and the canonical event bar, with the one replay owner", () => {
    const call = ROOM.slice(ROOM.indexOf("const debtTagOnChart = selectDebtTag({"));
    expect(call.length, "the room no longer composes the tag").toBeLessThan(ROOM.length);
    const body = call.slice(0, call.indexOf("});"));
    expect(body).toContain("decision: chartCanvasVM.oneStory?.decision ?? null");
    expect(body).toContain("debt: chartCanvasVM.oneStory?.debt ?? null");
    // THE EVENT IS THE LEDGER'S BAR — never "the newest candle" guessed here.
    expect(body).toContain("eventBarOpenedAtMs: chartCanvasState?.lastBar?.barOpenedAtMs ?? null");
    expect(body).toContain("replayEngaged: cameraWalksHistory");
  });

  it("F06A's context under the plaque reads the room's ONE aggressor snapshot, guarded by symbol", () => {
    expect(ROOM).toContain(
      "flowContext: selectPlaqueFlowContext(chartFlowSnap, { symbolOwnsTape: tickerOwner === symbol }),",
    );
    // One snapshot of the tape in this room — the fidelity chip reads the same.
    expect(ROOM.match(/selectAggressorFlow\(/g) ?? []).toHaveLength(1);
  });

  it("hands it to the primary chart only — the compare and pinned panes carry no decision", () => {
    expect(ROOM.match(/debtTagOnChart=\{debtTagOnChart\}/g) ?? []).toHaveLength(1);
    const mount = ROOM.indexOf("debtTagOnChart={debtTagOnChart}");
    const permission = ROOM.indexOf("permissionOnChart={chartCanvasVM.oneStory.debt ?");
    // Beside the compiler's other reading on the same <MainChart>.
    expect(Math.abs(mount - permission)).toBeLessThan(900);
  });
});

describe("(b) the chart places and draws — it decides nothing", () => {
  it("the prop is the compiled VM type, held in a ref the frame reads", () => {
    expect(CHART).toContain('debtTagOnChart?: import("@/lib/marketData/viewModels/selectWaitPlaque").DebtTagVM | null;');
    expect(CHART).toContain("debtTagRef.current = debtTagOnChart;");
  });

  it("finds the event bar by the compiled time and prints the compiled word — never a literal", () => {
    const block = tagBlock();
    expect(block).toContain("=== tagT.barTimeSec");
    expect(block).toContain("ctx.fillText(tagT.word,");
    expect(block).not.toMatch(/fillText\(\s*["'`]WAIT/);
    // No verdict logic of its own.
    expect(block).not.toMatch(/\.value\s*===\s*"WAIT"|missing\s*>\s*0|selectWaitStanding|computeRightOfWay/);
  });

  it("places through the keep-out owner and joins the chip ledger", () => {
    const block = tagBlock();
    // 2026-09-27: every candle body on its candidate rows and every MarketObject
    // pin are kept out too (the plate read "◆AIT" on a pin) — same owner.
    expect(block).toMatch(/placeClearOfKeepOut\(below, \[\.\.\.keepOut\(\), \.\.\.rowBodiesAt\(/);
    expect(block).toContain("blockers: [...floatingChips, ...marketObjectPinRectsRef.current]");
    expect(block).toContain("strict: true");
    expect(block).toContain("recordKeepOut(keepOutLedger, spotT);");
    expect(block).toContain("floatingChips.push({ x: spotT.rect.x, y: spotT.rect.y, w: spotT.rect.w, h: spotT.rect.h });");
    // A plate the owner could not clear yields instead of hiding the candle.
    expect(block).toContain("if (!spotT.onCandles) {");
  });

  it("names its state in every frame — silence is a receipt, not a gap", () => {
    const block = tagBlock();
    expect(block).toContain('let tagState: "NONE" | "OFF_CAMERA" | "DRAWN" = "NONE";');
    // Unconditional: a statement of its own, not the tail of an `if`.
    expect(block).toMatch(/\n[ \t]*canvas\.dataset\.debtTag = tagState;/);
    // Published OUTSIDE the try, so a thrown frame still says what it is.
    // The G7 layer-isolation wrappers (`catch (err) { layerFault(...) }`) are
    // the frame's, not the tag's own try; they are set aside before comparing.
    const own = block.replace(/catch \(err\) \{ layerFault\("[A-Z0-9_]+", err\);/g, "");
    expect(own.indexOf("canvas.dataset.debtTag = tagState;")).toBeGreaterThan(own.lastIndexOf("catch"));
  });

  it("paints after the claimed layers, not inside them", () => {
    const tag = CHART.indexOf("const tagT = debtTagRef.current;");
    for (const marker of [
      // RE-AIMED 2026-09-26 (H-501 permission): the risk layer's off receipt
      // now names OFF vs SILENT:<depth> through the governor's offWord.
      "ds.riskOnPrice = att.offWord(",
      // RE-AIMED 2026-09-25 on rebase: the F08A liquidity rework (93b4a143)
      // retired the "LIQUIDITY LIFECYCLE" caption string from CODE (it now
      // survives only in a comment, which this scan strips), so the marker is
      // the layer's own identifier — its last receipt write — instead.
      "liquidityLifecycle",
    ]) {
      // The LAST occurrence: the block must follow every paint of that layer.
      const at = CHART.lastIndexOf(marker);
      expect(at, marker).toBeGreaterThan(-1);
      expect(tag, `the tag moved inside/before ${marker}`).toBeGreaterThan(at);
    }
  });
});

describe("(c) the rail draws the plaque — one owner, one word, no state", () => {
  it("reads the plaque from exactly one selector call, off the same verdict and ledger", () => {
    expect(RAIL.match(/selectWaitPlaque\(/g) ?? []).toHaveLength(1);
    // Garden 16 §31 (2026-09-26): the same verdict and ledger, plus the room's
    // own settled bar count, so a request that returned nothing is named
    // NO BAR HISTORY instead of a ledger node. Still one call, still no state.
    expect(RAIL).toMatch(/selectWaitPlaque\(\n\s*nowDecision,\n\s*oneStory \? oneStory\.debt : null,\n\s*market\.barsSettled === true && typeof market\.barsInHand === "number" \? \{ settled: true, bars: market\.barsInHand \} : null,\n\s*\)/);
  });

  it("draws the state word exactly once, under the one claim const", () => {
    expect(RAIL.match(/data-testid="spine-now-state"/g) ?? []).toHaveLength(1);
    expect(RAIL).toMatch(/\{surfaceOwnsVerdict && nowDecision \?[\s\S]{0,120}?data-testid="spine-now-state"/);
  });

  it("holds no decision state of its own", () => {
    expect(RAIL).not.toMatch(/\buse(State|Reducer)\s*\(/);
    expect(RAIL).not.toMatch(/computeRightOfWay\s*\(|computeEvidenceDebt\s*\(/);
  });
});
