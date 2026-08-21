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

import { authorizeOrder } from "./tradeLine";
import type { BrokerCapabilities } from "./BrokerAdapter";

function caps(over: Partial<BrokerCapabilities> = {}): BrokerCapabilities {
  return {
    assetClasses: ["equity"],
    orderTypes: ["market", "limit"],
    supportsPaper: true,
    supportsLive: false,
    supportsBracketOrders: false,
    supportsShort: false,
    notes: [],
    ...over,
  };
}

describe("authorizeOrder — validation + capability gate", () => {
  it("authorizes a structurally-valid order the broker supports", () => {
    const a = authorizeOrder(order({ type: "market", assetClass: "equity" }), caps());
    expect(a.authorized).toBe(true);
    expect(a.errors).toEqual([]);
  });

  it("rejects an order type the broker does not declare", () => {
    const a = authorizeOrder(order({ type: "stop", stopPx: 100 }), caps({ orderTypes: ["market", "limit"] }));
    expect(a.authorized).toBe(false);
    expect(a.errors.some((e) => /does not support stop orders/i.test(e))).toBe(true);
  });

  it("rejects an asset class the broker does not declare", () => {
    const a = authorizeOrder(order({ assetClass: "future" }), caps({ assetClasses: ["equity"] }));
    expect(a.authorized).toBe(false);
    expect(a.errors.some((e) => /does not support future/i.test(e))).toBe(true);
  });

  it("carries structural errors through (malformed intent never authorized)", () => {
    const a = authorizeOrder(order({ qty: 0 }), caps());
    expect(a.authorized).toBe(false);
    expect(a.errors.some((e) => /qty must be/i.test(e))).toBe(true);
  });

  it("warns on a sell when short is not declared (non-blocking)", () => {
    const a = authorizeOrder(order({ side: "sell" }), caps({ supportsShort: false }));
    expect(a.authorized).toBe(true);
    expect(a.warnings.some((w) => /short/i.test(w))).toBe(true);
  });

  it("empty declared capabilities → honest rejection, not a fabricated allow", () => {
    const a = authorizeOrder(order({ type: "market" }), caps({ orderTypes: [], assetClasses: [] }));
    expect(a.authorized).toBe(false);
    expect(a.errors.some((e) => /none yet/i.test(e))).toBe(true);
  });
});
