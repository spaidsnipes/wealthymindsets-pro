import { beforeEach, describe, expect, it } from "vitest";

import {
  armChartPricePick,
  chartOrderLinesFor,
  chartPricePickArmed,
  deliverChartPricePick,
  orderLineWords,
  publishChartOrderLines,
  resetChartOrderLinesForTest,
  type ChartOrderLine,
} from "./chartOrderLines";
import { planFlatten, readTastytradePosition, selectBrokerOrderLines, type BrokerReadback } from "./brokerOrderLines";
import type { TtOrderView } from "@/lib/broker/tastytradeOrderState";

const STAGED: ChartOrderLine = { id: "e", role: "ENTRY", status: "STAGED", price: 25_000, contract: "/MNQZ6", detail: "BUY 1 LIMIT" };

describe("order lines say what they are — a staged idea never reads as a working order", () => {
  it("STAGED is dotted and muted and says STAGED", () => {
    expect(orderLineWords(STAGED)).toMatchObject({ text: "STAGED · ENTRY BUY 1 LIMIT /MNQZ6", lineStyle: 1, lineWidth: 1, ink: "#8a8271" });
  });
  it("WORKING is solid; UNKNOWN and RECONCILING are dashed", () => {
    expect(orderLineWords({ ...STAGED, status: "WORKING", role: "WORKING" })).toMatchObject({ lineStyle: 0, lineWidth: 2 });
    expect(orderLineWords({ ...STAGED, status: "UNKNOWN" })).toMatchObject({ lineStyle: 2, ink: "#e0786b" });
    expect(orderLineWords({ ...STAGED, status: "RECONCILING" }).lineStyle).toBe(2);
  });
  it("a position line carries signed P&L in words; its ink does not grade the result", () => {
    const w = orderLineWords({ id: "p", role: "POSITION", status: "POSITION", price: 25_000, contract: "/MNQZ6", detail: "LONG 1", pnlUsd: -42.5 });
    expect(w.text).toBe("POSITION LONG 1 /MNQZ6 · −$42.50");
    expect(w.ink).toBe("#8B92AC");
  });
});

describe("the store between the ticket and the chart", () => {
  beforeEach(() => resetChartOrderLinesForTest());
  it("publishers are merged per chart symbol and cleared by an empty publish", () => {
    publishChartOrderLines("ticket", "nq1!", [STAGED]);
    publishChartOrderLines("broker", "NQ1!", [{ ...STAGED, id: "w", status: "WORKING" }]);
    expect(chartOrderLinesFor("NQ1!").map(l => l.id)).toEqual(["e", "w"]);
    const same = chartOrderLinesFor("NQ1!");
    expect(chartOrderLinesFor("NQ1!")).toBe(same);
    publishChartOrderLines("ticket", "NQ1!", []);
    expect(chartOrderLinesFor("NQ1!").map(l => l.id)).toEqual(["w"]);
    expect(chartOrderLinesFor("ES1!")).toEqual([]);
  });
  it("the pick is offered only while a chart hosts it; the last host leaving cancels an armed pick", async () => {
    const { registerChartPricePickHost } = await import("./chartOrderLines");
    const off = registerChartPricePickHost();
    armChartPricePick("ENTRY");
    off();
    expect(chartPricePickArmed()).toBeNull();
  });
  it("a price pick is one-shot: armed, consumed by one click, then off", () => {
    expect(deliverChartPricePick("NQ1!", 25_000)).toBe(false);
    armChartPricePick("STOP");
    expect(chartPricePickArmed()).toBe("STOP");
    expect(deliverChartPricePick("NQ1!", Number.NaN)).toBe(false);
    expect(deliverChartPricePick("NQ1!", 24_900)).toBe(true);
    expect(chartPricePickArmed()).toBeNull();
    expect(deliverChartPricePick("NQ1!", 24_800)).toBe(false);
  });
});

