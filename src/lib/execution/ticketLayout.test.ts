/** Compact phone ticket: one ticket, action path first, the rest behind ONE Details disclosure; nothing dropped, no reason hidden. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { selectBrokerOrderLines, type BrokerReadback } from "./brokerOrderLines";
import { ticketBook } from "./ticketBook";
import { WIDE_ACTION_SECTIONS, wideColumns, HALF_DRAG_SNAP_PX, halfFromDrag, wideSendSections, COMPACT_HALF_MAX_HEIGHT, halfControl, halfInForce, WIDE_TICKET_MAX_HEIGHT, bookIsActive, COMPACT_ACT_MAX_HEIGHT, COMPACT_BUILD_SECTIONS, COMPACT_PEEK_MAX_HEIGHT, COMPACT_PEEK_SECTIONS, COMPACT_REVIEW_SECTIONS, COMPACT_TICKET_MAX_WIDTH, COMPACT_TICKET_QUERY, compactRiskLine, detailsSummary, foldControl, reviewGate, ticketSections, ticketStage, ticketStep } from "./ticketLayout";

const NOW = Date.parse("2026-10-08T18:30:00Z");
const rb = (over: Partial<BrokerReadback>): BrokerReadback => ({ asOfMs: NOW - 1000, ok: true, orders: [], positions: [], tails: ["5019"], orderAccounts: {}, ...over });
const book = (r: BrokerReadback | null, gate = { killSwitch: false, limitsSet: true }) => ticketBook(r ? selectBrokerOrderLines(r, "/NQZ6", 100, 20, NOW) : null, "/NQZ6", gate);

describe("ticketSections — one ticket, two orders", () => {
  it("the phone breakpoint is 430 px", () => {
    expect(COMPACT_TICKET_MAX_WIDTH).toBe(430);
    expect(COMPACT_TICKET_QUERY).toBe("(max-width: 430px)");
    expect([COMPACT_PEEK_MAX_HEIGHT, COMPACT_ACT_MAX_HEIGHT]).toEqual(["40svh", "84svh"]);
  });
  it("tablet / desktop ACT (Founder P0 2026-10-09): the entry path first — when FLAT nothing but the quote sits above BUY / SELL — the rest behind Details", () => {
    const l = ticketSections(false);
    expect(l.action).toEqual(["QUOTE", "SIDE", "CLOSING", "ACTION_LINE", "PROPOSAL", "SIZE", "ENTRY_TYPE", "PRICE", "RISK_INPUTS", "RISK_LINE", "PICK_STATUS", "LIVE_ORDER"]);
    expect(l.details).toEqual(["BOOK", "ECONOMICS", "PROTECTION_DRYRUN", "PLAN", "PROTECT"]);
    expect(l.action.slice(0, l.action.indexOf("SIDE"))).toEqual(["QUOTE"]);
    // side → quantity → order type → price → stop / target → risk / reward → the live-order block (account, preview, send)
    const order = ["SIDE", "SIZE", "ENTRY_TYPE", "PRICE", "RISK_INPUTS", "RISK_LINE", "LIVE_ORDER"].map(s => l.action.indexOf(s as never));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(order.every(i => i >= 0)).toBe(true);
  });
  it("holding or working: the position / MODIFY / FLATTEN block leaves Details and joins the path, directly above the live-order block", () => {
    const l = ticketSections(false, true);
    expect(l.action.slice(0, 2)).toEqual(["QUOTE", "SIDE"]);            // still nothing but the quote above BUY / SELL
    expect(l.action.slice(-2)).toEqual(["BOOK", "LIVE_ORDER"]);
    expect(wideSendSections(true)).toEqual(["BOOK", "LIVE_ORDER"]);
    expect(wideSendSections(false)).toEqual(["LIVE_ORDER"]);
    // Ruling 2026-10-10: on a desk the book is a THIRD column (inputs | book | send) in a wider panel.
    expect(wideColumns(true).map(c => c.join(","))).toEqual([WIDE_ACTION_SECTIONS.filter(x => x !== "LIVE_ORDER").join(","), "BOOK", "LIVE_ORDER"]);
    expect(wideColumns(false)).toHaveLength(2);
    const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toContain('[data-testid="trade-panel"][data-layout="full"]:has(.wm-ticket-entry-path[data-book="active"]) { width: min(1120px, calc(100vw - 48px)) !important; }');
    expect(l.details).toEqual(["ECONOMICS", "PROTECTION_DRYRUN", "PLAN", "PROTECT"]);
    expect(new Set([...l.action, ...l.details]).size).toBe(l.action.length + l.details.length);
    const flat = { position: { state: "FLAT" }, working: [] } as never;
    const holding = { position: { state: "LONG" }, working: [] } as never;
    const working = { position: { state: "FLAT" }, working: [{}] } as never;
    expect([bookIsActive(flat), bookIsActive(holding), bookIsActive(working)]).toEqual([false, true, true]);
    expect(WIDE_TICKET_MAX_HEIGHT).toBe("calc(100vh - 88px)");
  });
  it("phone: side → quantity → price → stop/target → risk line → preview/confirm come first; book / modify / flatten / protect fold", () => {
    const l = ticketSections(true);
    expect(l.action).toEqual(["QUOTE", "PROPOSAL", "SIDE", "ACTION_LINE", "CLOSING", "SIZE", "PRICE", "RISK_INPUTS", "RISK_LINE", "PICK_STATUS", "LIVE_ORDER"]);
    expect(l.details).toEqual(["BOOK", "ENTRY_TYPE", "ECONOMICS", "PROTECTION_DRYRUN", "PLAN", "PROTECT"]);
    expect(l.action.indexOf("SIDE")).toBeLessThan(l.action.indexOf("SIZE"));
    expect(l.action.indexOf("SIZE")).toBeLessThan(l.action.indexOf("LIVE_ORDER"));
  });
  it("nothing is dropped and nothing is rendered twice: phone and desktop hold the same sections, in either book state", () => {
    const phone = [...ticketSections(true).action, ...ticketSections(true).details];
    expect(new Set(phone).size).toBe(phone.length);
    for (const active of [false, true]) {
      const wide = [...ticketSections(false, active).action, ...ticketSections(false, active).details];
      expect(new Set(wide).size).toBe(wide.length);
      expect([...wide].sort()).toEqual([...phone].sort());
    }
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
    // Lifecycle (Morning Prep → plan → ticket → Journal): the plan card folds into Details, and the summary says so.
    expect(detailsSummary(book(rb({})), { inside: true })).toBe("Details · FLAT · 0 working · management plan + today's rules");
    expect(detailsSummary(book(rb({})), { inside: false })).toBe("Details · FLAT · 0 working");
    expect(readFileSync(path.join(process.cwd(), "src/components/chart/TradePanel.tsx"), "utf8")).toContain("summary={detailsSummary(book, { inside: owner && tradable })}");
  });
});

describe("compactRiskLine — the wrong-side refusal is never folded away", () => {
  it("wrong side is a refusal, said beside the stop", () => {
    expect(compactRiskLine({ stopWrongSide: true, riskUsd: 10, rewardUsd: 20, entryKnown: true })).toEqual({ refusal: true, text: "The stop is on the wrong side of the entry — an opening order would be refused." });
  });
  it("a wrong-side target is a refusal too — never reward money", () => {
    expect(compactRiskLine({ stopWrongSide: false, riskUsd: 20, rewardUsd: null, entryKnown: true, targetWrongSide: true })).toEqual({ refusal: true, text: "The target is on the wrong side of the entry — it would never be a profit." });
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
    expect(T).toContain('maxHeight: !compact ? WIDE_TICKET_MAX_HEIGHT : stage === "PEEK" ? COMPACT_PEEK_MAX_HEIGHT : halfOn ? COMPACT_HALF_MAX_HEIGHT : COMPACT_ACT_MAX_HEIGHT');
    expect(T).toContain('data-half={halfOn ? "yes" : undefined}');
    const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toContain('[data-testid="trade-panel"][data-stage="ACT"][data-half="yes"] { max-height: 50svh !important; }');
    // The wide entry path: one column by default, two on a desk, where the panel widens to hold them.
    expect(css).toContain(".wm-ticket-entry-path { display: grid; gap: 10px; min-width: 0; }");
    expect(css).toContain('[data-testid="trade-panel"][data-layout="full"] { width: min(760px, calc(100vw - 48px)) !important; }');
    expect(css).toContain('[data-testid="trade-panel"][data-layout="full"] .wm-ticket-entry-path { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); column-gap: 16px; align-items: start; }');
    expect(T).toContain('<TicketSections compact={compact} bookActive={bookIsActive(book)} peek={stage === "PEEK"} step={step} review={review} inFlight={!stageInput.preSend}');
    expect(T).toContain("onReview={() => { if (review.allowed) setReviewing(true); }} onEdit={() => { if (stageInput.preSend) setReviewing(false); }}");
    expect(T).toContain("const step = ticketStep({ stage, reviewing, preSend: stageInput.preSend, compact });");
    expect(T).toContain('<footer data-testid="trade-footer" hidden={step === "REVIEW"}');
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
  it("tablet / desktop opens in ACT — always, side picked or not (there is no long FULL stack any more)", () => {
    expect(ticketStage({ ...base, compact: false })).toBe("ACT");
    expect(ticketStage({ compact: false, sidePicked: true, folded: true, preSend: false })).toBe("ACT");
    // …and a wide ticket takes no BUILD / REVIEW steps: the whole entry path shows at once.
    expect(ticketStep({ stage: "ACT", reviewing: true, preSend: true, compact: false })).toBeNull();
    expect(ticketStep({ stage: "ACT", reviewing: false, preSend: false, compact: false })).toBeNull();
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

describe("HALF — the trader's own option on a phone; the default is unchanged", () => {
  const act = { compact: true, stage: "ACT" as const, half: false, preSend: true };
  it("offered only on the phone's ACT stage; off by default; on when the trader asks", () => {
    expect(COMPACT_HALF_MAX_HEIGHT).toBe("50svh");
    expect(halfControl({ ...act, compact: false }).shown).toBe(false);
    expect(halfControl({ ...act, stage: "PEEK" }).shown).toBe(false);
    expect(halfControl(act)).toMatchObject({ shown: true, enabled: true, label: "HALF ▾" });
    expect(halfInForce(act)).toBe(false);
    expect(halfControl({ ...act, half: true })).toMatchObject({ shown: true, enabled: true, label: "FULL ▴" });
    expect(halfInForce({ ...act, half: true })).toBe(true);
  });
  it("an order in flight is never shrunk: the control is refused with its reason, and half is not in force", () => {
    const c = halfControl({ ...act, half: true, preSend: false });
    expect(c.enabled).toBe(false);
    expect(c.ariaLabel).toMatch(/order is in flight/);
    expect(halfInForce({ ...act, half: true, preSend: false })).toBe(false);
  });
});

describe("HALF grip — drag the sheet's edge; snaps on release", () => {
  const on = { shown: true, enabled: true, label: "HALF ▾", ariaLabel: "x" };
  it("down ≥ 40 px → half, up ≥ 40 px → full, a small move nothing; refused or hidden → nothing", () => {
    expect(HALF_DRAG_SNAP_PX).toBe(40);
    expect(halfFromDrag(60, on)).toBe(true);
    expect(halfFromDrag(-60, on)).toBe(false);
    expect(halfFromDrag(20, on)).toBeNull();
    expect(halfFromDrag(80, { ...on, enabled: false })).toBeNull();
    expect(halfFromDrag(80, { ...on, shown: false })).toBeNull();
    expect(halfFromDrag(Number.NaN, on)).toBeNull();
    const T = readFileSync(path.join(process.cwd(), "src/components/chart/TradePanel.tsx"), "utf8");
    expect(T).toContain('data-testid="trade-half-grip"');
    expect(T).toContain("const next = halfFromDrag(e.clientY - y0, halfCtl); if (next !== null) setHalf(next);");
  });
});

describe("BUILD / REVIEW — the two ACT steps", () => {
  it("no step outside ACT; BUILD first; REVIEW when asked; REVIEW forced while an order is in flight", () => {
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
    expect(css).toContain('[data-testid="trade-panel"][data-stage="ACT"] { max-height: 84svh !important; }');
    expect(css.indexOf('[data-stage="PEEK"]')).toBeGreaterThan(css.indexOf("max-height: 58svh !important;"));
  });
});
