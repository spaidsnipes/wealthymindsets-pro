import { describe, expect, it } from "vitest";

import { osiToTastytrade, toTastytradeOrder, type TtOrderIntent } from "./tastytradeOrder";

const base: TtOrderIntent = { instrumentType: "Equity Option", symbol: "TSLA  261002C00305000", action: "Buy to Open", qty: 1, type: "Limit", limitPx: 49.5, decisionId: "wmd_D-1842", clientOrderId: "a1b2c3d4e5f60718" };

describe("tastytrade order JSON (Garden 18 §LXXIV–§XCV)", () => {
  it("OSI → tastytrade's padded OCC", () => {
    expect(osiToTastytrade("TSLA261002C00305000")).toBe("TSLA  261002C00305000");
    expect(osiToTastytrade("SPY261016P00702500")).toBe("SPY   261016P00702500");
    expect(osiToTastytrade("nope")).toBeNull();
  });

  it("an equity option, exactly as documented", () => {
    expect(toTastytradeOrder(base)).toEqual({ ok: true, order: {
      "time-in-force": "Day", "order-type": "Limit", price: "49.5", "price-effect": "Debit", source: "wm-pro",
      "external-identifier": "a1b2c3d4e5f60718",
      legs: [{ "instrument-type": "Equity Option", symbol: "TSLA  261002C00305000", quantity: 1, action: "Buy to Open" }],
    } });
  });

  it("a specific futures contract and a futures option pass; a continuous symbol never routes", () => {
    expect(toTastytradeOrder({ ...base, instrumentType: "Future", symbol: "/MNQZ6", limitPx: 21000 }).ok).toBe(true);
    expect(toTastytradeOrder({ ...base, instrumentType: "Future Option", symbol: "./MNQZ6 MQZ6 261016C21000", limitPx: 120 }).ok).toBe(true);
    const cont = toTastytradeOrder({ ...base, instrumentType: "Future", symbol: "/MNQ", limitPx: 21000 });
    expect(cont).toMatchObject({ ok: false, reason: expect.stringMatching(/continuous symbol is never routed/) });
    expect(toTastytradeOrder({ ...base, instrumentType: "Future", symbol: "NQ1!" }).ok).toBe(false);
  });

  it("crypto names its pair and may be fractional; everything else is whole", () => {
    expect(toTastytradeOrder({ ...base, instrumentType: "Cryptocurrency", symbol: "BTC/USD", qty: 0.01, limitPx: 84000 }).ok).toBe(true);
    expect(toTastytradeOrder({ ...base, instrumentType: "Cryptocurrency", symbol: "BTC", qty: 0.01, limitPx: 84000 }).ok).toBe(false);
    expect(toTastytradeOrder({ ...base, qty: 1.5 }).ok).toBe(false);
  });

  it("sells are Credit; no decision, no order", () => {
    const sell = toTastytradeOrder({ ...base, action: "Sell to Close" });
    expect(sell.ok && sell.order["price-effect"]).toBe("Credit");
    expect(toTastytradeOrder({ ...base, decisionId: "" }).ok).toBe(false);
  });
});
