/** §23 book rows on the ticket: POSITION STATE · WORKING ORDERS (cancel) · MODIFY · FLATTEN — readback only, fail-closed. */
import { describe, expect, it } from "vitest";

import type { TtOrderView } from "@/lib/broker/tastytradeOrderState";
import { READBACK_STALE_MS, selectBrokerOrderLines, type BrokerReadback } from "./brokerOrderLines";
import { CANCEL_REPLACE_LIMITS } from "./liveOrderLifecycle";
import { brokerStateWords, ticketBook, type TicketGate } from "./ticketBook";

const C = "/MNQZ6";
const NOW = Date.parse("2026-10-08T18:30:00Z");
const OPEN: TicketGate = { killSwitch: false, limitsSet: true };
const order = (over: Partial<TtOrderView>): TtOrderView => ({
  id: "101", status: "Live", state: "WORKING", symbol: C, action: "Sell to Close", quantity: 1, filled: 0, price: null, stopTrigger: "24900", orderType: "Stop",
  externalId: null, cancellable: true, rejectReason: null, updatedAt: null, ...over,
} as TtOrderView);
const rb = (over: Partial<BrokerReadback>): BrokerReadback => ({ asOfMs: NOW - 1000, ok: true, orders: [], positions: [], tails: ["5019"], orderAccounts: {}, ...over });
const lines = (r: BrokerReadback, now = NOW) => selectBrokerOrderLines(r, C, 25_010, 2, now);
const LONG = { symbol: C, quantity: 1, direction: "Long" as const, averageOpenPrice: 25_000, instrumentType: "Future" };

describe("POSITION STATE — from the readback only", () => {
  it("no readback at all → NOT READ, nothing assumed flat", () => {
    const b = ticketBook(null, C, OPEN);
    expect(b.position.state).toBe("NOT READ");
    expect(b.position.words).toBe("Position and working orders: not read from tastytrade yet — nothing is assumed flat.");
    expect(ticketBook(lines(rb({ asOfMs: null, ok: false })), C, OPEN).position.state).toBe("NOT READ");
  });
  it("fresh and flat → FLAT with the working count, the read time and the account tails", () => {
    const b = ticketBook(lines(rb({})), C, OPEN);
    expect(b.position.state).toBe("FLAT");
    expect(b.position.words).toMatch(/^FLAT · 0 working · read .+ from …5019$/);
  });
  it("fresh and holding → direction, quantity, average, protection and P&L as read", () => {
    const b = ticketBook(lines(rb({ positions: [LONG] })), C, OPEN);
    expect(b.position).toMatchObject({ state: "HOLDING", protection: "UNPROTECTED" });
    expect(b.position.words).toMatch(/^LONG 1 \/MNQZ6 @ 25000 · UNPROTECTED · P&L \+\$20\.00 · 0 working · read .+ from …5019$/);
    const prot = ticketBook(lines(rb({ positions: [LONG], orders: [order({})], orderAccounts: { "101": { index: 0, tail: "5019" } } })), C, OPEN);
    expect(prot.position.protection).toBe("PROTECTED");
    expect(prot.position.words).toContain("STOP WORKING");
  });
  it("stale readback → RECONCILING: the last read is named as last, nothing is current, protection is not claimed", () => {
    const b = ticketBook(lines(rb({ positions: [LONG] }), NOW + READBACK_STALE_MS + 5_000), C, OPEN);
    expect(b.position.state).toBe("RECONCILING");
    expect(b.position.protection).toBeNull();
    expect(b.position.words).toMatch(/^RECONCILING · tastytrade has not answered recently \(last read LONG 1 @ 25000, .+\)\. Nothing here is treated as current\.$/);
  });
});

