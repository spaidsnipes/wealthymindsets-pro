/**
 * Cert lane defect (2026-10-08): Backtest › "Open on the chart →" on NQ1! 5m
 * (`FVG|NQ1!|5m|1791458400000|BULLISH|v1`, traded through) read NONE_AVAILABLE.
 * Cause: the study reads the bar route's continuous "NQ1!" history while the
 * chart's feed mints `FVG|TASTYTRADE:/NQZ26:XCME|5m|…` — the door's instrument
 * rule ("continuous vs dated never match") refused the chart's own gap.
 * Fix: the door carries its territory (`band=`), and a feed alias of the
 * chart's OWN symbol is the same instrument only when that territory overlaps.
 * A selected traded-through / memory gap still paints (MainChart's "selected
 * object always paints"), so the door can select it.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { fvgChartHref } from "@/lib/marketData/fvg/fvgChartLink";
import { parseProofScene } from "./proofScene";
import { resolveFvgDoorTarget } from "./fvgGlass";

const DOOR = "FVG|NQ1!|5m|1791458400000|BULLISH|v1";
const CHART = "FVG|TASTYTRADE:/NQZ26:XCME|5m|1791458400000|BULLISH|v1";
const o = (objectId: string, bottom: number, top: number) => ({ objectId, bottom, top });

describe("the door carries its territory", () => {
  it("fvgChartHref adds band=<bottom>~<top>; the proof scene parses it beside select=fvg:<id>", () => {
    const href = fvgChartHref({ symbol: "NQ1!", timeframe: "5m", objectId: DOOR, territory: { bottom: 25210.25, top: 25218.5 } });
    const u = new URL(href, "https://wm.test");
    expect(u.searchParams.get("band")).toBe("25210.25~25218.5");
    const s = parseProofScene(u.search);
    expect(s.selectObject).toEqual({ kind: "fvg", objectId: DOOR, territory: { bottom: 25210.25, top: 25218.5 } });
    // A bad band is dropped, never guessed.
    expect(parseProofScene(`?select=fvg:${encodeURIComponent(DOOR)}&band=9~1`).selectObject).toEqual({ kind: "fvg", objectId: DOOR });
    expect(fvgChartHref({ symbol: "NQ1!", timeframe: "5m", objectId: DOOR })).not.toContain("band=");
  });
});

describe("continuous ↔ dated: the chart's own symbol under a feed alias", () => {
  it("the defect: without the chart symbol and territory, the door finds nothing", () => {
    expect(resolveFvgDoorTarget(DOOR, [o(CHART, 25210, 25219)])).toBeNull();
  });

  it("the fix: same slot, direction, timeframe and version, overlapping territory, door names the chart's symbol → the chart's gap", () => {
    expect(resolveFvgDoorTarget(DOOR, [o(CHART, 25210, 25219)], { bottom: 25210.25, top: 25218.5 }, { chartSymbol: "NQ1!" }))
      .toEqual({ objectId: CHART, how: "EQUIVALENT_FEED_ALIAS" });
  });

  it("never without the territory, never across a roll (no overlap), never for another chart, never across slot / direction / timeframe", () => {
    const t = { bottom: 25210.25, top: 25218.5 };
    expect(resolveFvgDoorTarget(DOOR, [o(CHART, 25210, 25219)], null, { chartSymbol: "NQ1!" })).toBeNull();
    // A different contract's gap at the same slot sits a basis away → no overlap.
    expect(resolveFvgDoorTarget(DOOR, [o(CHART, 25420, 25429)], t, { chartSymbol: "NQ1!" })).toBeNull();
    // The door names NQ1! but the chart is ES1!.
    expect(resolveFvgDoorTarget(DOOR, [o(CHART.replace("/NQZ26", "/ESZ26"), 25210, 25219)], t, { chartSymbol: "ES1!" })).toBeNull();
    expect(resolveFvgDoorTarget(DOOR, [o(CHART.replace("1791458400000", "1791458700000"), 25210, 25219)], t, { chartSymbol: "NQ1!" })).toBeNull();
    expect(resolveFvgDoorTarget(DOOR, [o(CHART.replace("BULLISH", "BEARISH"), 25210, 25219)], t, { chartSymbol: "NQ1!" })).toBeNull();
    expect(resolveFvgDoorTarget(DOOR, [o(CHART.replace("|5m|", "|1m|"), 25210, 25219)], t, { chartSymbol: "NQ1!" })).toBeNull();
  });

  it("the exact and same-symbol rules are unchanged", () => {
    expect(resolveFvgDoorTarget(DOOR, [o(DOOR, 1, 2)], null, { chartSymbol: "NQ1!" })).toEqual({ objectId: DOOR, how: "EXACT" });
    const nv = "FVG|NVDA|5m|1|BULLISH|v1";
    expect(resolveFvgDoorTarget(nv, [o("FVG|TASTYTRADE:NVDA|5m|1|BULLISH|v1", 1, 2)])).toEqual({ objectId: "FVG|TASTYTRADE:NVDA|5m|1|BULLISH|v1", how: "EQUIVALENT" });
  });
});

describe("wiring", () => {
  const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");
  it("the chart resolves with the door's territory and its own symbol, and receipts the alias honestly", () => {
    const D = read("src/components/chart/ChartsDashboard.tsx");
    expect(D.length).toBeGreaterThan(100_000);
    expect(D).toContain("resolveFvgDoorTarget(proofSelectObject.objectId, fvgScene.ledger.objects, proofSelectObject.territory ?? null, { chartSymbol: symbol })");
    expect(D).toContain("`${tag}|HELD:${target.how}:${target.objectId}`");
  });
  it("Backtest and Scanner doors carry the territory", () => {
    expect(read("src/components/backtest/FvgStudyPanel.tsx")).toContain("territory: { bottom: o.bottom, top: o.top }");
    expect(read("src/lib/scanner/fvgScanConditions.ts")).toContain("territory: { bottom: o.bottom, top: o.top }");
  });
  it("a selected traded-through / memory gap still paints (past the budget)", () => {
    const M = read("src/components/chart/MainChart.tsx");
    expect(M).toContain("// The selected object always paints (even past the budget or in memory).");
  });
});
