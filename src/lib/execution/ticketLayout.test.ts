/** Compact phone ticket: one ticket, action path first, the rest behind ONE Details disclosure; nothing dropped, no reason hidden. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { selectBrokerOrderLines, type BrokerReadback } from "./brokerOrderLines";
import { ticketBook } from "./ticketBook";
import { COMPACT_ACT_MAX_HEIGHT, COMPACT_BUILD_SECTIONS, COMPACT_PEEK_MAX_HEIGHT, COMPACT_PEEK_SECTIONS, COMPACT_REVIEW_SECTIONS, COMPACT_TICKET_MAX_WIDTH, COMPACT_TICKET_QUERY, compactRiskLine, detailsSummary, foldControl, reviewGate, ticketSections, ticketStage, ticketStep } from "./ticketLayout";

const NOW = Date.parse("2026-10-08T18:30:00Z");
const rb = (over: Partial<BrokerReadback>): BrokerReadback => ({ asOfMs: NOW - 1000, ok: true, orders: [], positions: [], tails: ["5019"], orderAccounts: {}, ...over });
const book = (r: BrokerReadback | null, gate = { killSwitch: false, limitsSet: true }) => ticketBook(r ? selectBrokerOrderLines(r, "/NQZ6", 100, 20, NOW) : null, "/NQZ6", gate);

describe("ticketSections — one ticket, two orders", () => {
  it("the phone breakpoint is 430 px", () => {
    expect(COMPACT_TICKET_MAX_WIDTH).toBe(430);
    expect(COMPACT_TICKET_QUERY).toBe("(max-width: 430px)");
    expect([COMPACT_PEEK_MAX_HEIGHT, COMPACT_ACT_MAX_HEIGHT]).toEqual(["40svh", "72svh"]);
  });
  it("tablet / desktop: the flowing order, nothing folded, no phone-only line", () => {
    const l = ticketSections(false);
    expect(l.details).toEqual([]);
    expect(l.action).toEqual(["QUOTE", "PROPOSAL", "BOOK", "SIDE", "CLOSING", "ACTION_LINE", "SIZE", "ENTRY_TYPE", "PRICE", "RISK_INPUTS", "ECONOMICS", "PICK_STATUS", "PROTECTION_DRYRUN", "PLAN", "LIVE_ORDER", "PROTECT"]);
  });
  it("phone: side → quantity → price → stop/target → risk line → preview/confirm come first; book / modify / flatten / protect fold", () => {
    const l = ticketSections(true);
    expect(l.action).toEqual(["QUOTE", "PROPOSAL", "SIDE", "ACTION_LINE", "CLOSING", "SIZE", "PRICE", "RISK_INPUTS", "RISK_LINE", "PICK_STATUS", "LIVE_ORDER"]);
    expect(l.details).toEqual(["BOOK", "ENTRY_TYPE", "ECONOMICS", "PROTECTION_DRYRUN", "PLAN", "PROTECT"]);
    expect(l.action.indexOf("SIDE")).toBeLessThan(l.action.indexOf("SIZE"));
    expect(l.action.indexOf("SIZE")).toBeLessThan(l.action.indexOf("LIVE_ORDER"));
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
    expect(T.match(/<TastytradeLiveOrder\b/g) ?? []).toHaveLength(3);          // entry + stop + target — not duplicated for the phone
    expect(T.match(/<TicketBookRows\b/g) ?? []).toHaveLength(1);
    expect(T.match(/data-testid="trade-buy"/g) ?? []).toHaveLength(1);
    expect(T).toContain('maxHeight: stage === "PEEK" ? COMPACT_PEEK_MAX_HEIGHT : stage === "ACT" ? COMPACT_ACT_MAX_HEIGHT : "72vh"');
    expect(T).toContain('<TicketSections compact={compact} peek={stage === "PEEK"} step={step} review={review} inFlight={!stageInput.preSend}');
    expect(T).toContain("onReview={() => { if (review.allowed) setReviewing(true); }} onEdit={() => { if (stageInput.preSend) setReviewing(false); }}");
    expect(T).toContain("const step = ticketStep({ stage, reviewing, preSend: stageInput.preSend });");
    expect(T).toContain("const stageInput = { compact, sidePicked: side != null, folded, preSend: isPreSendPhase(entryPhase) && scene?.state !== \"inflight\" };");
    expect(T).toContain("onClick={() => { if (fold.enabled) setFolded(v => !v); }}");
    expect(T).toContain("window.matchMedia?.(COMPACT_TICKET_QUERY)");
    // KILL is in the header, outside every section and every disclosure.
    const header = T.slice(T.indexOf('<header data-testid="trade-header"'), T.indexOf("</header>"));
    expect(header).toContain('data-testid="trade-kill-switch"');
    expect(T.slice(T.indexOf("const sectionEl"), T.indexOf("  return (\n    <section"))).not.toContain("trade-kill-switch");
  });
});

describe("PEEK / ACT — fold to see the chart, grow to act", () => {
  const base = { compact: true, sidePicked: false, folded: false, preSend: true };
  it("tablet / desktop is always FULL", () => {
    expect(ticketStage({ ...base, compact: false })).toBe("FULL");
    expect(ticketStage({ compact: false, sidePicked: true, folded: true, preSend: false })).toBe("FULL");
  });
  it("phone: PEEK while no side is picked or when folded; ACT once a side is picked", () => {
    expect(ticketStage(base)).toBe("PEEK");
    expect(ticketStage({ ...base, sidePicked: true })).toBe("ACT");
    expect(ticketStage({ ...base, sidePicked: true, folded: true })).toBe("PEEK");
  });
  it("an order in flight is ALWAYS ACT — its state is never folded away, even if the fold was pressed before", () => {
    expect(ticketStage({ ...base, sidePicked: true, folded: true, preSend: false })).toBe("ACT");
    expect(ticketStage({ ...base, sidePicked: false, folded: true, preSend: false })).toBe("ACT");
  });
  it("the fold control: hidden with no side; a toggle with a side; refused in flight with the reason as its label", () => {
    expect(foldControl(base).shown).toBe(false);
    expect(foldControl({ ...base, compact: false, sidePicked: true }).shown).toBe(false);
    expect(foldControl({ ...base, sidePicked: true })).toMatchObject({ shown: true, enabled: true, label: "CHART ▾" });
    expect(foldControl({ ...base, sidePicked: true, folded: true })).toMatchObject({ shown: true, enabled: true, label: "TICKET ▴" });
    expect(foldControl({ ...base, sidePicked: true, preSend: false })).toEqual({ shown: true, enabled: false, label: "IN FLIGHT · stays open", ariaLabel: "An order is in flight — the ticket stays open until tastytrade answers" });
  });
  it("PEEK shows quote, a waiting proposal, and side + quantity — and nothing that can send", () => {
    expect(COMPACT_PEEK_SECTIONS).toEqual(["QUOTE", "PROPOSAL", "SIDE", "ACTION_LINE"]);
    expect(COMPACT_PEEK_SECTIONS).not.toContain("LIVE_ORDER");
    expect(COMPACT_BUILD_SECTIONS).toEqual(["CLOSING", "SIZE", "PRICE", "RISK_INPUTS", "RISK_LINE", "PICK_STATUS"]);
    expect(COMPACT_BUILD_SECTIONS).not.toContain("LIVE_ORDER");
    expect(COMPACT_REVIEW_SECTIONS).toEqual(["LIVE_ORDER"]);
  });
});

describe("BUILD / REVIEW — the two ACT steps", () => {
  it("no step outside ACT; BUILD first; REVIEW when asked; REVIEW forced while an order is in flight", () => {
    expect(ticketStep({ stage: "FULL", reviewing: true, preSend: true })).toBeNull();
    expect(ticketStep({ stage: "PEEK", reviewing: true, preSend: true })).toBeNull();
    expect(ticketStep({ stage: "ACT", reviewing: false, preSend: true })).toBe("BUILD");
    expect(ticketStep({ stage: "ACT", reviewing: true, preSend: true })).toBe("REVIEW");
    expect(ticketStep({ stage: "ACT", reviewing: false, preSend: false })).toBe("REVIEW");
  });
  it("Review & preview is blocked by a wrong-side stop or a missing price — each with its own words", () => {
    expect(reviewGate({ priceOk: true, entryType: "Limit", stopWrongSide: false })).toEqual({ allowed: true, reason: null });
    expect(reviewGate({ priceOk: true, entryType: "Limit", stopWrongSide: true })).toEqual({ allowed: false, reason: "The stop is on the wrong side of the entry — fix it before the preview." });
    expect(reviewGate({ priceOk: false, entryType: "Limit", stopWrongSide: false }).reason).toBe("Set a limit price first.");
    expect(reviewGate({ priceOk: false, entryType: "Stop", stopWrongSide: false }).reason).toBe("Set a stop trigger first.");
    expect(reviewGate({ priceOk: false, entryType: "Stop Limit", stopWrongSide: false }).reason).toBe("Set a stop trigger and a limit price first.");
    expect(reviewGate({ priceOk: true, entryType: "Market", stopWrongSide: false }).allowed).toBe(true);
  });
  it("globals.css carries the per-stage caps beside the phone rule", () => {
    const css = readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");
    expect(css.length).toBeGreaterThan(50_000);
    expect(css).toContain('[data-testid="trade-panel"][data-stage="PEEK"] { max-height: 40svh !important; }');
    expect(css).toContain('[data-testid="trade-panel"][data-stage="ACT"] { max-height: 72svh !important; }');
    expect(css.indexOf('[data-stage="PEEK"]')).toBeGreaterThan(css.indexOf("max-height: 58svh !important;"));
  });
});
