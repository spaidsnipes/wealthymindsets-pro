import { describe, expect, it } from "vitest";

import { readWebullExecutions } from "./webullFills";

describe("Webull executions as Journal fills", () => {
  it("reads Webull's own fields, dedupes by execution id, never claims zero fees", () => {
    const fills = readWebullExecutions({ data: [
      { execution_id: "e2", order_id: "o1", client_order_id: "c1", symbol: "TSLA", execution_time: 1790870000000, side: "SELL", filled_quantity: "1", filled_price: "4.10" },
      { execution_id: "e1", order_id: "o1", client_order_id: "c1", symbol: "TSLA", execution_time: "2026-10-01T14:00:00Z", side: "BUY", filled_quantity: 1, filled_price: 3.5 },
      { execution_id: "e1", symbol: "TSLA", side: "BUY", filled_quantity: 1, filled_price: 3.5 },
      { execution_id: "e3", side: "BUY", filled_quantity: 0, filled_price: 1 },
    ] });
    expect(fills.map(f => `${f.id}:${f.action}:${f.quantity}@${f.price}`)).toEqual(["e1:Buy:1@3.5", "e2:Sell:1@4.1"]);
    expect(fills[0]!.feesReported).toBe(false);
    expect(fills[0]!.value).toBeNull();
    expect(fills[0]!.clientOrderId).toBe("c1");
  });
});

describe("Webull order history as Journal fills (when executions is not served)", () => {
  it("one fill per filled order, groups or bare, never an unfilled one", async () => {
    const { readWebullOrderHistoryFills } = await import("./webullFills");
    const fills = readWebullOrderHistoryFills([
      { client_order_id: "c9", orders: [{ order_id: "o9", symbol: "TSLA", side: "BUY", filled_quantity: "1", filled_price: "3.40", filled_time: 1790870000000 }] },
      { order_id: "o10", symbol: "TSLA", side: "SELL", filled_quantity: "0", filled_price: null },
    ]);
    expect(fills).toHaveLength(1);
    expect(fills[0]).toMatchObject({ id: "order:o9", clientOrderId: "c9", action: "Buy", quantity: 1, price: 3.4, feesReported: false });
  });
});

describe("Webull option fills name their contract", () => {
  it("reads the leg's expiry, strike and right", async () => {
    const { readWebullOrderHistoryFills } = await import("./webullFills");
    const [f] = readWebullOrderHistoryFills([{ order_id: "o1", symbol: "TSLA", side: "BUY", filled_quantity: 1, filled_price: 0.26, legs: [{ strike_price: "355", option_type: "CALL", option_expire_date: "2026-10-02" }] }]);
    expect(f?.symbol).toBe("TSLA 2026-10-02 355C");
  });
});
