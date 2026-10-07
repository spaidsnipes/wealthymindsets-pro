/**
 * Garden 19 slice 2 — pre-trade plan card draft → freeze (ticket send, paper
 * fill), broker-readback actuals (fills, stop / target moves), the hold's
 * price path, amendments, and the surfaces that carry them.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { conditionReadback, ManagementPlanCard } from "@/components/journal/ManagementPlanCard";
import { readTastytradeOrder } from "@/lib/broker/tastytradeOrderState";
import type { FillCaptureIntent } from "./journalCaptureFromFill";
import { freezePlanSnapshot } from "./managementPlan";
import { DRAFT_MAX_AGE_MS, freezeAtTicketSend, freezePaperFillPlans, latestPlanForSymbol, readDraft, takeDraftForFreeze, writeDraft } from "./managementPlanDraft";
import { readPlanForDecision } from "./managementPlanStore";
import { actualsFromBrokerStory } from "./planActualsFromBroker";
import { pathWindowFor, pricePathFromBars, PATH_AFTER_EXIT_MIN } from "./planPricePath";
import { occToStreamer } from "./planPricePathLoader";
import { composePlanReview, planReviewInputForBrokerStory } from "./planReview";
import { rememberTicketAtSend } from "./ticketAtSendStore";

const T0 = Date.parse("2026-10-07T14:30:00Z");
const M = 60_000;
const SRC = path.resolve(__dirname, "../..");

function mem() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
}

const ticket: FillCaptureIntent = {
  decisionId: "wmd_s2", view: "ORB long", broker: "tastytrade", instrumentType: "Future", chartSymbol: "MNQ1!",
  action: "Buy to Open", qty: 1, orderType: "Limit", limitPx: 21400, protectiveStopPx: 21380, targetPx: 21450, sentAtMs: T0,
};

describe("plan card draft → frozen at the ticket's send", () => {
  it("a draft written before the send joins the freeze, then is consumed", () => {
    const st = mem();
    writeDraft(st, "mnq1!", { invalidation: "loses ORL", invalidationPx: 21385, conditions: ["move to breakeven after +1R", "reduce at target 1"], expectedHoldMin: 20, session: "NY open" }, T0 - 5 * M);
    expect(readDraft(st, "MNQ1!")?.plan.invalidationPx).toBe(21385);
    expect(freezeAtTicketSend(st, ticket, T0)).toBe("FROZEN");
    const s = readPlanForDecision(st, "wmd_s2")!;
    expect(s.frozenAt).toBe("TICKET_SEND");
    expect(s.base.stopPx.value).toBe(21380);
    expect(s.base.invalidationPx.value).toBe(21385);
    expect(s.base.conditions.map(c => c.kind)).toEqual(["BREAKEVEN_AFTER_R", "REDUCE_AT_TARGET"]);
    expect(s.base.expectedHoldMin.value).toBe(20);
    expect(s.base.context.state).toBe("UNRECORDED");
    expect(readDraft(st, "MNQ1!")).toBeNull();
  });
  it("a draft written AFTER the send, or older than the window, never becomes the pre-trade plan", () => {
    const st = mem();
    writeDraft(st, "MNQ1!", { invalidationPx: 1 }, T0 + 1);
    expect(takeDraftForFreeze(st, "MNQ1!", T0)).toBeNull();
    writeDraft(st, "MNQ1!", { invalidationPx: 1 }, T0 - DRAFT_MAX_AGE_MS - 1);
    expect(takeDraftForFreeze(st, "MNQ1!", T0)).toBeNull();
  });
  it("a second ticket on a frozen decision (the protective stop) neither re-freezes nor eats the next draft", () => {
    const st = mem();
    freezeAtTicketSend(st, ticket, T0);
    writeDraft(st, "MNQ1!", { invalidationPx: 7 }, T0 + M);
    expect(freezeAtTicketSend(st, { ...ticket, action: "Sell to Close", orderType: "Stop", sentAtMs: T0 + 2 * M }, T0 + 2 * M)).toBe("ALREADY_FROZEN");
    expect(readDraft(st, "MNQ1!")).not.toBeNull();
  });
  it("an empty draft is removed, not stored as a plan", () => {
    const st = mem();
    writeDraft(st, "AAPL", { invalidation: "x" }, T0);
    expect(writeDraft(st, "AAPL", { invalidation: "", conditions: [] }, T0)).toBeNull();
    expect(readDraft(st, "AAPL")).toBeNull();
  });
  it("rememberTicketAtSend carries the draft into the freeze", () => {
    const session = mem(), device = mem();
    writeDraft(device, "MNQ1!", { expectedHoldMin: 15 }, T0 - M);
    rememberTicketAtSend(session, "coid", ticket, T0, device);
    expect(readPlanForDecision(device, "wmd_s2")?.base.expectedHoldMin.value).toBe(15);
  });
});

describe("paper fill freeze", () => {
  it("the FIRST fill of a decision freezes the draft written before it, at PAPER_FILL", () => {
    const st = mem();
    writeDraft(st, "AAPL", { invalidationPx: 180, conditions: ["time stop 30 min"] }, T0 - M);
    const n = freezePaperFillPlans(st, [
      { symbol: "AAPL", side: "sell", px: 186, ts: T0 + 10 * M, decisionId: "wmd_p" },
      { symbol: "AAPL", side: "buy", px: 185, ts: T0, decisionId: "wmd_p" },
    ]);
    expect(n).toBe(1);
    const s = readPlanForDecision(st, "wmd_p")!;
    expect(s).toMatchObject({ frozenAt: "PAPER_FILL", frozenAtMs: T0 });
    expect(s.base.direction.value).toBe("LONG");
    expect(s.base.stopPx.state).toBe("UNRECORDED");
    expect(freezePaperFillPlans(st, [{ symbol: "AAPL", side: "buy", px: 185, ts: T0, decisionId: "wmd_p" }])).toBe(0);
  });
  it("no draft, no decision, or a draft written after the fill → nothing frozen", () => {
    const st = mem();
    expect(freezePaperFillPlans(st, [{ symbol: "AAPL", side: "buy", px: 1, ts: T0, decisionId: "wmd_q" }])).toBe(0);
    writeDraft(st, "AAPL", { invalidationPx: 1 }, T0 + 1);
    expect(freezePaperFillPlans(st, [{ symbol: "AAPL", side: "buy", px: 1, ts: T0, decisionId: "wmd_q" }, { symbol: "AAPL", side: "buy", px: 1, ts: T0 }])).toBe(0);
  });
  it("the card finds the latest plan frozen for its market", () => {
    const st = mem();
    writeDraft(st, "AAPL", { invalidationPx: 1 }, T0 - M);
    freezePaperFillPlans(st, [{ symbol: "AAPL", side: "buy", px: 1, ts: T0, decisionId: "wmd_r" }]);
    expect(latestPlanForSymbol(st, "aapl", T0 - 1)?.base.decisionId).toBe("wmd_r");
    expect(latestPlanForSymbol(st, "AAPL", T0 + 1)).toBeNull();
  });
});

describe("actuals from the broker readback (tastytrade orders + transactions)", () => {
  const iso = (m: number) => new Date(T0 + m * M).toISOString();
  const story = {
    orders: [
      { id: "1", action: "Buy to Open", orderType: "Limit", price: "21400", receivedAt: iso(0) },
      { id: "2", action: "Sell to Close", orderType: "Stop", stopTrigger: "21380", receivedAt: iso(1) },
      { id: "3", action: "Sell to Close", orderType: "Stop", stopTrigger: "21400", receivedAt: iso(3) },
      { id: "4", action: "Sell to Close", orderType: "Limit", price: "21440", receivedAt: iso(4) },
    ],
    fills: [
      { orderId: "1", action: "Buy to Open", quantity: 1, price: 21400, executedAt: iso(0.5) },
      { orderId: "5", action: "Buy to Open", quantity: 1, price: 21390, executedAt: iso(2) },
      { orderId: "4", action: "Sell to Close", quantity: 2, price: 21440, executedAt: iso(6) },
    ],
  };
  it("entry, add, exit; stop moved from the plan's stop; target moved; times from received-at / executed-at", () => {
    const a = actualsFromBrokerStory(story, { stopPx: 21380, targetPx: 21450 });
    expect(a.direction).toBe("LONG");
    expect(a.entry).toMatchObject({ px: 21400, atMs: T0 + 30_000 });
    expect(a.adds).toEqual([{ atMs: T0 + 2 * M, px: 21390, qty: 1 }]);
    expect(a.exits).toEqual([{ atMs: T0 + 6 * M, px: 21440, qty: 2 }]);
    expect(a.stopMoves).toEqual([{ atMs: T0 + 3 * M, fromPx: 21380, toPx: 21400 }]);
    expect(a.targetMoves).toEqual([{ atMs: T0 + 4 * M, fromPx: 21450, toPx: 21440 }]);
  });
  it("no received-at → the move is untimed (never dated by updated-at)", () => {
    const a = actualsFromBrokerStory({ orders: [{ id: "2", action: "Sell to Close", orderType: "Stop", stopTrigger: "21370" }], fills: [] }, { stopPx: 21380, targetPx: null });
    expect(a.stopMoves).toEqual([{ atMs: null, fromPx: 21380, toPx: 21370 }]);
  });
  it("the order reader now carries tastytrade's received-at", () => {
    expect(readTastytradeOrder({ id: 9, status: "Live", "received-at": "2026-10-07T14:31:00Z", "updated-at": "2026-10-07T14:40:00Z", legs: [] })?.receivedAt).toBe("2026-10-07T14:31:00Z");
  });
  it("a broker story with a frozen plan → Review input with symbol + Decision_ID; classified against the plan", () => {
    const p = freezePlanSnapshot({ decisionId: "wmd_b", frozenAt: "TICKET_SEND", atMs: T0 - 1000, source: "t", plan: { direction: "LONG", stopPx: 21380, targetPx: 21450, conditions: ["move to breakeven after +1R"] } })!;
    const pin = planReviewInputForBrokerStory({ decisionId: "wmd_b", orders: story.orders, fills: story.fills.map(f => ({ ...f, symbol: "/MNQZ6" })) }, () => p)!;
    expect(pin).toMatchObject({ symbol: "/MNQZ6", decisionId: "wmd_b" });
    const ids = composePlanReview(pin).result.findings.map(f => f.id);
    expect(ids).toEqual(expect.arrayContaining(["MOVED_TARGET", "ADDED_RISK_AFTER_THESIS_WEAKENED"]));
    expect(planReviewInputForBrokerStory({ decisionId: null, orders: story.orders, fills: [] }, () => p)).toBeNull();
  });
});

describe("the hold's price path", () => {
  const a = { direction: "LONG" as const, entry: { atMs: T0 + 30_000, px: 1, qty: 1 }, exits: [{ atMs: T0 + 5 * M, px: 2, qty: 1 }], adds: [], stopMoves: [], targetMoves: [], source: "x" };
  it("the window is the fills' own times (entry bar → exit + 2h), never guessed", () => {
    const w = pathWindowFor(a, T0 + 600 * M);
    expect(w).toEqual({ ok: true, window: { fromMs: T0, toMs: T0 + 5 * M + PATH_AFTER_EXIT_MIN * M } });
    expect(pathWindowFor({ ...a, entry: { ...a.entry, atMs: null } }, T0)).toMatchObject({ ok: false, reason: "the entry fill time was not reported" });
    expect(pathWindowFor({ ...a, exits: [{ atMs: null, px: 2, qty: 1 }] }, T0)).toMatchObject({ ok: false });
    expect(pathWindowFor(a, T0 + 40 * 86_400_000)).toMatchObject({ ok: false });
  });
  it("candle-owner bars (seconds) → path bars (ms) inside the window", () => {
    const bars = [-1, 0, 1, 2, 200].map(i => ({ time: (T0 + i * M) / 1000, open: 1, high: 2, low: 0.5, close: 1.5, volume: 1 }));
    const p = pricePathFromBars(bars, { fromMs: T0, toMs: T0 + 3 * M }, "tastytrade 1m")!;
    expect(p.bars.map(b => b.t)).toEqual([T0, T0 + M, T0 + 2 * M]);
    expect(pricePathFromBars([], { fromMs: 0, toMs: 1 }, "x")).toBeNull();
  });
  it("tastytrade's OCC option symbol → dxFeed's", () => {
    expect(occToStreamer("TSLA  261002C00305000")).toBe(".TSLA261002C305");
    expect(occToStreamer("SPY   261002P00612500")).toBe(".SPY261002P612.5");
    expect(occToStreamer("/MNQZ6")).toBeNull();
  });
});

describe("surfaces — card on both tickets, Review amends, nothing touches an order", () => {
  it("the ticket card renders the draft fields and says blanks stay UNRECORDED", () => {
    const html = renderToStaticMarkup(React.createElement(ManagementPlanCard, { mode: "ticket", symbol: "MNQ1!" }));
    for (const id of ["plan-invalidation", "plan-invalidation-px", "plan-conditions", "plan-hold", "plan-session", "plan-context"]) expect(html).toContain(`data-testid="${id}"`);
    expect(html).toContain("stays UNRECORDED");
  });
  it("the review card offers recording the plan, marked as after the trade", () => {
    const html = renderToStaticMarkup(React.createElement(ManagementPlanCard, { mode: "story", decisionId: "wmd_x" }));
    expect(html).toContain("marked as written after the trade");
  });
  it("conditions are read back before the trade", () => {
    expect(conditionReadback("move to breakeven after +1R")).toBe("checked: stop to breakeven only after +1R prints");
    expect(conditionReadback("respect the news")).toMatch(/kept in your words/);
  });
  it("wired: TradePanel + /paper tickets, the paper-fill freeze, the broker stories and the journal Review", () => {
    const panel = readFileSync(path.join(SRC, "components/chart/TradePanel.tsx"), "utf8");
    expect(panel).toContain('<ManagementPlanCard mode="ticket" symbol={symbol} />');
    const paper = readFileSync(path.join(SRC, "app/paper/page.tsx"), "utf8");
    expect(paper).toContain('<ManagementPlanCard mode="ticket" symbol={sym} />');
    expect(paper).toContain("freezePaperFillPlans(window.localStorage, trades)");
    const btt = readFileSync(path.join(SRC, "components/journal/BrokerTruthToday.tsx"), "utf8");
    expect(btt).toContain("planReviewInputForBrokerStory(st,");
    expect(btt).toContain('<ManagementPlanCard mode="story"');
    const page = readFileSync(path.join(SRC, "app/journal/page.tsx"), "utf8");
    expect(page).toContain("planDecisionId={selected.capture?.decisionId.value ?? null}");
  });
  it("the card, the draft store and the loaders never send an order or call a broker write", () => {
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    for (const f of ["components/journal/ManagementPlanCard.tsx", "lib/journal/managementPlanDraft.ts", "lib/journal/planPricePathLoader.ts", "lib/journal/planActualsFromBroker.ts", "lib/journal/planPricePath.ts"]) {
      const src = strip(readFileSync(path.join(SRC, f), "utf8"));
      expect(src).not.toMatch(/order-submit|\/api\/broker\/.*order|method:\s*"(POST|PUT|DELETE)"|fetch\(/);
    }
  });
});
