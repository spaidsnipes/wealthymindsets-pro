import { describe, it, expect } from "vitest";
import { validateOrderIntent } from "./tradeLine";
import type { UniversalOrderIntent } from "./BrokerAdapter";

function order(over: Partial<UniversalOrderIntent> = {}): UniversalOrderIntent {
  return {
    clientOrderId: "c-1",
    accountId: "A1",
    symbol: "AAPL",
    side: "buy",
    type: "market",
    qty: 10,
    ...over,
  };
}

describe("validateOrderIntent — structural floor", () => {
  it("accepts a well-formed market order", () => {
    const v = validateOrderIntent(order());
    expect(v.ok).toBe(true);
    expect(v.errors).toEqual([]);
  });

  it("collects ALL errors, not just the first", () => {
    const v = validateOrderIntent(order({ clientOrderId: "", accountId: "", symbol: "", qty: 0 }));
    expect(v.ok).toBe(false);
    expect(v.errors.length).toBeGreaterThanOrEqual(4);
  });

  it("requires clientOrderId (idempotency key)", () => {
    expect(validateOrderIntent(order({ clientOrderId: "  " })).ok).toBe(false);
  });

  it("rejects non-positive / non-finite qty", () => {
    expect(validateOrderIntent(order({ qty: 0 })).ok).toBe(false);
    expect(validateOrderIntent(order({ qty: -5 })).ok).toBe(false);
    expect(validateOrderIntent(order({ qty: Number.NaN })).ok).toBe(false);
    expect(validateOrderIntent(order({ qty: Infinity })).ok).toBe(false);
  });

  it("rejects bad side / type / tif", () => {
    expect(validateOrderIntent(order({ side: "hold" as unknown as "buy" })).ok).toBe(false);
    expect(validateOrderIntent(order({ type: "iceberg" as unknown as "market" })).ok).toBe(false);
    expect(validateOrderIntent(order({ tif: "week" as unknown as "day" })).ok).toBe(false);
  });

  it("limit order requires a positive limitPx", () => {
    expect(validateOrderIntent(order({ type: "limit" })).ok).toBe(false);
    expect(validateOrderIntent(order({ type: "limit", limitPx: 0 })).ok).toBe(false);
    expect(validateOrderIntent(order({ type: "limit", limitPx: 150 })).ok).toBe(true);
  });

  it("stop order requires a positive stopPx", () => {
    expect(validateOrderIntent(order({ type: "stop" })).ok).toBe(false);
    expect(validateOrderIntent(order({ type: "stop", stopPx: 140 })).ok).toBe(true);
  });

  it("stop-limit requires BOTH stopPx and limitPx", () => {
    expect(validateOrderIntent(order({ type: "stop-limit", stopPx: 140 })).ok).toBe(false);
    expect(validateOrderIntent(order({ type: "stop-limit", limitPx: 150 })).ok).toBe(false);
    expect(validateOrderIntent(order({ type: "stop-limit", stopPx: 140, limitPx: 150 })).ok).toBe(true);
  });

  it("warns (non-blocking) when a price field is ignored for the order type", () => {
    const v = validateOrderIntent(order({ type: "market", limitPx: 150 }));
    expect(v.ok).toBe(true);
    expect(v.warnings.some((w) => /limitPx is ignored/i.test(w))).toBe(true);
  });

  it("accepts every valid tif", () => {
    for (const tif of ["day", "gtc", "ioc", "fok"] as const) {
      expect(validateOrderIntent(order({ tif })).ok).toBe(true);
    }
  });
});
