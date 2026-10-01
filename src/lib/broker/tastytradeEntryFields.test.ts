import { describe, expect, it } from "vitest";
import { tastytradeEntryFields, type TastytradeEntryType } from "./tastytradeEntryFields";
import { toTastytradeOrder } from "./tastytradeOrder";
describe("entry ticket to broker mapper", () => {
  it.each(["Market", "Limit", "Stop", "Stop Limit"] as TastytradeEntryType[])("%s keeps exact dated contract and required fields only", type => {
    const fields = tastytradeEntryFields(type, 31000.25, 31001);
    expect(fields).not.toBeNull();
    expect(fields).toEqual({ type, ...(type === "Limit" || type === "Stop Limit" ? { limitPx: 31000.25 } : {}), ...(type === "Stop" || type === "Stop Limit" ? { stopPx: 31001 } : {}) });
    const base = { instrumentType: "Future" as const, symbol: "/MNQZ6", action: "Buy to Open" as const, qty: 1, decisionId: "wmd_D-1842", clientOrderId: "a1b2c3d4e5f60718" };
    expect(toTastytradeOrder({ ...base, ...fields! }).ok).toBe(true);
    expect(toTastytradeOrder({ ...base, symbol: "/MNQ", ...fields! }).ok).toBe(false);
    expect(toTastytradeOrder({ ...base, instrumentType: "Equity", symbol: "TSLA", ...fields! }).ok).toBe(true);
  });
  it("market needs no invented price, stop limit needs both finite positive fields", () => {
    expect(tastytradeEntryFields("Market", null, null)).toEqual({ type: "Market" });
    for (const bad of [null, 0, -1, Infinity, NaN]) {
      expect(tastytradeEntryFields("Limit", bad, 1)).toBeNull();
      expect(tastytradeEntryFields("Stop", 1, bad)).toBeNull();
      expect(tastytradeEntryFields("Stop Limit", bad, 1)).toBeNull();
      expect(tastytradeEntryFields("Stop Limit", 1, bad)).toBeNull();
    }
  });
});
