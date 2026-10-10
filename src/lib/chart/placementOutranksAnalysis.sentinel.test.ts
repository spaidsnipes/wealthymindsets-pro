/**
 * PLACEMENT OUTRANKS ANALYSIS — sentinel (Founder P0 2026-10-10: "highlighted
 * demand zones, boxes and other chart objects intercept pointer interactions
 * and prevent me from placing a stop-loss at the intended price").
 *
 * A source breadcrumb beside the pure tests in chartInteractionMode.test.ts.
 * Fails if any analytical-layer handler in MainChart can run while a placement
 * (armed pick / draft-line drag) or an execution confirmation owns the pointer:
 *   A. a market-object / wall / profile / anatomy / weather / ghost / bar
 *      selection is reachable without passing `mayRunAnalyticalHandler` first;
 *   B. the hover tip, the crosshair hover cards, or the weather lens can open
 *      or grab without the gate;
 *   C. an analytical DOM layer in the pane is missing its `data-analytical-layer`
 *      mark, or globals.css stops turning marked layers inert;
 *   D. the armed pick goes back to testing "inside the lightweight-charts host
 *      and not a button" (the defect: a zone pin swallowed the stop);
 *   E. the draft-line drag stops holding PLACEMENT, or the ticket's
 *      confirmation stops holding EXECUTION.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(path.join(SRC, rel), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

const RAW = read("components/chart/MainChart.tsx");
const MAIN = strip(RAW);
const GLOBALS = read("app/globals.css");
const PANEL = strip(read("components/chart/TradePanel.tsx"));
const STORE = strip(read("lib/execution/chartOrderLines.ts"));

/** [start, end) of the balanced block that follows `signature`. */
function span(src: string, signature: string): [number, number] {
  const at = src.indexOf(signature);
  expect(at, `${signature} not found`).toBeGreaterThan(-1);
  let depth = 0;
  for (let i = src.indexOf("{", at); i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return [at, i + 1];
  }
  return [at, src.length];
}
const body = (src: string, sig: string) => { const [a, b] = span(src, sig); return src.slice(a, b); };

describe("the sources are really read", () => {
  it("MainChart, globals.css, TradePanel and the store are non-trivial", () => {
    expect(RAW.length).toBeGreaterThan(100_000);
    expect(GLOBALS.length).toBeGreaterThan(1_000);
    expect(PANEL.length).toBeGreaterThan(5_000);
    expect(STORE.length).toBeGreaterThan(2_000);
  });
});

