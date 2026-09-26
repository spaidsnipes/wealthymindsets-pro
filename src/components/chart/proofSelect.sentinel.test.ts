/**
 * INSPECT OPENS BY URL, THROUGH THE ONE SELECTION — GP12 §68 (INSPECT = TRUTH
 * MICROSCOPE), 2026-09-26.
 *
 * The Founder's verifier can open a URL and take a screenshot, never click.
 * `select=zone|level|bar|bigtrade` (proofScene.ts) opens Inspect on one thing,
 * ONCE per page load, through `actOnChartSelection` — never a second selection
 * path — and, because a proof scene holds writes, the remembered selection in
 * session storage is neither read into nor written by it.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  CHART_SELECTION_AT_REST, releasesObject, selectChartSelection,
} from "@/lib/marketData/viewModels/chartSelection";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const read = (rel: string) => strip(readFileSync(path.join(process.cwd(), rel), "utf8"));
const ROOM = read("src/components/chart/ChartsDashboard.tsx");
const CHART = read("src/components/chart/MainChart.tsx");
const between = (src: string, from: string, to: string) => {
  const a = src.indexOf(from);
  expect(a, from).toBeGreaterThan(-1);
  const b = src.indexOf(to, a + from.length);
  expect(b, to).toBeGreaterThan(a);
  return src.slice(a, b);
};

describe("select= opens Inspect through the one selection owner", () => {
  const attempt = between(ROOM, "proofSelectAttemptRef.current = (kind) => {", "const proofSelectHeld");

  it("every kind selects through actOnChartSelection, never the raw reducer or a second state", () => {
    expect(attempt).toContain('actOnChartSelection({ type: "select", selection: { kind: "OBJECT", objectId: id } });');
    expect(attempt).toContain('actOnChartSelection({ type: "openInspect" });');
    expect(attempt).not.toContain("dispatchChartSelection");
    // A bar is the documented bar route (the cursor bar the ticket reads).
    expect(attempt).toContain("setCursorBar({ o: bar.open, h: bar.high, l: bar.low, c: bar.close, v: bar.volume, time: bar.time });");
    // A Big Trade goes through MainChart's own click path, which fires onSelectBigTrade.
    expect(attempt).toContain("return proofSelectBigTradeRef.current?.() ?? false;");
    expect(ROOM).toContain("proofSelectBigTradeRef={proofSelectBigTradeRef}");
    expect(ROOM).toMatch(/onSelectBigTrade=\{print => actOnChartSelection\(\{ type: "select", selection: \{ kind: "PRINT", print \} \}\)\}/);
  });

  it("applies ONCE per page load, after the bars exist", () => {
    expect(attempt).toContain("if (!proofSelectKind || !deskBarsReady || proofSelectDoneRef.current) return;");
    expect(attempt).toContain("}, [proofSelectKind, deskBarsReady]);");
    expect(attempt.match(/proofSelectDoneRef\.current = true;/g) ?? []).toHaveLength(2);
    // No storage of any kind in the proof path.
    expect(attempt).not.toMatch(/localStorage|sessionStorage/);
  });

  it("the receipt is read back from the owner's state", () => {
    const held = between(ROOM, "const proofSelectHeld", "}, [proofSelectKind, proofSelectSettled, proofSelectHeld]);");
    expect(held).toContain("return inspectOpen && selectedMarketObjectId ? selectedMarketObjectId : null;");
    expect(held).toContain("root.proofSelect = proofSelectReceipt(proofSelectKind, proofSelectHeld);");
  });

  it("a proof scene never reads or writes the remembered selection", () => {
    const memory = between(ROOM, "const selectionKey = `wm:selectedObject:", "useEffect(() => {\n    if (!absorptionAnatomy)");
    expect(memory).toMatch(/if \(!proofSceneHoldsWrites\(\)\) \{\s*try \{ saved = sessionStorage\.getItem\(selectionKey\);/);
    expect(memory).toMatch(/useEffect\(\(\) => \{\s*if \(proofSceneHoldsWrites\(\)\) return;\s*try \{ if \(selectedMarketObjectId\) sessionStorage\.setItem/);
    expect(memory).toContain("if (releasesObject(chartSelection, action) && !proofSceneHoldsWrites()) {");
    // Every storage call in the selection memory sits behind the proof gate.
    expect(memory.match(/sessionStorage\./g) ?? []).toHaveLength(3);
  });

  it("a proof select of an object opens Inspect on it and releases nothing", () => {
    const action = { type: "select", selection: { kind: "OBJECT", objectId: "ZONE-1" } } as const;
    expect(selectChartSelection(CHART_SELECTION_AT_REST, action))
      .toEqual({ selection: { kind: "OBJECT", objectId: "ZONE-1" }, inspectOpen: true });
    expect(releasesObject(CHART_SELECTION_AT_REST, action)).toBe(false);
    // Bar Inspect: an open ticket with nothing selected reads the bar.
    expect(selectChartSelection(CHART_SELECTION_AT_REST, { type: "openInspect" }))
      .toEqual({ selection: null, inspectOpen: true });
  });
});

describe("MainChart's big-trade click and the proof select share ONE hit path", () => {
  it("the click calls it at the pointer; the proof pins the largest drawn disc", () => {
    const click = between(CHART, "const handleCursorSelectUp = useCallback(", "const tapeHit = ");
    expect(click).toContain("if (selectBigTradeAt(x, y)) return;");
    const proof = between(CHART, "proofSelectBigTradeRef.current = () => {", "const handleCursorSelectUp");
    expect(proof).toContain("const bigFrame = bigTradeFrameRef.current;");
    expect(proof).toContain("return largest ? selectBigTradeAt(largest.x, largest.y, largest) : false;");
    expect(proof).not.toMatch(/onSelectBigTrade\?\.\(/);
    // One builder of the selected print for discs.
    expect(CHART.match(/const selectBigTradeAt = useCallback\(/g) ?? []).toHaveLength(1);
  });
});
