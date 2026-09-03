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
