/**
 * A WORKING broker line on the chart (TradingView parity, ruled 2026-10-10): never dragged; a press opens
 * the ticket's MODIFY for THAT order with the line's price as a DRAFT. MODIFY stays cancel-then-new behind
 * preview, the server gate and confirmation — nothing here sends.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";

import type { TtOrderView } from "@/lib/broker/tastytradeOrderState";
import { selectBrokerOrderLines, type BrokerReadback } from "./brokerOrderLines";
import {
  askChartLineModify,
  chartOrderLineDraggable,
  resetChartOrderLinesForTest,
  workingLineModifyNote,
  workingOrderIdOfLine,
  type ChartOrderLine,
} from "./chartOrderLines";
import { ticketBook } from "./ticketBook";
import { TicketBookRows } from "@/components/chart/TicketBookRows";

const read = (p: string) => readFileSync(path.resolve(process.cwd(), "src", p), "utf8");
const CHART = read("components/chart/MainChart.tsx");
const PANEL = read("components/chart/TradePanel.tsx");
const DASH = read("components/chart/ChartsDashboard.tsx");
const STORE = read("lib/execution/chartOrderLines.ts");

it("the scanned sources are not empty", () => {
  expect(CHART.length).toBeGreaterThan(100_000);
  expect(PANEL.length).toBeGreaterThan(5_000);
  expect(DASH.length).toBeGreaterThan(10_000);
  expect(STORE.length).toBeGreaterThan(2_000);
});

const C = "/MNQZ6";
const NOW = Date.parse("2026-10-08T18:30:00Z");
const ORDER = { id: "101", status: "Live", state: "WORKING", symbol: C, action: "Sell to Close", quantity: 1, filled: 0, price: null, stopTrigger: "24900", orderType: "Stop", externalId: null, cancellable: true, rejectReason: null, updatedAt: null } as TtOrderView;
const LONG = { symbol: C, quantity: 1, direction: "Long" as const, averageOpenPrice: 25_000, instrumentType: "Future" };
const RB: BrokerReadback = { asOfMs: NOW - 1000, ok: true, orders: [ORDER], positions: [LONG], tails: ["5019"], orderAccounts: { "101": { index: 0, tail: "5019" } } };

describe("which line is a working order", () => {
  beforeEach(() => resetChartOrderLinesForTest());
  it("the broker's own working line (and its SAMPLE copy) name their order; nothing else does", () => {
    const lines = selectBrokerOrderLines(RB, C, 25_010, 2, NOW).lines;
    const working = lines.find(l => l.role === "WORKING")!;
    expect(workingOrderIdOfLine(working)).toBe("101");
    expect(workingOrderIdOfLine({ ...working, id: `sample-${working.id}` })).toBe("101");
    expect(workingOrderIdOfLine(lines.find(l => l.role === "POSITION")!)).toBeNull();
    const staged: ChartOrderLine = { id: "ticket-stop", role: "STOP", status: "STAGED", price: 24_900, contract: C, detail: "SELL 1" };
    expect(workingOrderIdOfLine(staged)).toBeNull();
    expect(workingOrderIdOfLine({ ...working, status: "RECONCILING" })).toBeNull();
    // …and it is still NOT draggable.
    expect(chartOrderLineDraggable(working)).toBe(false);
  });
  it("a press asks MODIFY for that order at the line's price; any other line asks nothing", () => {
    const working = selectBrokerOrderLines(RB, C, 25_010, 2, NOW).lines.find(l => l.role === "WORKING")!;
    expect(askChartLineModify("NQ1!", working)).toBe(true);
    expect(askChartLineModify("NQ1!", { id: "tt-position-x", role: "POSITION", status: "POSITION", price: 25_000, contract: C, detail: "" })).toBe(false);
    expect(workingLineModifyNote("101")).toMatch(/^MODIFY for #101 opened in the ticket — the line's price is a draft; nothing is sent\.$/);
  });
  it("the ask only names an order and a price — the store has no route to a broker", () => {
    const at = STORE.indexOf("export function askChartLineModify(");
    expect(STORE.slice(at, at + 600)).not.toMatch(/fetch\(|\/api\/|order-submit/);
  });
});

describe("the ticket shows the draft on MODIFY", () => {
  it("MODIFY opens for that order with the draft price and says it is cancel-then-new behind preview, gate and confirmation", () => {
    const book = ticketBook(selectBrokerOrderLines(RB, C, 25_010, 2, NOW), C, { killSwitch: false, limitsSet: true });
    const h = renderToStaticMarkup(<TicketBookRows book={book} acks={{}} busyId={null} onCancel={() => {}} onFlatten={() => {}} modifyDraft={{ orderId: "101", price: "24890.00" }} />).replace(/&#x27;/g, "'");
    expect(h).toMatch(/<details data-testid="trade-modify-details" open="">/);
    expect(h).toContain('data-testid="trade-modify-draft" data-order-id="101" data-price="24890.00"');
    expect(h).toContain("MODIFY here is cancel #101, then a new order at that price; preview, the server gate and your confirmation still decide. Nothing is sent.");
    expect(h).toContain('data-order-id="101" data-modify-draft="yes"');
    // Without an ask the disclosure stays as it was.
    const plain = renderToStaticMarkup(<TicketBookRows book={book} acks={{}} busyId={null} onCancel={() => {}} onFlatten={() => {}} />);
    expect(plain).toContain('<details data-testid="trade-modify-details">');
    expect(plain).not.toContain("trade-modify-draft");
  });
  it("wiring: the chart press asks, the dashboard opens the ticket, the ticket hands the draft to the book rows", () => {
    expect(CHART).toContain("askChartLineModify(symbol, l) ? workingLineModifyNote(oid) : BROKER_LINE_NOT_MOVABLE");
    expect(DASH).toMatch(/useEffect\(\(\) => \{ if \(chartModifyAsk\) setTradeOpen\(true\); \}, \[chartModifyAsk\?\.seq\]\);/);
    expect(PANEL).toMatch(/modifyDraft=\{modifyDraft && book\.working\.some\(w => w\.id === modifyDraft\.orderId\) \? modifyDraft : null\}/);
  });
});
