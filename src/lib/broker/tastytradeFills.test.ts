import { describe, expect, it } from "vitest";

import { readTastytradeFills } from "./tastytradeFills";

const T = (id: number, over: Record<string, unknown> = {}) => ({
  id, "transaction-type": "Trade", "transaction-sub-type": "Buy to Open", action: "Buy to Open",
  symbol: "/MNQZ6", "instrument-type": "Future", quantity: "1.0", price: "30900.25",
  value: "0.0", "value-effect": "None", commission: "0.5", "clearing-fees": "0.1", "regulatory-fees": "0.02",
  "executed-at": "2026-10-01T13:31:02.000+00:00", "order-id": 777, ...over,
});

describe("tastytrade fills for the Journal", () => {
  it("reads the broker's own fill fields, fees summed, by broker id", () => {
    const [f] = readTastytradeFills([T(1)]);
    expect(f).toMatchObject({ id: "1", orderId: "777", symbol: "/MNQZ6", action: "Buy to Open", quantity: 1, price: 30900.25 });
    expect(f.fees).toBeCloseTo(0.62);
  });

  it("a replayed or reloaded fill is counted once; non-trades are not fills", () => {
    const fills = readTastytradeFills([T(1), T(1), T(2, { "executed-at": "2026-10-01T13:30:00.000+00:00" }), { id: 3, "transaction-type": "Money Movement" }]);
    expect(fills.map(f => f.id)).toEqual(["2", "1"]);
  });

  it("states the cash effect's direction from tastytrade's own value-effect", () => {
    const [d] = readTastytradeFills([T(5, { "instrument-type": "Equity Option", value: "79.0", "value-effect": "Debit" })]);
    expect(d.value).toBe(-79);
  });
});
