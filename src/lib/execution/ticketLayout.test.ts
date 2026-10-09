/** Compact phone ticket: one ticket, action path first, the rest behind ONE Details disclosure; nothing dropped, no reason hidden. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { selectBrokerOrderLines, type BrokerReadback } from "./brokerOrderLines";
import { ticketBook } from "./ticketBook";
import { COMPACT_MAX_HEIGHT, COMPACT_TICKET_MAX_WIDTH, COMPACT_TICKET_QUERY, compactRiskLine, detailsSummary, ticketSections } from "./ticketLayout";

const NOW = Date.parse("2026-10-08T18:30:00Z");
const rb = (over: Partial<BrokerReadback>): BrokerReadback => ({ asOfMs: NOW - 1000, ok: true, orders: [], positions: [], tails: ["5019"], orderAccounts: {}, ...over });
const book = (r: BrokerReadback | null, gate = { killSwitch: false, limitsSet: true }) => ticketBook(r ? selectBrokerOrderLines(r, "/NQZ6", 100, 20, NOW) : null, "/NQZ6", gate);

describe("ticketSections — one ticket, two orders", () => {
  it("the phone breakpoint is 430 px", () => {
    expect(COMPACT_TICKET_MAX_WIDTH).toBe(430);
    expect(COMPACT_TICKET_QUERY).toBe("(max-width: 430px)");
    expect(COMPACT_MAX_HEIGHT).toBe("52vh");
  });
  it("tablet / desktop: the flowing order, nothing folded, no phone-only line", () => {
    const l = ticketSections(false);
    expect(l.details).toEqual([]);
    expect(l.action).toEqual(["QUOTE", "PROPOSAL", "BOOK", "SIDE_SIZE", "ENTRY_TYPE", "PRICE", "RISK_INPUTS", "ECONOMICS", "PICK_STATUS", "PROTECTION_DRYRUN", "PLAN", "LIVE_ORDER", "PROTECT"]);
  });
  it("phone: side → quantity → price → stop/target → risk line → preview/confirm come first; book / modify / flatten / protect fold", () => {
    const l = ticketSections(true);
    expect(l.action).toEqual(["QUOTE", "PROPOSAL", "SIDE_SIZE", "PRICE", "RISK_INPUTS", "RISK_LINE", "PICK_STATUS", "LIVE_ORDER"]);
    expect(l.details).toEqual(["BOOK", "ENTRY_TYPE", "ECONOMICS", "PROTECTION_DRYRUN", "PLAN", "PROTECT"]);
    expect(l.action.indexOf("SIDE_SIZE")).toBeLessThan(l.action.indexOf("LIVE_ORDER"));
  });
  it("nothing is dropped and nothing is rendered twice: phone = desktop's sections + the one risk line", () => {
    const full = ticketSections(false).action;
    const phone = [...ticketSections(true).action, ...ticketSections(true).details];
    expect(new Set(phone).size).toBe(phone.length);
    expect([...phone].filter(x => x !== "RISK_LINE").sort()).toEqual([...full].sort());
  });
});

describe("detailsSummary — the disclosure states the book before it is opened", () => {
  it("flat, not read, working orders, and refusals are counted", () => {
    expect(detailsSummary(book(rb({})))).toBe("Details · FLAT · 0 working");
    expect(detailsSummary(book(null))).toBe("Details · NOT READ · 0 working");
    const order = { id: "101", status: "Live", state: "WORKING", symbol: "/NQZ6", action: "Sell to Close", quantity: 1, filled: 0, price: null, stopTrigger: "99", orderType: "Stop", externalId: null, cancellable: true, rejectReason: null, updatedAt: null } as never;
    const held = rb({ orders: [order], positions: [{ symbol: "/NQZ6", quantity: 1, direction: "Long", averageOpenPrice: 100, instrumentType: "Future" }], orderAccounts: { "101": { index: 0, tail: "5019" } } });
    expect(detailsSummary(book(held))).toBe("Details · HOLDING · 1 working");
    expect(detailsSummary(book(held, { killSwitch: true, limitsSet: true }))).toBe("Details · HOLDING · 1 working · 2 refused");
  });
});

describe("compactRiskLine — the wrong-side refusal is never folded away", () => {
  it("wrong side is a refusal, said beside the stop", () => {
    expect(compactRiskLine({ stopWrongSide: true, riskUsd: 10, rewardUsd: 20, entryKnown: true })).toEqual({ refusal: true, text: "The stop is on the wrong side of the entry — an opening order would be refused." });
  });
  it("risk, reward and R; unset stop; unknown entry", () => {
    expect(compactRiskLine({ stopWrongSide: false, riskUsd: 50, rewardUsd: 125, entryKnown: true }).text).toBe("Risk −$50.00 · Reward +$125.00 · 2.50R");
    expect(compactRiskLine({ stopWrongSide: false, riskUsd: null, rewardUsd: null, entryKnown: true }).text).toBe("Risk: set a stop");
    expect(compactRiskLine({ stopWrongSide: false, riskUsd: null, rewardUsd: null, entryKnown: false }).text).toBe("Risk: entry fill unknown");
  });
});

describe("TradePanel is ONE ticket in both layouts", () => {
  const T = readFileSync(path.resolve(__dirname, "../../components/chart/TradePanel.tsx"), "utf8");
  it("sections are built once and handed to the layout; KILL stays in the header; the phone height is capped", () => {
    expect(T.length).toBeGreaterThan(20_000);
    expect(T).toContain("const sectionEl: Record<TicketSection, React.ReactNode> = {");
    expect(T).toContain("<TicketSections compact={compact} sections={sectionEl} summary={detailsSummary(book)} />");
    expect(T.match(/<TastytradeLiveOrder\b/g) ?? []).toHaveLength(3);          // entry + stop + target — not duplicated for the phone
    expect(T.match(/<TicketBookRows\b/g) ?? []).toHaveLength(1);
    expect(T.match(/data-testid="trade-buy"/g) ?? []).toHaveLength(1);
    expect(T).toContain('maxHeight: compact ? COMPACT_MAX_HEIGHT : "72vh"');
    expect(T).toContain("window.matchMedia?.(COMPACT_TICKET_QUERY)");
    // KILL is in the header, outside every section and every disclosure.
    const header = T.slice(T.indexOf('<header data-testid="trade-header"'), T.indexOf("</header>"));
    expect(header).toContain('data-testid="trade-kill-switch"');
    expect(T.slice(T.indexOf("const sectionEl"), T.indexOf("  return (\n    <section"))).not.toContain("trade-kill-switch");
  });
});
