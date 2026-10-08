/**
 * Journal auto-capture across every tastytrade fill shape seen in readback
 * (fixtures in tastytrade's own field names), and the two broker unknowns said
 * as UNKNOWN rather than guessed.
 */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StoryReviewRow } from "@/components/journal/BrokerTruthToday";
import { filledOrdersWithTickets } from "@/components/journal/FillJournalOffer";
import { readTastytradeFills } from "@/lib/broker/tastytradeFills";
import { readTastytradeOrder } from "@/lib/broker/tastytradeOrderState";
import { journalCaptureFromFill, type FillCaptureIntent } from "./journalCaptureFromFill";
import { freezePlanSnapshot } from "./managementPlan";
import { actualsFromBrokerStory, BROKER_READBACK_UNKNOWNS } from "./planActualsFromBroker";
import { sheriffColumns } from "./planSheriff";

const NOW = Date.parse("2026-10-07T15:00:00Z");
const intent: FillCaptureIntent = { decisionId: "wmd_shapes", broker: "tastytrade", accountTail: "6649", instrumentType: "Future", chartSymbol: "MNQ1!", action: "Buy to Open", qty: 3, orderType: "Limit", limitPx: 21400, protectiveStopPx: 21380, targetPx: 21450, multiplier: 2, sentAtMs: NOW - 60_000, quote: { bid: 21399.75, ask: 21400, atMs: NOW - 61_000 } };
const order = (o: Record<string, unknown>) => readTastytradeOrder({ id: 500, "order-type": "Limit", price: "21400", "external-identifier": "wmo_s", "updated-at": "2026-10-07T14:59:00Z",
  legs: [{ symbol: "/MNQZ6", action: "Buy to Open", quantity: 3, "remaining-quantity": 0 }], status: "Filled", ...o })!;
const fill = (id: number, qty: string, price: string, at: string, fees: Record<string, string> = { commission: "0.35", "clearing-fees": "0.19", "regulatory-fees": "0.02" }) =>
  ({ id, "transaction-type": "Trade", "order-id": 500, symbol: "/MNQZ6", "instrument-type": "Future", action: "Buy to Open", quantity: qty, price, value: "0", "value-effect": "None", "executed-at": at, ...fees });

