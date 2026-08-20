import { describe, it, expect } from "vitest";
import { visitFromAggregate, parseVisit } from "./nectarLastVisit";
import type { NectarAggregate } from "./nectarComparison";

const agg: NectarAggregate = {
  tradeCount: 42,
  delta: 7,
  buyVol: 100,
  sellVol: 93,
  bigTradeCount: 4,
  horizonSec: 1_000,
  lastTradeAtMs: 1_755_400_000_000,
  channels: 2,
};

describe("visitFromAggregate", () => {
  it("keeps only the comparison fields + capture time", () => {
    const v = visitFromAggregate(agg, 1_755_400_005_000);
    expect(v).toEqual({ capturedAtMs: 1_755_400_005_000, tradeCount: 42, bigTradeCount: 4, delta: 7 });
  });
});

describe("parseVisit", () => {
  it("accepts a well-formed record", () => {
    const v = parseVisit({ capturedAtMs: 123, tradeCount: 10, bigTradeCount: 2, delta: -3 });
    expect(v).toEqual({ capturedAtMs: 123, tradeCount: 10, bigTradeCount: 2, delta: -3 });
  });

  it("rejects non-objects and null", () => {
    expect(parseVisit(null)).toBeNull();
    expect(parseVisit("nope")).toBeNull();
    expect(parseVisit(42)).toBeNull();
  });

  it("rejects missing / non-numeric / non-finite fields", () => {
    expect(parseVisit({ capturedAtMs: 1, tradeCount: 1, bigTradeCount: 1 })).toBeNull(); // missing delta
    expect(parseVisit({ capturedAtMs: 1, tradeCount: "x", bigTradeCount: 1, delta: 0 })).toBeNull();
    expect(parseVisit({ capturedAtMs: Number.NaN, tradeCount: 1, bigTradeCount: 1, delta: 0 })).toBeNull();
  });

  it("rejects nonsensical values (non-positive capture time, negative trades)", () => {
    expect(parseVisit({ capturedAtMs: 0, tradeCount: 1, bigTradeCount: 1, delta: 0 })).toBeNull();
    expect(parseVisit({ capturedAtMs: 100, tradeCount: -1, bigTradeCount: 1, delta: 0 })).toBeNull();
  });

  it("round-trips with visitFromAggregate", () => {
    const built = visitFromAggregate(agg, 999);
    expect(parseVisit(JSON.parse(JSON.stringify(built)))).toEqual(built);
  });
});
