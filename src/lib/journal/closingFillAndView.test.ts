import { afterEach, describe, expect, it, vi } from "vitest";

import { readTastytradeFills } from "@/lib/broker/tastytradeFills";
import { readTastytradeOrder } from "@/lib/broker/tastytradeOrderState";
import { clearOwnerScopedLocalStorage } from "@/lib/logoutIsolation";
import { closingResultForOrder } from "./closingFillResult";
import { journalCaptureFromFill } from "./journalCaptureFromFill";
import { TICKET_AT_SEND_KEY, TICKET_AT_SEND_TTL_MS, forgetTicketAtSend, readTicketIntent, rememberTicketAtSend, ticketForOrder, ticketsAtSend } from "./ticketAtSendStore";
import { viewNameAtSend } from "./viewAtSend";

/* ── FIXTURE: a long /MNQZ6 round trip — two opening fills (order 100), one closing fill (order 200). ── */
const tx = (id: number, order: number, action: string, qty: string, price: string, value: string, effect: string, at: string) => ({
  id, "transaction-type": "Trade", "order-id": order, symbol: "/MNQZ6", "instrument-type": "Future", action, quantity: qty, price,
  value, "value-effect": effect, commission: "0.35", "clearing-fees": "0.19", "regulatory-fees": "0.02", "executed-at": at,
});
const FILLS = readTastytradeFills([
  tx(1, 100, "Buy to Open", "1", "21480.0", "0", "None", "2026-10-07T14:31:04Z"),
  tx(2, 100, "Buy to Open", "1", "21480.5", "0", "None", "2026-10-07T14:31:05Z"),
  tx(3, 200, "Sell to Close", "2", "21500.25", "80", "Credit", "2026-10-07T15:02:00Z"),
]);

describe("closing fills carry tastytrade's own round-trip result", () => {
  it("finds the trip the closing order finished, with the broker's net and the opening average", () => {
    const r = closingResultForOrder(FILLS, "200");
    // value 80 − fees 3 × 0.56 = 78.32 (tastytrade's numbers, paired by the ledger owner).
    expect(r).toEqual({ net: 78.32, fees: 1.68, closedAt: "2026-10-07T15:02:00Z", openAvgPx: 21480.25, qty: 2 });
  });

  it("refuses an opening order, an unknown order, and a window that starts mid-position", () => {
    expect(closingResultForOrder(FILLS, "100")).toBeNull();
    expect(closingResultForOrder(FILLS, "999")).toBeNull();
    // Only the second opening fill and the close are visible: the trip WM sees is not flat-to-flat.
    expect(closingResultForOrder(FILLS.filter(f => f.id !== "1"), "200")).toBeNull();
    // Only the close is visible: its first fill is not an opening fill.
    expect(closingResultForOrder(FILLS.filter(f => f.id === "3"), "200")).toBeNull();
  });

  it("→ the draft: P&L BROKER-REPORTED, 1R from the opening average vs the planned stop, R DERIVED", () => {
    const order = readTastytradeOrder({ id: 200, status: "Filled", "order-type": "Limit", price: "21500.25", legs: [{ symbol: "/MNQZ6", action: "Sell to Close", quantity: 2, "remaining-quantity": 0 }] })!;
    const res = journalCaptureFromFill({
      intent: { decisionId: "wmd_1", broker: "tastytrade", instrumentType: "Future", action: "Sell to Close", qty: 2, plannedStopPx: 21470, multiplier: 2 },
      order, fills: FILLS, brokerResult: closingResultForOrder(FILLS, "200"), nowMs: 0,
    });
    if (!res.ok) throw new Error(res.reason);
    expect(res.draft.pnlUsd).toMatchObject({ value: 78.32, provenance: "BROKER-REPORTED" });
    expect(res.draft.stopPx).toMatchObject({ value: 21470, provenance: "TICKET-INTENT" });
    expect(res.draft.plannedRiskUsd).toMatchObject({ value: 41, provenance: "DERIVED" });
    expect(res.draft.realizedR).toMatchObject({ value: 1.9102, provenance: "DERIVED" });
  });

  it("without a round trip a closing fill's P&L and R stay UNREPORTED", () => {
    const order = readTastytradeOrder({ id: 200, status: "Filled", legs: [{ symbol: "/MNQZ6", action: "Sell to Close", quantity: 2, "remaining-quantity": 0 }] })!;
    const res = journalCaptureFromFill({ intent: { decisionId: null, broker: "tastytrade", instrumentType: "Future", action: "Sell to Close", qty: 2, plannedStopPx: 21470, multiplier: 2 }, order, fills: FILLS, brokerResult: null, nowMs: 0 });
    if (!res.ok) throw new Error(res.reason);
    expect(res.draft.pnlUsd.value).toBeNull();
    expect(res.draft.realizedR.value).toBeNull();
  });
});