describe("tastytrade fill shapes → journal capture", () => {
  it("one fill: price BROKER-REPORTED; fees summed from the separate commission / clearing / regulatory fields", () => {
    const d = journalCaptureFromFill({ intent, order: order({ legs: [{ symbol: "/MNQZ6", action: "Buy to Open", quantity: 1, "remaining-quantity": 0 }] }), fills: readTastytradeFills([fill(1, "1", "21400.25", "2026-10-07T14:59:00Z")]), nowMs: NOW });
    if (!d.ok) throw new Error(d.reason);
    expect(d.draft.fillPx).toMatchObject({ value: 21400.25, provenance: "BROKER-REPORTED" });
    expect(d.draft.fees).toMatchObject({ value: 0.56, provenance: "BROKER-REPORTED" });
    expect(d.draft.fees.source).toMatch(/each reported separately/);
  });

  it("several fills (one order filled in pieces): quantity-weighted price DERIVED, earliest fill time, fees summed", () => {
    const fills = readTastytradeFills([fill(1, "1", "21400", "2026-10-07T14:59:02Z"), fill(2, "2", "21400.5", "2026-10-07T14:59:01Z")]);
    const d = journalCaptureFromFill({ intent, order: order({}), fills, nowMs: NOW });
    if (!d.ok) throw new Error(d.reason);
    expect(d.draft.fillPx).toMatchObject({ value: 21400.333333, provenance: "DERIVED" });
    expect(d.draft.filledAt.value).toBe("2026-10-07T14:59:01Z");
    expect(d.draft.fees.value).toBe(1.12);
    expect(d.draft.filledQty).toMatchObject({ value: 3, provenance: "BROKER-REPORTED" });
  });

  it("partial fill still working → refused; partial fill then CANCELLED or EXPIRED → captured with the filled quantity", () => {
    const fills = readTastytradeFills([fill(1, "1", "21400", "2026-10-07T14:59:00Z")]);
    const working = order({ status: "Live", legs: [{ symbol: "/MNQZ6", action: "Buy to Open", quantity: 3, "remaining-quantity": 2 }] });
    expect(working.state).toBe("PARTIALLY FILLED");
    expect(journalCaptureFromFill({ intent, order: working, fills, nowMs: NOW }).ok).toBe(false);
    for (const status of ["Cancelled", "Expired"]) {
      const ended = order({ status, legs: [{ symbol: "/MNQZ6", action: "Buy to Open", quantity: 3, "remaining-quantity": 2 }] });
      const d = journalCaptureFromFill({ intent, order: ended, fills, nowMs: NOW });
      if (!d.ok) throw new Error(d.reason);
      expect(d.draft.filledQty.value).toBe(1);
      expect(d.draft.orderedQty.value).toBe(3);
      expect(d.draft.orderStatus.value).toBe(status);
    }
    // Cancelled with nothing filled is not a trade.
    expect(journalCaptureFromFill({ intent, order: order({ status: "Cancelled", legs: [{ symbol: "/MNQZ6", action: "Buy to Open", quantity: 3, "remaining-quantity": 3 }] }), fills: [], nowMs: NOW }).ok).toBe(false);
    // The reload offer keeps the partial-then-cancelled order too.
    const feed = { accounts: [{ broker: "tastytrade", orders: [{ id: "500", state: "CANCELED", filled: 1, externalId: "wmo_s" }, { id: "501", state: "CANCELED", filled: 0, externalId: "wmo_t" }] }] };
    expect(filledOrdersWithTickets(feed, new Set(["wmo_s", "wmo_t"])).map(o => o.id)).toEqual(["500"]);
  });

  it("multiple legs: refused as one trade, saying why (UNKNOWN how the legs pair) — never captured as leg 0", () => {
    const spread = order({ legs: [{ symbol: "./MNQZ6 MNQZ6 251219P21000", action: "Buy to Open", quantity: 1, "remaining-quantity": 0 }, { symbol: "./MNQZ6 MNQZ6 251219P20900", action: "Sell to Open", quantity: 1, "remaining-quantity": 0 }] });
    expect(spread.legCount).toBe(2);
    const r = journalCaptureFromFill({ intent, order: spread, fills: [], nowMs: NOW });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/2 legs .* journal each leg yourself \(UNKNOWN to WM how the legs pair\)/);
  });

  it("fees missing on a fill: UNREPORTED (not 0); missing on some fills: UNKNOWN total, never the partial sum", () => {
    const none = journalCaptureFromFill({ intent, order: order({}), fills: readTastytradeFills([fill(1, "3", "21400", "2026-10-07T14:59:00Z", {})]), nowMs: NOW });
    if (!none.ok) throw new Error(none.reason);
    expect(none.draft.fees).toMatchObject({ value: null, provenance: "UNREPORTED" });
    const mixed = journalCaptureFromFill({ intent, order: order({}), fills: readTastytradeFills([fill(1, "1", "21400", "2026-10-07T14:59:00Z"), fill(2, "2", "21400", "2026-10-07T14:59:01Z", {})]), nowMs: NOW });
    if (!mixed.ok) throw new Error(mixed.reason);
    expect(mixed.draft.fees.value).toBeNull();
    expect(mixed.draft.fees.source).toBe("tastytrade reported fees on 1 of 2 fills for this order — the total is UNKNOWN, not the partial sum");
    expect(readTastytradeFills([fill(9, "1", "1", "2026-10-07T14:59:00Z", { commission: "0" })])[0].feesReported).toBe(true);   // a reported 0 is a fee of 0
  });

  it("replaced stops: each stop order the readback holds is a move from the one before, timed by received-at", () => {
    const a = actualsFromBrokerStory({
      orders: [
        { id: "s1", action: "Sell to Close", orderType: "Stop", stopTrigger: "21380", receivedAt: "2026-10-07T14:59:30Z" },
        { id: "s2", action: "Sell to Close", orderType: "Stop", stopTrigger: "21395", receivedAt: "2026-10-07T15:01:00Z" },
        { id: "s3", action: "Sell to Close", orderType: "Stop Limit", stopTrigger: "21400", receivedAt: "2026-10-07T15:03:00Z" },
      ],
      fills: [],
    }, { stopPx: 21380, targetPx: null });
    expect(a.stopMoves.map(m => [m.fromPx, m.toPx])).toEqual([[21380, 21395], [21395, 21400]]);
  });
});

describe("the two broker unknowns are said as UNKNOWN in Review, never guessed", () => {
  const plan = freezePlanSnapshot({ decisionId: "wmd_shapes", frozenAt: "TICKET_SEND", atMs: NOW - 60_000, source: "t", plan: { direction: "LONG", stopPx: 21380, targetPx: 21450 } });
  const actuals = actualsFromBrokerStory({ orders: [], fills: [{ orderId: "500", action: "Buy to Open", quantity: 1, price: 21400, executedAt: "2026-10-07T14:59:00Z" }, { orderId: "501", action: "Sell to Close", quantity: 1, price: 21410, executedAt: "2026-10-07T15:04:00Z" }] }, { stopPx: 21380, targetPx: 21450 });
  it("the WHAT YOU ACTUALLY DID column says no stop move was SEEN, and names both unknowns", () => {
    const col = sheriffColumns({ plan, actuals, path: null }).actual;
    expect(col).toContain("No stop move seen in the readback.");
    for (const u of BROKER_READBACK_UNKNOWNS) expect(col).toContain(u);
    expect(BROKER_READBACK_UNKNOWNS[0]).toMatch(/^UNKNOWN: whether tastytrade's same-day order list keeps cancelled or replaced Stop orders/);
    expect(BROKER_READBACK_UNKNOWNS[1]).toMatch(/^UNKNOWN: whether a stop replaced at tastytrade keeps WM's order link/);
  });
  it("renders in the Review row; a journal-entry source (no broker readback) does not claim them", () => {
    const html = renderToStaticMarkup(React.createElement(StoryReviewRow, { storyKey: "k", plan: { plan, actuals, path: null }, defaultOpen: true }));
    expect(html).toContain("UNKNOWN: whether tastytrade&#x27;s same-day order list keeps cancelled or replaced Stop orders");
    const journalOnly = sheriffColumns({ plan, actuals: { ...actuals, unknowns: undefined, source: "journal entry" }, path: null }).actual;
    expect(journalOnly.some(l => l.startsWith("UNKNOWN"))).toBe(false);
  });
});
