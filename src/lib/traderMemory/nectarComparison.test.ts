import { describe, it, expect } from "vitest";
import {
  aggregateNectar,
  selectNectarComparison,
  type NectarRowInput,
  type NectarSnapshotLike,
} from "./nectarComparison";

function row(overrides: Partial<NectarRowInput> = {}): NectarRowInput {
  return {
    tradeCount: 10,
    delta: 5,
    buyVol: 30,
    sellVol: 25,
    bigTradeCount: 2,
    horizonSec: 1_000,
    lastTradeAtMs: 1_755_400_000_000,
    ...overrides,
  };
}

function snap(overrides: Partial<NectarSnapshotLike> = {}): NectarSnapshotLike {
  return { tradeCount: 10, bigTradeCount: 2, delta: 5, ...overrides };
}

describe("aggregateNectar", () => {
  it("returns null when no row has trades (never fabricates observed)", () => {
    expect(aggregateNectar([])).toBeNull();
    expect(aggregateNectar([row({ tradeCount: 0 }), row({ tradeCount: 0 })])).toBeNull();
  });

  it("sums across active sources; horizon = earliest, lastTrade = latest", () => {
    const a = aggregateNectar([
      row({ tradeCount: 10, delta: 5, bigTradeCount: 2, horizonSec: 2_000, lastTradeAtMs: 100 }),
      row({ tradeCount: 4, delta: -3, bigTradeCount: 1, horizonSec: 1_000, lastTradeAtMs: 200 }),
    ]);
    expect(a).not.toBeNull();
    expect(a!.tradeCount).toBe(14);
    expect(a!.delta).toBe(2);
    expect(a!.bigTradeCount).toBe(3);
    expect(a!.horizonSec).toBe(1_000);   // earliest
    expect(a!.lastTradeAtMs).toBe(200);  // latest
    expect(a!.channels).toBe(2);
  });

  it("excludes zero-trade rows from the channel count", () => {
    const a = aggregateNectar([row({ tradeCount: 10 }), row({ tradeCount: 0 })]);
    expect(a!.channels).toBe(1);
  });
});

describe("selectNectarComparison", () => {
  it("no current observations → hasCurrent false, all since-fields null, honest detail", () => {
    const c = selectNectarComparison(snap({ tradeCount: 10 }), null);
    expect(c.hasCurrent).toBe(false);
    expect(c.sinceTrades).toBeNull();
    expect(c.nowTradeCount).toBeNull();
    expect(c.detail).toMatch(/nothing to compare/i);
  });

  it("normal growth → positive since deltas + human detail", () => {
    const now = aggregateNectar([row({ tradeCount: 25, delta: 12, bigTradeCount: 5 })])!;
    const c = selectNectarComparison(snap({ tradeCount: 10, delta: 5, bigTradeCount: 2 }), now);
    expect(c.reset).toBe(false);
    expect(c.sinceTrades).toBe(15);
    expect(c.sinceBigTrades).toBe(3);
    expect(c.deltaShift).toBe(7);
    expect(c.detail).toMatch(/15 new trades observed/);
    expect(c.detail).toMatch(/3 big/);
  });

  it("session reset (now < then) → reset true, since null, no misleading negative", () => {
    const now = aggregateNectar([row({ tradeCount: 3, delta: 1, bigTradeCount: 0 })])!;
    const c = selectNectarComparison(snap({ tradeCount: 40, delta: 20, bigTradeCount: 8 }), now);
    expect(c.reset).toBe(true);
    expect(c.sinceTrades).toBeNull();
    expect(c.sinceBigTrades).toBeNull();
    expect(c.deltaShift).toBeNull();
    expect(c.nowTradeCount).toBe(3);   // still reported honestly
    expect(c.detail).toMatch(/reset/i);
  });

  it("no new trades since journal → zero since, honest 'no new trades' detail", () => {
    const now = aggregateNectar([row({ tradeCount: 10, delta: 5, bigTradeCount: 2 })])!;
    const c = selectNectarComparison(snap({ tradeCount: 10, delta: 5, bigTradeCount: 2 }), now);
    expect(c.sinceTrades).toBe(0);
    expect(c.reset).toBe(false);
    expect(c.detail).toMatch(/no new trades/i);
  });

  it("singular grammar for exactly one new trade", () => {
    const now = aggregateNectar([row({ tradeCount: 11, delta: 5, bigTradeCount: 2 })])!;
    const c = selectNectarComparison(snap({ tradeCount: 10, delta: 5, bigTradeCount: 2 }), now);
    expect(c.detail).toMatch(/1 new trade observed/);
    expect(c.detail).not.toMatch(/1 new trades/);
  });

  it("delta can shift negative even as trades grow (sellers took over)", () => {
    const now = aggregateNectar([row({ tradeCount: 30, delta: -8, bigTradeCount: 3 })])!;
    const c = selectNectarComparison(snap({ tradeCount: 10, delta: 5, bigTradeCount: 2 }), now);
    expect(c.sinceTrades).toBe(20);
    expect(c.deltaShift).toBe(-13); // 5 → -8
  });

  it("is a pure function — identical input, identical output", () => {
    const now = aggregateNectar([row()])!;
    const a = selectNectarComparison(snap(), now);
    const b = selectNectarComparison(snap(), now);
    expect(a).toEqual(b);
  });
});
