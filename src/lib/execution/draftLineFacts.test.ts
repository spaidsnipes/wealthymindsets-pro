/**
 * Ticket ⇄ chart, both directions, and what a staged line says (Founder P0 2026-10-10).
 *   ticket → line: the ticket's own stop / target / entry numbers are what the line is drawn at;
 *   line → ticket: a drag or pick reaches the ticket only through deliverChartDraftPrice / the pick;
 *   the line's distance, money and refusal are the TICKET's — the chart computes none.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

import { STOP_WRONG_SIDE_REASON, TARGET_WRONG_SIDE_REASON, draftLineFacts } from "./draftLineFacts";
import {
  armChartPricePick,
  chartOrderLinesFor,
  deliverChartDraftPrice,
  deliverChartPricePick,
  draftHandleWords,
  orderLineWords,
  publishChartOrderLines,
  resetChartOrderLinesForTest,
  type ChartOrderLine,
} from "./chartOrderLines";

const read = (p: string) => readFileSync(path.resolve(process.cwd(), "src", p), "utf8");
const PANEL = read("components/chart/TradePanel.tsx");
const CHART = read("components/chart/MainChart.tsx");

it("the scanned sources are not empty", () => {
  expect(PANEL.length).toBeGreaterThan(5_000);
  expect(CHART.length).toBeGreaterThan(100_000);
});

describe("distance from the ticket's own entry and tick", () => {
  it("futures: points and ticks, signed against the entry", () => {
    expect(draftLineFacts({ role: "STOP", family: "FUTURE", entry: 31_128, price: 31_093.5, tick: 0.25, dp: 2, wrongSide: false }))
      .toEqual({ distance: "−34.50 pts · 138 ticks", invalid: null });
    expect(draftLineFacts({ role: "TARGET", family: "FUTURE", entry: 31_128, price: 31_128.25, tick: 0.25, dp: 2, wrongSide: false }).distance)
      .toBe("+0.25 pts · 1 tick");
  });
  it("no tick on file → no tick count is claimed", () => {
    expect(draftLineFacts({ role: "STOP", family: "FUTURE", entry: 100, price: 99, tick: null, dp: 2, wrongSide: false }).distance).toBe("−1.00 pts");
  });
  it("stocks and crypto: price units and percent", () => {
    expect(draftLineFacts({ role: "TARGET", family: "STOCK", entry: 200, price: 203, tick: 0.01, dp: 2, wrongSide: false }).distance).toBe("+$3.00 · +1.50%");
    expect(draftLineFacts({ role: "STOP", family: "CRYPTO", entry: 60_000, price: 59_400, tick: 0.01, dp: 2, wrongSide: false }).distance).toBe("−$600.00 · −1.00%");
  });
  it("entry unknown → no distance (never a guess)", () => {
    expect(draftLineFacts({ role: "STOP", family: "FUTURE", entry: null, price: 31_000, tick: 0.25, dp: 2, wrongSide: false })).toEqual({ distance: null, invalid: null });
  });
});

describe("an invalid placement says the ticket's reason, and no money", () => {
  it("wrong-side stop / target carry the reason", () => {
    expect(draftLineFacts({ role: "STOP", family: "FUTURE", entry: 31_128, price: 31_135.5, tick: 0.25, dp: 2, wrongSide: true }))
      .toEqual({ distance: null, invalid: STOP_WRONG_SIDE_REASON });
    expect(draftLineFacts({ role: "TARGET", family: "FUTURE", entry: 31_128, price: 31_100, tick: 0.25, dp: 2, wrongSide: true }).invalid)
      .toBe(TARGET_WRONG_SIDE_REASON);
  });
  it("the handle and the words print the reason instead of a dollar figure", () => {
    const bad: ChartOrderLine = { id: "s", role: "STOP", status: "STAGED", price: 31_135.5, contract: "/NQZ6", detail: "SELL 1", pnlUsd: -150, invalid: STOP_WRONG_SIDE_REASON };
    expect(draftHandleWords(bad, 31_135.5, 2)).toBe(`STOP 31135.50 · ${STOP_WRONG_SIDE_REASON}`);
    expect(orderLineWords(bad).text).toContain(STOP_WRONG_SIDE_REASON);
    expect(orderLineWords(bad).text).not.toContain("$150");
  });
  it("a valid stop prints distance then the ticket's money", () => {
    const ok: ChartOrderLine = { id: "s", role: "STOP", status: "STAGED", price: 31_093.5, contract: "/NQZ6", detail: "SELL 1", pnlUsd: -690, distance: "−34.50 pts · 138 ticks" };
    expect(draftHandleWords(ok, 31_093.5, 2)).toBe("STOP 31093.50 · −34.50 pts · 138 ticks · −$690.00");
  });
  it("the ticket publishes the refusal, not money, for a wrong-side line, and checks the target's side too", () => {
    expect(PANEL).toMatch(/draftLineFacts\(\{ role: "STOP", family, entry: referenceEntry, price: stopNum, tick, dp, wrongSide: stopWrongSide \}\)/);
    expect(PANEL).toMatch(/pnlUsd: f\.invalid \|\| riskUsd == null \? null : -riskUsd/);
    expect(PANEL).toMatch(/const targetWrongSide = referenceEntry != null && targetNum != null && \(side === "BUY" \? targetNum <= referenceEntry : targetNum >= referenceEntry\)/);
  });
});

describe("sync: ticket → line and line → ticket", () => {
  beforeEach(() => resetChartOrderLinesForTest());
  it("ticket → line: the staged lines are drawn at the ticket's own stop / target / entry", () => {
    expect(PANEL).toMatch(/lines\.push\(\{ id: "ticket-stop", role: "STOP", status: "STAGED", price: stopNum,/);
    expect(PANEL).toMatch(/lines\.push\(\{ id: "ticket-target", role: "TARGET", status: "STAGED", price: targetNum,/);
    expect(PANEL).toMatch(/id: "ticket-entry", role: "ENTRY", status: "STAGED", price: stagedEntryPx,/);
    // An edit republishes: the stop is a dependency of the publishing effect.
    expect(PANEL).toMatch(/\}, \[contract\?\.symbol, owner, tradable, entryPhase, stagedEntryPx, stopNum, targetNum,/);
    // …and the chart repaints from the store on every publish.
    publishChartOrderLines("ticket", "NQ1!", [{ id: "ticket-stop", role: "STOP", status: "STAGED", price: 31_093.5, contract: "/NQZ6", detail: "SELL 1" }]);
    const before = chartOrderLinesFor("NQ1!");
    publishChartOrderLines("ticket", "NQ1!", [{ id: "ticket-stop", role: "STOP", status: "STAGED", price: 31_070.5, contract: "/NQZ6", detail: "SELL 1" }]);
    expect(chartOrderLinesFor("NQ1!")).not.toBe(before);
    expect(chartOrderLinesFor("NQ1!")[0].price).toBe(31_070.5);
    expect(CHART).toMatch(/\}, \[chartOrderLines, ready, replayCameraOn, orderLineLooks\]\);/);
  });
  it("line → ticket: a drag and a pick each write one fresh draft record for the ticket", () => {
    expect(deliverChartDraftPrice("NQ1!", "STOP", 31_070.5, "DRAG")).toBe(true);
    armChartPricePick("TARGET");
    expect(deliverChartPricePick("NQ1!", 31_162.5)).toBe(true);
    // The ticket reads `picked` (role, price, seq, source) and snaps to its own tick.
    expect(PANEL).toMatch(/const px = tick \? Math\.round\(picked\.price \/ tick\) \* tick : picked\.price;/);
    expect(PANEL).toMatch(/if \(picked\.role === "STOP"\) setStop\(v\);/);
    expect(PANEL).toMatch(/else if \(picked\.role === "TARGET"\) setTarget\(v\);/);
  });
});

describe("the price scale holds still under a drag", () => {
  it("the drag pins the visible range only if the trader had none, and releases it at the end", () => {
    const begin = CHART.slice(CHART.indexOf("const beginDraftDrag = useCallback("), CHART.indexOf("const moveDraftDrag = useCallback("));
    expect(begin).toMatch(/if \(!manualPriceRangeRef\.current\) \{/);
    expect(begin).toContain("draftDragScaleHeldRef.current = true;");
    const end = CHART.slice(CHART.indexOf("const endDraftDrag = useCallback("), CHART.indexOf("const nudgeDraftLine = useCallback("));
    expect(end).toContain("releaseDraftDragScale();");
    expect(CHART).toMatch(/if \(!draftDragScaleHeldRef\.current\) return;\s*draftDragScaleHeldRef\.current = false;\s*manualPriceRangeRef\.current = null;/);
  });
});
