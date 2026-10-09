/** §23 rows rendered per state: every control that cannot act is disabled with its reason at the control; the view sends nothing. */
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { TtOrderView } from "@/lib/broker/tastytradeOrderState";
import { READBACK_STALE_MS, selectBrokerOrderLines, type BrokerReadback } from "@/lib/execution/brokerOrderLines";
import { ticketBook, type TicketGate } from "@/lib/execution/ticketBook";
import { TicketBookRows, type CancelAck } from "./TicketBookRows";

const C = "/MNQZ6";
const NOW = Date.parse("2026-10-08T18:30:00Z");
const OPEN: TicketGate = { killSwitch: false, limitsSet: true };
const ORDER = { id: "101", status: "Live", state: "WORKING", symbol: C, action: "Sell to Close", quantity: 1, filled: 0, price: null, stopTrigger: "24900", orderType: "Stop", externalId: null, cancellable: true, rejectReason: null, updatedAt: null } as TtOrderView;
const LONG = { symbol: C, quantity: 1, direction: "Long" as const, averageOpenPrice: 25_000, instrumentType: "Future" };
const rb = (over: Partial<BrokerReadback>): BrokerReadback => ({ asOfMs: NOW - 1000, ok: true, orders: [], positions: [], tails: ["5019"], orderAccounts: { "101": { index: 0, tail: "5019" } }, ...over });
const html = (r: BrokerReadback | null, gate = OPEN, acks: Record<string, CancelAck> = {}, busyId: string | null = null, now = NOW) =>
  renderToStaticMarkup(<TicketBookRows book={ticketBook(r ? selectBrokerOrderLines(r, C, 25_010, 2, now) : null, C, gate)} acks={acks} busyId={busyId} onCancel={() => {}} onFlatten={() => {}} />).replace(/&amp;/g, "&").replace(/&#x27;/g, "'");

describe("TicketBookRows — the four rows are always present, with honest states", () => {
  it("never read: NOT READ · not read · NOTHING TO MODIFY · FLATTEN NOT READ; no cancel, no flatten button", () => {
    const h = html(null);
    expect(h).toContain('data-testid="trade-broker-position" data-state="NOT READ"');
    expect(h).toContain("WORKING ORDERS · not read");
    expect(h).toContain('data-testid="trade-modify" data-state="NOTHING TO MODIFY"');
    expect(h).toContain('data-testid="trade-flatten-row" data-state="NOT READ"');
    expect(h).not.toContain('data-testid="trade-cancel-working"');
    expect(h).not.toContain('data-testid="trade-flatten"');
  });
  it("flat: FLAT · none on this contract · NOTHING TO FLATTEN", () => {
    const h = html(rb({}));
    expect(h).toContain('data-testid="trade-broker-position" data-state="FLAT"');
    expect(h).toMatch(/FLAT · 0 working · read .+ from …5019/);
    expect(h).toContain("WORKING ORDERS · none on this contract");
    expect(h).toContain('data-testid="trade-flatten-row" data-state="NOTHING TO FLATTEN"');
  });
  it("holding with a working stop: PROTECTED, an enabled Cancel, MODIFY says cancel-then-new, FLATTEN loadable", () => {
    const h = html(rb({ positions: [LONG], orders: [ORDER] }));
    expect(h).toContain('data-state="HOLDING" data-protection="PROTECTED"');
    expect(h).toMatch(/<button type="button" data-testid="trade-cancel-working"(?! disabled)[^>]*>Cancel order<\/button>/);
    expect(h).toContain("WORKING at tastytrade · #101 · Sell to Close 1 /MNQZ6 · trigger 24900 · …5019");
    expect(h).toContain('data-testid="trade-modify" data-state="NOT WIRED · cancel, then a new order"');
    expect(h).toContain("MODIFY is not an atomic replace here");
    expect(h).toMatch(/<button type="button" data-testid="trade-flatten"(?! disabled)[^>]*>Load FLATTEN<\/button>/);
  });
  it("kill switch: FLATTEN disabled with the reason at the control; MODIFY refusal shown; Cancel stays enabled", () => {
    const h = html(rb({ positions: [LONG], orders: [ORDER] }), { killSwitch: true, limitsSet: true });
    expect(h).toMatch(/data-testid="trade-flatten" disabled="" aria-describedby="trade-flatten-refusal"/);
    expect(h).toContain("KILL SWITCH ENGAGED — a closing order is still a new order here");
    expect(h).toContain('data-testid="trade-modify-refusal"');
    expect(h).toMatch(/data-testid="trade-cancel-working"(?! disabled)/);
  });
  it("server limits not set: the refusal is at the FLATTEN and MODIFY controls", () => {
    const h = html(rb({ positions: [LONG], orders: [ORDER] }), { killSwitch: false, limitsSet: false });
    expect(h).toContain("Server limits are not set — every live send is refused, including this closing order.");
    expect(h).toContain("Server limits are not set — the new order after the cancel is refused until they are saved in Settings › Execution.");
  });
  it("stale readback: RECONCILING, FLATTEN refused, the order line says RECONCILING, Cancel still enabled", () => {
    const h = html(rb({ positions: [LONG], orders: [ORDER] }), OPEN, {}, null, NOW + READBACK_STALE_MS + 5_000);
    expect(h).toContain('data-testid="trade-broker-position" data-state="RECONCILING"');
    expect(h).toContain('data-testid="trade-flatten-row" data-state="REFUSED"');
    expect(h).toContain("· RECONCILING");
    expect(h).toMatch(/data-testid="trade-cancel-working"(?! disabled)/);
  });
  it("not cancellable: the Cancel control is disabled and points at its reason", () => {
    const h = html(rb({ orders: [{ ...ORDER, cancellable: false }] }));
    expect(h).toMatch(/data-testid="trade-cancel-working" disabled="" aria-describedby="trade-cancel-refusal-101"/);
    expect(h).toContain("tastytrade reports this order cannot be cancelled right now.");
  });
  it("after a cancel request: the broker's ack words, and the control does not fire twice; while busy it says requested", () => {
    const acked = html(rb({ orders: [ORDER] }), OPEN, { "101": { state: "CANCEL_PENDING", words: "CANCEL REQUESTED · not yet confirmed" } });
    expect(acked).toContain('data-testid="trade-cancel-ack" data-state="CANCEL_PENDING"');
    expect(acked).toContain("tastytrade: CANCEL REQUESTED · not yet confirmed");
    expect(acked).toMatch(/data-testid="trade-cancel-working" disabled=""/);
    expect(html(rb({ orders: [ORDER] }), OPEN, {}, "101")).toContain("Cancel requested…");
  });
  it("PROOF SCENE refusal: Cancel and Load FLATTEN are disabled and each points at 'PROOF SCENE · nothing can be sent'; MODIFY shows it too", () => {
    const scene: TicketGate = { killSwitch: false, limitsSet: true, proofRefusal: "PROOF SCENE · nothing can be sent" };
    const h = html(rb({ positions: [LONG], orders: [ORDER] }), scene);
    expect(h).toMatch(/data-testid="trade-cancel-working" disabled="" aria-describedby="trade-cancel-refusal-101"/);
    expect(h).toMatch(/id="trade-cancel-refusal-101" role="status" data-testid="trade-cancel-refusal"[^>]*>PROOF SCENE · nothing can be sent</);
    expect(h).toMatch(/data-testid="trade-flatten" disabled="" aria-describedby="trade-flatten-refusal"/);
    expect(h).toMatch(/id="trade-flatten-refusal" role="status" data-testid="trade-flatten-refusal"[^>]*>PROOF SCENE · nothing can be sent</);
    expect(h).toMatch(/data-testid="trade-modify-refusal"[^>]*>PROOF SCENE · nothing can be sent</);
    expect(h).toContain('data-state="HOLDING" data-protection="PROTECTED"');
    expect(h.match(/PROOF SCENE · nothing can be sent/g) ?? []).toHaveLength(3);
    // No enabled control that could cancel or flatten remains.
    expect(h).not.toMatch(/<button type="button" data-testid="trade-(cancel-working|flatten)"(?! disabled)/);
  });
  it("the view has no network, no storage and no order route in its source", () => {
    const src = readFileSync(path.resolve(__dirname, "TicketBookRows.tsx"), "utf8");
    expect(src.length).toBeGreaterThan(2_000);
    expect(src).not.toMatch(/fetch\(|order-submit|localStorage|sessionStorage|method:/);
  });
});
