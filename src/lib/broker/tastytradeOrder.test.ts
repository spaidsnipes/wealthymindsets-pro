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
    // The live chain pads the root: two spaces before the date (read 2026-10-01).
    expect(toTastytradeOrder({ ...base, instrumentType: "Future Option", symbol: "./ESH7 EWZ6  261231C4750", limitPx: 12.5 }).ok).toBe(true);
    // MNQ: a 5-character future fills its slot, so the live chain symbol has no padding space.
    expect(toTastytradeOrder({ ...base, instrumentType: "Future Option", symbol: "./MNQZ6MN2CV6261014C31000", limitPx: 12.5 }).ok).toBe(true);
    expect(toTastytradeOrder({ ...base, instrumentType: "Future Option", symbol: "MNQZ6 C31000", limitPx: 12.5 }).ok).toBe(false);
    // Crypto limits are GTC at tastytrade; everything else stays Day.
    const c = toTastytradeOrder({ ...base, instrumentType: "Cryptocurrency", symbol: "BTC/USD", qty: 0.001, limitPx: 80000 });
    expect(c.ok && c.order["time-in-force"]).toBe("GTC");
    // §LXXVIII broker-native stop: a Stop carries a trigger and no price; GTC when asked.
    const st = toTastytradeOrder({ ...base, instrumentType: "Future", symbol: "/MNQZ6", action: "Sell to Close", type: "Stop", stopPx: 30614.5, limitPx: undefined, tif: "GTC" });
    expect(st.ok && st.order).toMatchObject({ "order-type": "Stop", "stop-trigger": "30614.5", "time-in-force": "GTC" });
    expect(st.ok && "price" in st.order).toBe(false);
    expect(toTastytradeOrder({ ...base, instrumentType: "Future", symbol: "/MNQZ6", type: "Stop", limitPx: undefined }).ok).toBe(false);
    const sl = toTastytradeOrder({ ...base, instrumentType: "Future", symbol: "/MNQZ6", type: "Stop Limit", stopPx: 30614.5, limitPx: 30610 });
    expect(sl.ok && sl.order).toMatchObject({ "order-type": "Stop Limit", "stop-trigger": "30614.5", price: "30610" });
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