describe("A. no market selection without the gate", () => {
  const up = span(MAIN, "const handleCursorSelectUp = useCallback(");
  const bigTrade = span(MAIN, "const selectBigTradeAt = useCallback(");
  it("the click-to-select path asks the gate before its first hit-test", () => {
    const b = MAIN.slice(up[0], up[1]);
    const gate = b.indexOf('mayRunAnalyticalHandler(');
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(b.indexOf("hitTestDrawing("));
    expect(gate).toBeLessThan(b.indexOf("onSelect"));
    const down = body(MAIN, "const handleCursorSelectDown = useCallback(");
    expect(down).toMatch(/if \(!mayRunAnalyticalHandler\("[A-Z_]+"\)\) \{ cursorDownRef\.current = null; return; \}/);
  });
  it("every onSelect* call sits behind the gate", () => {
    const re = /onSelect[A-Za-z]+\??\.?\(/g;
    const ungated: string[] = [];
    for (let m = re.exec(MAIN); m; m = re.exec(MAIN)) {
      const at = m.index;
      if (at > up[0] && at < up[1]) continue;
      if (at > bigTrade[0] && at < bigTrade[1]) continue;
      // Otherwise the gate must stand in the same handler, just before the call.
      const before = MAIN.slice(Math.max(0, at - 1200), at);
      if (/mayRunAnalyticalHandler\("[A-Z_]+"\)/.test(before)) continue;
      ungated.push(MAIN.slice(at, at + 60));
    }
    expect(ungated).toEqual([]);
  });
  it("selectBigTradeAt is called only from the gated click path and the proof seam", () => {
    const calls = [...MAIN.matchAll(/selectBigTradeAt\(/g)].map(m => m.index!);
    for (const at of calls) {
      const inUp = at > up[0] && at < up[1];
      const proof = MAIN.slice(Math.max(0, at - 400), at).includes("proofSelectBigTradeRef.current = ");
      const def = MAIN.slice(at - 30, at).includes("const ");
      expect(inUp || proof || def, MAIN.slice(at - 80, at + 40)).toBe(true);
    }
  });
});

describe("B. hover cards and the lens are gated", () => {
  it("the bubble hover tip returns before it can open", () => {
    const b = body(MAIN, "const handleOverlayPointerMove = useCallback(");
    expect(b.indexOf('mayRunAnalyticalHandler("BUBBLE")')).toBeGreaterThan(-1);
    expect(b.indexOf('mayRunAnalyticalHandler("BUBBLE")')).toBeLessThan(b.indexOf("setBubbleTip({"));
  });
  it("the crosshair point that keys every paint-loop hover card is null under placement", () => {
    expect(MAIN).toMatch(/crosshairPointRef\.current = param\?\.point[^;]*: null;\s*if \(!mayRunAnalyticalHandler\("HOVER_CARD"\)\) crosshairPointRef\.current = null;/);
  });
  it("the weather lens press, touch guard and double-click ask the gate", () => {
    expect(MAIN).toMatch(/const down = \(e: PointerEvent\) => \{\s*if \(replaying\) return;\s*if \(!mayRunAnalyticalHandler\("WEATHER"\)\) return;/);
    expect(MAIN).toMatch(/const touchGuard = \(e: TouchEvent\) => \{\s*if \(!mayRunAnalyticalHandler\("WEATHER"\)\) return;/);
    expect(MAIN).toMatch(/const dbl = \(e: MouseEvent\) => \{\s*if \(!mayRunAnalyticalHandler\("WEATHER"\)\) return;/);
  });
});

describe("C. analytical DOM is marked, and the mark goes inert", () => {
  it("pins, note anchors, lens controls, the nectar chip and the drawings carry the mark", () => {
    for (const k of ["market-object-pin", "note-anchors", "weather-lens", "nectar-chip", "drawings"]) {
      expect(RAW, k).toContain(`data-analytical-layer="${k}"`);
    }
    // Every market-object pin button is marked.
    const pins = RAW.match(/data-market-object-target=\{/g) ?? [];
    const marked = RAW.match(/data-market-object-target=\{[^}]*\}\s*data-analytical-layer="market-object-pin"/g) ?? [];
    expect(pins.length).toBeGreaterThan(0);
    expect(marked.length).toBe(pins.length);
  });
  it("the pane carries the mode, and globals.css drops marked layers' pointer under PLACEMENT and EXECUTION", () => {
    expect(MAIN).toContain("ref={paneWrapRef}");
    expect(MAIN).toMatch(/setAttribute\(CHART_INTERACTION_ATTR, chartInteractionMode\(\)\)/);
    for (const m of ["PLACEMENT", "EXECUTION"]) {
      expect(GLOBALS).toContain(`[data-chart-interaction="${m}"] [data-analytical-layer],`);
      expect(GLOBALS).toContain(`[data-chart-interaction="${m}"] [data-analytical-layer]::after`);
    }
    expect(GLOBALS).toMatch(/\[data-analytical-layer\]::after \{\s*pointer-events: none !important;/);
  });
});

describe("D. the armed pick takes the whole pane", () => {
  it("tests the pane, never only the lightweight-charts host, and lets analytical chrome through", () => {
    const eff = MAIN.slice(MAIN.indexOf("if (!chartPricePickArmed()) return;"), MAIN.indexOf('window.addEventListener("pointerdown", onDown, true);'));
    expect(eff.length).toBeGreaterThan(200);
    expect(eff).toContain("const pane = paneWrapRef.current;");
    expect(eff).toContain("!pane.contains(e.target)");
    expect(eff).not.toMatch(/!host\.contains\(e\.target\)/);
    expect(eff).toMatch(/if \(chrome && !chrome\.closest\(`\[\$\{ANALYTICAL_LAYER_ATTR\}\]`\)\) return;/);
  });
});

describe("E. the owners hold their tiers", () => {
  it("a draft-line drag claims PLACEMENT and releases it at the end", () => {
    expect(body(MAIN, "const beginDraftDrag = useCallback(")).toMatch(/claimChartInteraction\("PLACEMENT", "chart-draft-drag"\)/);
    expect(body(MAIN, "const endDraftDrag = useCallback(")).toContain("draftDragReleaseRef.current?.()");
  });
  it("the armed pick claims PLACEMENT; every way out releases it", () => {
    expect(body(STORE, "export function armChartPricePick(")).toContain('claimChartInteraction("PLACEMENT", PICK_CLAIM)');
    expect(body(STORE, "export function cancelChartPricePick(")).toContain("releaseChartInteraction(PICK_CLAIM)");
    expect(body(STORE, "export function deliverChartPricePick(")).toContain("releaseChartInteraction(PICK_CLAIM)");
  });
  it("on a phone, a placement folds the ticket sheet to its header + placing strip, and nothing else changes", () => {
    expect(PANEL).toMatch(/const placingFold = compact && interaction === "PLACEMENT" && stageInput\.preSend;/);
    expect(PANEL).toMatch(/\.\.\.\(placingFold \? \{ maxHeight: PLACING_FOLD_MAX_HEIGHT, overflowY: "hidden" as const \} : null\)/);
    expect(PANEL).toContain('data-testid="trade-placing"');
    // The phone sheet's height is owned by !important stage rules in globals.css; the placing rule must outrank them.
    expect(GLOBALS).toMatch(/\[data-testid="trade-panel"\]\[data-placing="yes"\] \{ max-height: 124px !important; overflow-y: hidden !important; \}/);
    expect(PANEL).toMatch(/data-testid="trade-placing-cancel" onClick=\{\(\) => cancelChartPricePick\(\)\}/);
    // CSS only: the fold never writes the ticket's own fold / half state.
    const at = PANEL.indexOf("const placingFold");
    expect(PANEL.slice(at, PANEL.indexOf("\n", at))).not.toMatch(/setFolded|setHalf/);
  });
  it("markers waiting at the phone sheet's edge stack, never one on another", () => {
    expect(MAIN).toMatch(/const markerY = ticketSheetTop != null \? ticketSheetTop - 24 - \(underSheet \? underSheetK \* 46 : 0\) : null;/);
    expect(MAIN).toContain("if (underSheet) underSheetK += 1;");
  });
  it("the ticket's confirmation claims EXECUTION", () => {
    expect(PANEL).toMatch(/entryPhase !== "CONFIRMING"\) return;[\s\S]{0,80}claimChartInteraction\("EXECUTION", "ticket-confirmation"\)/);
  });
});
