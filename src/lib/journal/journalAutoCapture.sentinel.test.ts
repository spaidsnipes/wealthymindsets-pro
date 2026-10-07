/**
 * JOURNAL AUTO-CAPTURE stays a DRAFT — §J 2026-10-07. Source breadcrumbs plus
 * a server render of the facts panel (node environment; no live order exists
 * in a test, so the FILLED → offer path is proven by the pure capture tests,
 * the gate below and the markup).
 *
 * Fails if:
 *   A. the ticket offers "Add to Journal" outside a broker-confirmed FILLED
 *      readback, or the offer gains any path to an order route;
 *   B. the Journal writes a captured draft into the book anywhere but the
 *      trader's own Save (no silent writes to the Founder's journal);
 *   C. an unreported field renders as 0 instead of "unreported".
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CapturedFacts } from "@/components/journal/CapturedFacts";
import { filledOrdersWithTickets, fillsForOrder } from "@/components/journal/FillJournalOffer";
import { readTastytradeOrder } from "@/lib/broker/tastytradeOrderState";
import { journalCaptureFromFill } from "./journalCaptureFromFill";

const SRC = path.resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(path.join(SRC, rel), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("A. the offer appears only on tastytrade's FILLED readback, and cannot trade", () => {
  const ticket = strip(read("components/chart/TastytradeLiveOrder.tsx"));
  const offer = strip(read("components/journal/FillJournalOffer.tsx"));
  it("is rendered once, gated on the FILLED phase AND the broker's FILLED order state", () => {
    expect(ticket.match(/<FillJournalOffer /g)).toHaveLength(1);
    expect(ticket).toMatch(/phase === "FILLED" && order\?\.state === "FILLED" && \(sentTicketRef\.current \?\?= ticketAtSendFor\(order\.externalId\)\) \? \(\s*<FillJournalOffer /);
  });
  it("the offer reads the journal feed only — no order-submit, dry-run, cancel or DELETE", () => {
    expect(offer).toContain("/api/broker/journal-feed");
    expect(offer).not.toMatch(/order-submit|order-dry-run|method:\s*"(POST|DELETE|PUT|PATCH)"|\/api\/broker\/tastytrade\/orders/);
  });
  it("the ticket still posts order-submit from exactly one place", () => {
    expect(ticket.match(/\/api\/broker\/tastytrade\/order-submit/g)).toHaveLength(1);
  });
  it("finds this order's fills (and only its fills) in the feed", () => {
    const feed = { accounts: [
      { tail: "1111", broker: "webull", fills: [{ id: "w", orderId: "42", quantity: 1, price: 1, fees: 0, executedAt: null }] },
      { tail: "2222", broker: "tastytrade", orders: [{ id: "42" }], fills: [{ id: "a", orderId: "42", quantity: 1, price: 10, fees: 0.5, executedAt: null }, { id: "b", orderId: "7", quantity: 1, price: 9, fees: 0, executedAt: null }] },
    ] };
    const got = fillsForOrder(feed, "42");
    expect(got.accountTail).toBe("2222");
    expect(got.fills.map(f => f.id)).toEqual(["a"]);
    expect(got.accountFills.map(f => f.id)).toEqual(["a", "b"]);
    expect(fillsForOrder(null, "42")).toEqual({ fills: [], accountFills: [], accountTail: null });
  });
});

describe("A2. a reload keeps the offer: FILLED orders are matched to tickets recorded at send", () => {
  it("only FILLED tastytrade orders whose client order id this tab recorded", () => {
    const feed = { accounts: [{ tail: "2222", broker: "tastytrade", orders: [
      { id: "1", state: "FILLED", externalId: "wmo_a", status: "Filled", symbol: "/MNQZ6", action: "Buy to Open", quantity: 1, filled: 1, price: null, orderType: "Market", updatedAt: null },
      { id: "2", state: "WORKING", externalId: "wmo_b", status: "Live", symbol: "/MNQZ6", action: "Sell to Close", quantity: 1, filled: 0, price: "1", orderType: "Limit", updatedAt: null },
      { id: "3", state: "FILLED", externalId: "outside", status: "Filled", symbol: "AAPL", action: "Buy to Open", quantity: 1, filled: 1, price: null, orderType: "Market", updatedAt: null },
    ] }] };
    expect(filledOrdersWithTickets(feed, new Set(["wmo_a", "wmo_b"])).map(o => o.id)).toEqual(["1"]);
  });
  it("the ticket records at SUBMITTING under the idempotency key, and reads the record back by the broker's echo", () => {
    const ticket = strip(read("components/chart/TastytradeLiveOrder.tsx"));
    expect(ticket).toMatch(/rememberTicketAtSend\(window\.sessionStorage, keyRef\.current, sentTicketRef\.current/);
    expect(ticket).toMatch(/ticketForOrder\(window\.sessionStorage, clientOrderId/);
    expect(strip(read("components/chart/TradePanel.tsx"))).toContain("<PendingFillJournalOffers />");
  });
});

describe("B. no silent writes: the Journal only prefills the form", () => {
  const page = strip(read("app/journal/page.tsx"));
  it("the capture hand-off sets the FORM, never the entries", () => {
    const at = page.indexOf('q.get("capture") === "1"');
    expect(at).toBeGreaterThan(-1);
    const effect = page.slice(at, page.indexOf("window.history.replaceState", at));
    expect(effect).toContain("setForm(");
    expect(effect).not.toContain("setEntries(");
    expect(effect).not.toContain("localStorage.setItem");
  });
});

describe("C. unreported reads unreported", () => {
  it("a draft with no fill transactions renders 'unreported' with its UNREPORTED tag", () => {
    const order = readTastytradeOrder({ id: 5, status: "Filled", legs: [{ symbol: "AAPL", action: "Buy to Open", quantity: 1, "remaining-quantity": 0 }] })!;
    const r = journalCaptureFromFill({ intent: { decisionId: null, broker: "tastytrade", instrumentType: "Equity", action: "Buy to Open", qty: 1 }, order, fills: [], nowMs: 0 });
    if (!r.ok) throw new Error(r.reason);
    const html = renderToStaticMarkup(React.createElement(CapturedFacts, { capture: r.draft }));
    expect(html).toMatch(/data-testid="capture-fees" data-provenance="UNREPORTED"[^>]*>unreported</);
    expect(html).toMatch(/data-testid="capture-fillPx" data-provenance="UNREPORTED"[^>]*>unreported</);
    expect(html).toMatch(/data-testid="capture-pnlUsd" data-provenance="UNREPORTED"[^>]*>unreported</);
    expect(html).toMatch(/data-testid="capture-orderId" data-provenance="BROKER-REPORTED"[^>]*>5</);
  });
});