describe("the View at send is read from the live switches and the Views owner", () => {
  const capture = { ABSORPTION: true, IMBALANCE_STACK: true, SESSION: false };
  it("the trader's own named View in force wins", () => {
    expect(viewNameAtSend(capture, [{ name: "Scalp A", switches: { ABSORPTION: true, IMBALANCE_STACK: true } }, { name: "Other", switches: { ABSORPTION: false } }])).toBe("Scalp A");
  });
  it("then an edited starter, by its name", () => {
    expect(viewNameAtSend(capture, [{ name: "Order Flow", starter: "ORDER_FLOW", switches: { ABSORPTION: true } }])).toBe("Order Flow view");
  });
  it("no capture (no chart room answering) or nothing in force → null, never a guessed View", () => {
    expect(viewNameAtSend(null, [{ name: "Scalp A", switches: { ABSORPTION: true } }])).toBeNull();
    expect(viewNameAtSend({ SESSION: false }, [{ name: "Scalp A", switches: { ABSORPTION: true } }])).toBeNull();
  });
});

describe("the at-send ticket record survives a reload, expires, and is cleared at sign-out", () => {
  const mem = () => {
    const m = new Map<string, string>();
    return { m, s: { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } };
  };
  const T = { decisionId: "wmd_1", view: "Scalp A", broker: "tastytrade" as const, instrumentType: "Future", action: "Buy to Open", qty: 1, plannedStopPx: 10, quote: { bid: 1, ask: 2, atMs: 3 } };

  it("remembers by client order id, reads back, forgets", () => {
    const { s } = mem();
    rememberTicketAtSend(s, "wmo_a", T, 1000);
    expect(ticketForOrder(s, "wmo_a", 2000)).toMatchObject({ decisionId: "wmd_1", view: "Scalp A", plannedStopPx: 10, quote: { bid: 1, ask: 2, atMs: 3 } });
    expect(ticketForOrder(s, null, 2000)).toBeNull();
    expect(ticketsAtSend(s, 1000 + TICKET_AT_SEND_TTL_MS + 1)).toEqual([]);
    forgetTicketAtSend(s, "wmo_a", 2000);
    expect(ticketForOrder(s, "wmo_a", 2000)).toBeNull();
  });

  it("an unreadable stored field reads null, never a default value", () => {
    expect(readTicketIntent({ ...T, plannedStopPx: "10", view: 4 })).toMatchObject({ plannedStopPx: null, view: null });
    expect(readTicketIntent({ ...T, broker: "webull" })).toBeNull();
  });

  afterEach(() => { vi.unstubAllGlobals(); });
  it("sign-out removes it from sessionStorage", () => {
    const local = mem();
    const session = mem();
    rememberTicketAtSend(session.s, "wmo_a", T, 1000);
    vi.stubGlobal("window", { localStorage: { ...local.s, length: 0, key: () => null }, sessionStorage: session.s });
    clearOwnerScopedLocalStorage();
    expect(session.m.has(TICKET_AT_SEND_KEY)).toBe(false);
  });
});
