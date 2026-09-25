/**
 * ONE SELECTION AT A TIME, AND EVERY PATH TO IT GOES THROUGH ONE REDUCER.
 *
 * The room used to hold the selected object, the selected print and the
 * selected Living slice as three `useState`s, and each select path cleared the
 * others by hand. The bubble and slice paths forgot the object, the LEVEL path
 * forgot the print and the slice, and closing Inspect forgot a LEVEL — so the
 * glass painted two selected things while the ticket described the older one.
 *
 * `selectChartSelection` now owns a union that cannot hold two. This sentinel
 * keeps the room from growing a fourth setter beside it: every selection
 * change is a dispatch, and every trader-driven dispatch goes through
 * `actOnChartSelection`, where the remembered-object rule lives.
 *
 * A breadcrumb, not a renderer. It reads source, and it proves its scans found
 * the wiring they vouch for — an emptiness check over the wrong file passes.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Prose names the things it forbids; only executable code is evidence. */
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const ROOM = strip(readFileSync(join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8"));

describe("the chart has one selection, owned by selectChartSelection", () => {
  it("the room holds the selection in the reducer and derives the three views from it", () => {
    expect(ROOM).toContain("React.useReducer(selectChartSelection, CHART_SELECTION_AT_REST)");
    expect(ROOM).toContain("const selectedMarketObjectId = selectedObjectIdOf(chartSelection);");
    expect(ROOM).toContain("const selectedPrint = selectedPrintOf(chartSelection);");
    expect(ROOM).toContain("const selectedSlicePrice = selectedSliceOf(chartSelection);");
    expect(ROOM).toContain("const inspectOpen = chartSelection.inspectOpen;");
  });

  it("no second writer: the old setters are gone and none of the four is a useState again", () => {
    for (const setter of ["setSelectedPrint", "setSelectedSlicePrice", "setSelectedMarketObjectId", "setInspectOpen"]) {
      expect(ROOM, `${setter} is a second writer of the selection`).not.toMatch(new RegExp(`\\b${setter}\\b`));
    }
    expect(ROOM).not.toMatch(/const \[(selectedPrint|selectedSlicePrice|selectedMarketObjectId|inspectOpen)\b[^\]]*\]\s*=\s*useState/);
  });

  it("every trader-driven selection path routes through actOnChartSelection", () => {
    const routes = [
      /onSelectBigTrade=\{print => actOnChartSelection\(\{ type: "select", selection: \{ kind: "PRINT", print \} \}\)\}/,
      /onSelectProfileSlice=\{price => actOnChartSelection\(\{ type: "select", selection: \{ kind: "SLICE", symbol, timeframe, price \} \}\)\}/,
      /onSelectMarketObject=\{id => actOnChartSelection\(\{ type: "toggleObject", objectId: id \}\)\}/,
      /onOpenChange=\{open => actOnChartSelection\(\{ type: open \? "openInspect" : "closeInspect" \}\)\}/,
      /actOnChartSelection\(\{ type: "select", selection: \{ kind: "OBJECT", objectId: z\.object\.objectId \} \}\)/,
    ];
    for (const route of routes) expect(ROOM).toMatch(route);
    // Proof the scan is over the wiring it vouches for, not an empty file.
    expect((ROOM.match(/actOnChartSelection\(/g) ?? []).length).toBeGreaterThanOrEqual(routes.length);
  });

  it("the raw dispatch is called only by actOnChartSelection and the recompile reconcile", () => {
    const calls = [...ROOM.matchAll(/dispatchChartSelection\(/g)].map(m => m.index ?? -1);
    expect(calls.length).toBe(2);
    const actAt = ROOM.indexOf("const actOnChartSelection = (action: ChartSelectionAction) => {");
    expect(actAt).toBeGreaterThan(-1);
    for (const at of calls) {
      const insideAct = at > actAt && at < ROOM.indexOf("};", actAt);
      const isReconcile = /^dispatchChartSelection\(\{\s*type: "reconcile",/.test(ROOM.slice(at, at + 80));
      expect(insideAct || isReconcile, `dispatch at ${at} bypasses actOnChartSelection`).toBe(true);
    }
  });

  it("the ticket reads the same union the glass is told about", () => {
    const ticketAt = ROOM.indexOf("<ChartInspectTicket");
    expect(ticketAt).toBeGreaterThan(-1);
    const ticket = ROOM.slice(ticketAt, ticketAt + 1600);
    expect(ticket).toContain("open={inspectOpen}");
    expect(ticket).toContain("selectedPrint={activeSelectedPrint}");
    expect(ticket).toContain("selectedProfileSlice={activeProfileSlice}");
    expect(ticket).toMatch(/selectedZone=\{chartStructureZones\.find\(z => z\.object\.objectId === selectedMarketObjectId\) \?\? null\}/);
    expect(ROOM).toContain("selectedPrintOnChart={activeSelectedPrint}");
    expect(ROOM).toContain("selectedMarketObjectId={selectedMarketObjectId}");
  });
});