describe("WORKING ORDERS — each has a cancel; the words are the broker's", () => {
  const withOrder = (o: Partial<TtOrderView>, accounts: BrokerReadback["orderAccounts"] = { "101": { index: 1, tail: "6649" } }) =>
    ticketBook(lines(rb({ orders: [order(o)], orderAccounts: accounts })), C, OPEN);
  it("a working order: broker state words, id, action, trigger; cancel allowed with its account index", () => {
    const [w] = withOrder({}).working;
    expect(w).toMatchObject({ id: "101", accountIndex: 1, tail: "6649", state: "WORKING", cancel: { allowed: true, reason: null } });
    expect(w.words).toBe("WORKING at tastytrade · #101 · Sell to Close 1 /MNQZ6 · trigger 24900");
  });
  it("partially filled and cancel-pending use the broker's own state", () => {
    expect(withOrder({ state: "PARTIALLY FILLED", filled: 1, quantity: 3, price: "25050", stopTrigger: null, orderType: "Limit" }).working[0].words).toBe("PARTIALLY FILLED · #101 · Sell to Close filled 1 of 3 · 2 still working /MNQZ6 @ 25050"); // 2026-10-10: both halves said
    expect(withOrder({ state: "CANCEL_PENDING" }).working[0].words).toMatch(/^CANCEL REQUESTED · not yet confirmed · #101/);
  });
  it("cancel is refused AT the control when tastytrade says not cancellable, or the account was not read back", () => {
    expect(withOrder({ cancellable: false }).working[0].cancel).toEqual({ allowed: false, reason: "tastytrade reports this order cannot be cancelled right now." });
    expect(withOrder({}, {}).working[0].cancel).toEqual({ allowed: false, reason: "The account this order sits in was not read back — cancel it at tastytrade." });
  });
  it("cancel stays OPEN under the kill switch and with no server limits (exit is never trapped)", () => {
    const b = ticketBook(lines(rb({ orders: [order({})], orderAccounts: { "101": { index: 0, tail: "5019" } } })), C, { killSwitch: true, limitsSet: false });
    expect(b.working[0].cancel.allowed).toBe(true);
  });
  it("orders on another contract, and terminal orders, are not listed", () => {
    const b = ticketBook(lines(rb({ orders: [order({ id: "7", symbol: "/ESZ6" }), order({ id: "8", state: "FILLED" }), order({ id: "9", state: "CANCELED" })] })), C, OPEN);
    expect(b.working).toEqual([]);
  });
  it("brokerStateWords never invents a state", () => {
    expect(brokerStateWords({ state: "UNKNOWN" })).toBe("UNKNOWN · may be at the broker — do not resend");
    expect(brokerStateWords({ state: "FILLED" })).toBe("FILLED");
  });
});

describe("MODIFY — never an atomic replace", () => {
  const one = (gate: TicketGate) => ticketBook(lines(rb({ orders: [order({})], orderAccounts: { "101": { index: 0, tail: "5019" } } })), C, gate);
  it("says plainly it is cancel, then a new order", () => {
    const m = one(OPEN).modify;
    expect(m.state).toBe("NOT WIRED · cancel, then a new order");
    expect(m.words).toBe(CANCEL_REPLACE_LIMITS);
    expect(m.words).toMatch(/^MODIFY is not an atomic replace here/);
    expect(m.refusal).toBeNull();
  });
  it("the refusal of the NEW order is at the control: kill switch, then unset server limits", () => {
    expect(one({ killSwitch: true, limitsSet: true }).modify.refusal).toBe("KILL SWITCH ENGAGED — the new order after the cancel is refused. Cancel stays open.");
    expect(one({ killSwitch: false, limitsSet: false }).modify.refusal).toBe("Server limits are not set — the new order after the cancel is refused until they are saved in Settings › Execution.");
  });
  it("nothing working → NOTHING TO MODIFY, no refusal", () => {
    expect(ticketBook(lines(rb({})), C, { killSwitch: true, limitsSet: false }).modify).toMatchObject({ state: "NOTHING TO MODIFY", refusal: null });
  });
});

describe("FLATTEN — a closing MARKET order for the held quantity, loaded, never sent", () => {
  const held = (gate: TicketGate, now = NOW) => ticketBook(lines(rb({ positions: [{ ...LONG, quantity: 2 }] }), now), C, gate);
  it("holding + fresh + open gate → LOADABLE with planFlatten's exact plan", () => {
    const f = held(OPEN).flatten;
    expect(f.state).toBe("LOADABLE");
    expect(f.plan).toEqual({ action: "Sell to Close", qty: 2, type: "Market", symbol: C });
    expect(f.words).toBe("SELL TO CLOSE 2 /MNQZ6 · MARKET · loads into this ticket; still needs preview and your confirmation.");
  });
  it("REFUSED with the reason: stale readback, kill switch, unset limits", () => {
    expect(held(OPEN, NOW + READBACK_STALE_MS + 5_000).flatten).toMatchObject({ state: "REFUSED", plan: null, refusal: "Readback is stale — the held quantity may have changed. Reconcile first." });
    expect(held({ killSwitch: true, limitsSet: true }).flatten).toMatchObject({ state: "REFUSED", refusal: "KILL SWITCH ENGAGED — a closing order is still a new order here; release it in Settings › Execution to flatten." });
    expect(held({ killSwitch: false, limitsSet: false }).flatten.refusal).toBe("Server limits are not set — every live send is refused, including this closing order.");
  });
  it("flat → NOTHING TO FLATTEN; never read → NOT READ", () => {
    expect(ticketBook(lines(rb({})), C, OPEN).flatten).toMatchObject({ state: "NOTHING TO FLATTEN", plan: null });
    expect(ticketBook(null, C, OPEN).flatten).toMatchObject({ state: "NOT READ", plan: null });
  });
});
