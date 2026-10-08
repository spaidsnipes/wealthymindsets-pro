/**
 * Webull in Review — read only. Journal auto-capture is tastytrade-only; Review
 * reads Webull fills (Webull's own field names) for decisions WM sent, pairs
 * them flat-to-flat, and says UNKNOWN where Webull's readback cannot speak.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StoryReviewRow } from "@/components/journal/BrokerTruthToday";
import { readWebullExecutions, readWebullOrderHistoryFills } from "@/lib/broker/webullFills";
import { freezePlanSnapshot } from "./managementPlan";
import { actualsFromWebullStory, WEBULL_NOT_AUTO_CAPTURED, WEBULL_READBACK_UNKNOWNS } from "./planActualsFromWebull";
import { composePlanReview, planReviewInputForBrokerStory } from "./planReview";
import { sheriffColumns } from "./planSheriff";

const SRC = path.resolve(__dirname, "../..");
const T = (min: number) => Date.parse("2026-10-07T14:30:00Z") + min * 60_000;
const exec = (id: string, order: string, side: string, qty: string, price: string, min: number, extra: Record<string, unknown> = {}) =>
  ({ execution_id: id, order_id: order, client_order_id: `wmo_${order}`, symbol: "TSLA", instrument_type: "EQUITY", side, filled_quantity: qty, filled_price: price, execution_time: T(min), ...extra });
const plan = freezePlanSnapshot({ decisionId: "wmd_wb", frozenAt: "TICKET_SEND", atMs: T(-1), source: "t", plan: { direction: "LONG", stopPx: 440, targetPx: 452 } })!;

describe("Webull fill shapes → Review actuals (Webull field names)", () => {
  it("partial executions of one order are one entry (quantity-weighted, earliest time); BUY sets LONG; SELL closes; fees UNREPORTED on executions", () => {
    const fills = readWebullExecutions({ data: [exec("e1", "o1", "BUY", "60", "445.10", 0), exec("e2", "o1", "BUY", "40", "445.35", 1), exec("e3", "o2", "SELL", "100", "448.00", 9)] });
    expect(fills.every(f => f.feesReported === false)).toBe(true);
    const r = actualsFromWebullStory(fills);
    if (!r.ok) throw new Error(r.reason);
    expect(r.feesKnown).toBe(false);
    expect(r.actuals.direction).toBe("LONG");
    expect(r.actuals.entry).toEqual({ atMs: T(0), px: 445.2, qty: 100 });
    expect(r.actuals.exits).toEqual([{ atMs: T(9), px: 448, qty: 100 }]);
    expect(r.actuals.stopMoves).toEqual([]);
    expect(r.actuals.unknowns).toEqual(WEBULL_READBACK_UNKNOWNS);
  });

  it("a later same-side order is an add; pairing stops at the first return to flat; SHORT/SELL first sets SHORT", () => {
    const fills = readWebullExecutions([exec("a", "o1", "BUY", "10", "445", 0), exec("b", "o2", "BUY", "10", "443", 2), exec("c", "o3", "SELL", "20", "447", 5), exec("d", "o4", "BUY", "5", "446", 8)]);
    const r = actualsFromWebullStory(fills);
    if (!r.ok) throw new Error(r.reason);
    expect(r.actuals.adds).toEqual([{ atMs: T(2), px: 443, qty: 10 }]);
    expect(r.actuals.exits.map(e => e.px)).toEqual([447]);
    const short = actualsFromWebullStory(readWebullExecutions([exec("s", "o1", "SHORT", "5", "450", 0), exec("t", "o2", "BUY", "5", "446", 4)]));
    expect(short.ok && short.actuals.direction).toBe("SHORT");
  });

  it("order history: itemised fees → fees known; a multi-leg option order is refused with UNKNOWN pairing", () => {
    const hist = readWebullOrderHistoryFills({ data: [
      { client_order_id: "wmo_1", orders: [{ order_id: "h1", symbol: "TSLA", side: "BUY", filled_quantity: "1", filled_price: "3.20", filled_time: T(0), instrument_type: "OPTION",
        legs: [{ strike_price: "450", option_type: "CALL", option_expire_date: "2026-10-09", option_contract_multiplier: "100" }], fees: [{ actual_value: "0.65" }] }] },
      { client_order_id: "wmo_2", orders: [{ order_id: "h2", symbol: "TSLA", side: "SELL", filled_quantity: "1", filled_price: "3.90", filled_time: T(6), instrument_type: "OPTION",
        legs: [{ strike_price: "450", option_type: "CALL", option_expire_date: "2026-10-09", option_contract_multiplier: "100" }], fees: [{ actual_value: "0.65" }] }] },
    ] });
    expect(hist.map(f => f.legCount)).toEqual([1, 1]);
    const ok = actualsFromWebullStory(hist);
    expect(ok.ok && ok.feesKnown).toBe(true);
    const spread = readWebullOrderHistoryFills({ data: [{ client_order_id: "wmo_3", orders: [{ order_id: "h3", symbol: "TSLA", side: "BUY", filled_quantity: "1", filled_price: "1.10", filled_time: T(0), instrument_type: "OPTION",
      legs: [{ strike_price: "450", option_type: "CALL", option_expire_date: "2026-10-09" }, { strike_price: "455", option_type: "CALL", option_expire_date: "2026-10-09" }] }] }] });
    expect(spread[0].legCount).toBe(2);
    const r = actualsFromWebullStory(spread);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/multi-leg Webull order .* UNKNOWN how the legs pair/);
  });

  it("fills on two instruments under one decision are not one position — refused", () => {
    const r = actualsFromWebullStory([{ orderId: "1", action: "Buy", quantity: 1, price: 1, executedAt: null, symbol: "TSLA" }, { orderId: "2", action: "Sell", quantity: 1, price: 1, executedAt: null, symbol: "AAPL" }]);
    expect(r.ok).toBe(false);
  });

  it("replaced stops cannot be seen in Webull's readback: Review says UNKNOWN, never 'not moved'", () => {
    const r = actualsFromWebullStory(readWebullExecutions([exec("a", "o1", "BUY", "10", "445", 0), exec("b", "o2", "SELL", "10", "441", 6)]));
    if (!r.ok) throw new Error(r.reason);
    const col = sheriffColumns({ plan, actuals: r.actuals, path: null }).actual;
    expect(col).toContain("No stop move seen in the readback.");
    expect(col).toContain(WEBULL_READBACK_UNKNOWNS[0]);
    expect(col).toContain(WEBULL_READBACK_UNKNOWNS[1]);
  });
});

describe("Webull in the Review row", () => {
  const fills = readWebullExecutions([exec("a", "o1", "BUY", "10", "445", 0), exec("b", "o2", "SELL", "10", "448", 6)]).map(f => ({ ...f, decisionId: "wmd_wb" }));
  it("a WM-sent Webull decision is compared with its plan through the Webull adapter (not the tastytrade one)", () => {
    const pin = planReviewInputForBrokerStory({ decisionId: "wmd_wb", broker: "webull", orders: [], fills }, () => plan)!;
    expect(pin.actuals?.source).toBe("Webull fills (journal feed)");
    expect(pin.actuals?.entry?.px).toBe(445);
    const c = composePlanReview(pin);
    expect(c.result.findings.map(f => f.id)).toContain("INSUFFICIENT_EVIDENCE"); // no price path loaded yet — never guessed
    expect(c.sheriff.actual.some(l => l.startsWith("Entry 10 @ 445 at "))).toBe(true);
    expect(c.sheriff.actual[0]).toBe("Reported by: Webull fills (journal feed).");
  });
  it("the row says Webull fills are not auto-captured, and shows a refusal reason when the adapter cannot compare", () => {
    const html = renderToStaticMarkup(React.createElement(StoryReviewRow, { storyKey: "k", brokerNote: WEBULL_NOT_AUTO_CAPTURED, plan: { plan, actuals: null, actualsRefusal: "A multi-leg Webull order is read as its first leg only…" }, defaultOpen: true }));
    expect(html).toContain('data-testid="broker-note"');
    expect(html).toContain("WM does not auto-capture them into the Journal");
    expect(html).toContain('data-testid="plan-actuals-refusal"');
    const btt = readFileSync(path.join(SRC, "components/journal/BrokerTruthToday.tsx"), "utf8");
    expect(btt).toContain('brokerNote={st.broker === "webull" ? WEBULL_NOT_AUTO_CAPTURED : null}');
  });
  it("read only: the adapter and its callers never reach a Webull order tool", () => {
    for (const f of ["lib/journal/planActualsFromWebull.ts", "lib/journal/planReview.ts"]) {
      const src = readFileSync(path.join(SRC, f), "utf8");
      expect(src.length).toBeGreaterThan(1_000);   // the read found the real file
      expect(src).not.toMatch(/place_|placeOrder|order-submit|fetch\(/);
    }
    // Journal auto-capture stays tastytrade-only.
    expect(readFileSync(path.join(SRC, "lib/journal/journalCaptureFromFill.ts"), "utf8")).toMatch(/readonly broker: "tastytrade";/);
  });
});