const view = (o: Partial<TtOrderView>): TtOrderView => ({
  id: "1", status: "Live", state: "WORKING", symbol: "/MNQZ6", action: "Sell to Close", quantity: 1, filled: 0, price: null, stopTrigger: null,
  orderType: "Stop", externalId: null, cancellable: true, rejectReason: null, updatedAt: null, ...o,
});
const NOW = 1_000_000;
const POSITION = readTastytradePosition({ symbol: "/MNQZ6", quantity: 1, "quantity-direction": "Long", "average-open-price": "25000", "instrument-type": "Future" })!;

describe("broker readback → lines (read routes only)", () => {
  it("a working closing stop protects the held position; P&L needs a live mark", () => {
    const rb: BrokerReadback = { asOfMs: NOW - 1_000, ok: true, orders: [view({ stopTrigger: "24900" })], positions: [POSITION] };
    const r = selectBrokerOrderLines(rb, "/MNQZ6", 25_010, 2, NOW);
    expect(r.readback).toBe("FRESH");
    expect(r.position).toMatchObject({ protection: "PROTECTED", pnlUsd: 20 });
    expect(r.lines.map(l => [l.role, l.status, l.price])).toEqual([["WORKING", "WORKING", 24_900], ["POSITION", "POSITION", 25_000]]);
    expect(selectBrokerOrderLines(rb, "/MNQZ6", null, 2, NOW).position?.pnlUsd).toBeNull();
  });
  it("no working stop → UNPROTECTED, said on the line", () => {
    const r = selectBrokerOrderLines({ asOfMs: NOW, ok: true, orders: [], positions: [POSITION] }, "/MNQZ6", 25_010, 2, NOW);
    expect(r.position?.protection).toBe("UNPROTECTED");
    expect(r.lines[0].detail).toMatch(/UNPROTECTED/);
  });
  it("an old or failed readback turns every line RECONCILING and drops P&L — never silently removed", () => {
    const rb: BrokerReadback = { asOfMs: NOW - 30_000, ok: true, orders: [view({ stopTrigger: "24900" })], positions: [POSITION] };
    const r = selectBrokerOrderLines(rb, "/MNQZ6", 25_010, 2, NOW);
    expect(r.readback).toBe("STALE");
    expect(r.lines.every(l => l.status === "RECONCILING")).toBe(true);
    expect(r.position).toMatchObject({ protection: "UNPROTECTED", pnlUsd: null });
    expect(selectBrokerOrderLines({ ...rb, asOfMs: NOW, ok: false }, "/MNQZ6", 1, 2, NOW).readback).toBe("STALE");
    expect(selectBrokerOrderLines({ asOfMs: null, ok: false, orders: [], positions: [] }, "/MNQZ6", 1, 2, NOW)).toMatchObject({ readback: "NEVER_READ", lines: [] });
  });
  it("an order in a status WM does not know is drawn UNKNOWN; finished orders and other contracts are not drawn", () => {
    const rb: BrokerReadback = { asOfMs: NOW, ok: true, positions: [], orders: [
      view({ id: "2", state: "UNKNOWN", orderType: "Limit", price: "25100" }),
      view({ id: "3", state: "FILLED", orderType: "Limit", price: "25000" }),
      view({ id: "4", symbol: "/ESZ6", orderType: "Limit", price: "6000" }),
    ] };
    expect(selectBrokerOrderLines(rb, "/MNQZ6", null, 2, NOW).lines.map(l => [l.id, l.status])).toEqual([["tt-order-2", "UNKNOWN"]]);
  });
  it("FLATTEN is a closing market ticket for exactly the held quantity — not a send", () => {
    expect(planFlatten(POSITION)).toEqual({ action: "Sell to Close", qty: 1, type: "Market", symbol: "/MNQZ6" });
    expect(planFlatten({ ...POSITION, direction: "Short", quantity: 2 })).toMatchObject({ action: "Buy to Close", qty: 2 });
  });
  it("a row that is not a position is not read as one", () => {
    expect(readTastytradePosition({ symbol: "/MNQZ6", quantity: 0, "quantity-direction": "Zero", "average-open-price": "1" })).toBeNull();
  });
});
