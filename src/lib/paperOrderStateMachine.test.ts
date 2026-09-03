import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  canCancelOrder,
  isTerminalOrderStatus,
  TERMINAL_ORDER_STATUSES,
  type OrderStatus,
} from "./paperTrade";

const page = fs.readFileSync(
  path.join(process.cwd(), "src/app/paper/page.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

const ALL: OrderStatus[] = ["pending", "filled", "cancelled", "rejected"];

/**
 * Paper order state machine — Founding Contract §13
 * "paper execution state machine / order ledger / reconciliation realism".
 *
 * cancelOrder() relabelled ANY order to "cancelled" with no status guard. The
 * Cancel control only renders for pending orders, so this was not reachable
 * through the UI — but this module already holds the opposite principle:
 * selectPaperQuoteReadiness exists so that "UI-disabled controls" do not
 * "become the sole guard against ... direct handler invocation".
 *
 * The consequence if reached: a filled order marked "cancelled" while the cash
 * movement and position it created stay on the books. The order ledger would
 * contradict the account, which is exactly the reconciliation realism the gate
 * asks for. A real venue rejects a cancel against a settled order.
 */
describe("paper order state machine", () => {
  it("only a pending order may be cancelled", () => {
    expect(canCancelOrder("pending")).toBe(true);
    for (const s of ["filled", "cancelled", "rejected"] as OrderStatus[]) {
      expect(canCancelOrder(s)).toBe(false);
    }
  });

  it("a filled order can never be relabelled — it already moved cash", () => {
    expect(canCancelOrder("filled")).toBe(false);
    expect(isTerminalOrderStatus("filled")).toBe(true);
  });

  it("terminal statuses are exactly the settled ones", () => {
    expect([...TERMINAL_ORDER_STATUSES].sort()).toEqual(["cancelled", "filled", "rejected"]);
    expect(isTerminalOrderStatus("pending")).toBe(false);
  });

  it("every status is classified — no status falls through unhandled", () => {
    for (const s of ALL) {
      expect(typeof isTerminalOrderStatus(s)).toBe("boolean");
      // Cancellable and terminal are mutually exclusive and exhaustive.
      expect(canCancelOrder(s)).toBe(!isTerminalOrderStatus(s));
    }
  });

  it("the handler guards the transition, not just the button", () => {
    expect(page).toContain("canCancelOrder(o.status)");
    // The unguarded form must not return.
    expect(page).not.toMatch(/o\.id\s*===\s*id\s*\?\s*\{\s*\.\.\.o,\s*status:\s*"cancelled"\s*\}/);
  });
});

import { selectCloseOrderPlan } from "./paperTrade";

type PendingLike = Parameters<typeof selectCloseOrderPlan>[1][number];
const mkt = (symbol: string, side: "buy" | "sell", qty: number): PendingLike =>
  ({ symbol, side, type: "market", qty, status: "pending" });

/**
 * Close-position sizing — §13 reconciliation realism.
 *
 * closePosition() sized the flattening order from the CURRENT position only.
 * The Close control has no disabled state and fills land on the next quote
 * tick, so two quick clicks on a long 10 created TWO pending sell-10 orders —
 * the position is still 10 when the second is built. Both fill, and a trader
 * who asked to go flat ends up SHORT 10.
 */
describe("close-position sizing", () => {
  it("flattens a long with a single sell", () => {
    expect(selectCloseOrderPlan(10, [], "NQ1!")).toEqual({ side: "sell", qty: 10 });
  });

  it("flattens a short with a single buy", () => {
    expect(selectCloseOrderPlan(-7, [], "NQ1!")).toEqual({ side: "buy", qty: 7 });
  });

  it("a second close click is a no-op — the first already covers it", () => {
    const afterFirst = [mkt("NQ1!", "sell", 10)];
    expect(selectCloseOrderPlan(10, afterFirst, "NQ1!")).toBeNull();
  });

  it("orders only the residual when a partial close is pending", () => {
    expect(selectCloseOrderPlan(10, [mkt("NQ1!", "sell", 4)], "NQ1!"))
      .toEqual({ side: "sell", qty: 6 });
  });

  it("ignores pending orders for other symbols", () => {
    expect(selectCloseOrderPlan(10, [mkt("ES1!", "sell", 10)], "NQ1!"))
      .toEqual({ side: "sell", qty: 10 });
  });

  it("ignores resting limit/stop orders — they may never fill", () => {
    const resting = [{ symbol: "NQ1!", side: "sell" as const, type: "limit" as const, qty: 10, status: "pending" as const }];
    expect(selectCloseOrderPlan(10, resting, "NQ1!")).toEqual({ side: "sell", qty: 10 });
  });

  it("ignores already-settled orders", () => {
    const settled = [{ symbol: "NQ1!", side: "sell" as const, type: "market" as const, qty: 10, status: "filled" as const }];
    expect(selectCloseOrderPlan(10, settled, "NQ1!")).toEqual({ side: "sell", qty: 10 });
  });

  it("returns null for a flat or invalid position", () => {
    expect(selectCloseOrderPlan(0, [], "NQ1!")).toBeNull();
    expect(selectCloseOrderPlan(Number.NaN, [], "NQ1!")).toBeNull();
  });

  it("never manufactures an opposite position from repeated clicks", () => {
    // Simulate five rapid clicks before any fill lands.
    let pending: PendingLike[] = [];
    for (let i = 0; i < 5; i++) {
      const plan = selectCloseOrderPlan(10, pending, "NQ1!");
      if (plan) pending = [mkt("NQ1!", plan.side, plan.qty), ...pending];
    }
    const net = pending.reduce((s, o) => s + (o.side === "buy" ? o.qty : -o.qty), 0);
    // Exactly one sell-10 — flat, never short.
    expect(pending).toHaveLength(1);
    expect(10 + net).toBe(0);
  });
});
