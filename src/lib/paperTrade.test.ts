import { describe, it, expect } from "vitest";
import { applyFill, type Order, type Position } from "./paperTrade";

/**
 * SHIFT-J J-Bkt 2 — Orkin §22 state-matrix for applyFill.
 *
 * applyFill is the money-adjacent reducer shared between /paper and
 * every one-click chart order. It had ZERO tests before this file —
 * a canon rejection guarantee gap for Founder's Monday 2026-08-24
 * live launch (paper practice must produce the same shape as live).
 *
 * Enumerated states (all realistic branches):
 *   Prior position: NONE / LONG / SHORT
 *     × Incoming side: BUY / SELL
 *     × Size vs prior: same-direction-add / opposite-partial-close /
 *                      opposite-exact-close / opposite-over-flip
 *   Realized P&L sign: profit / loss / zero (open)
 *   Cash delta sign: outflow (buy) / inflow (sell)
 */

const mk = (over: Partial<Order>): Order => ({
  id: "test", symbol: "TSLA", side: "buy", type: "market",
  qty: 1, status: "filled", ts: 0,
  ...over,
});

describe("applyFill — flat account opens position", () => {
  it("BUY into empty positions → LONG position, cash outflow, realized 0", () => {
    const r = applyFill([], mk({ side: "buy", qty: 10 }), 100);
    expect(r.positions.length).toBe(1);
    expect(r.positions[0]).toMatchObject({ symbol: "TSLA", qty: 10, avgPx: 100, marketPx: 100 });
    expect(r.cashDelta).toBe(-1000);
    expect(r.realized).toBe(0);
    expect(r.trade.pnl).toBeUndefined();
  });
  it("SELL into empty positions → SHORT position (negative qty), cash inflow, realized 0", () => {
    const r = applyFill([], mk({ side: "sell", qty: 10 }), 100);
    expect(r.positions[0]).toMatchObject({ symbol: "TSLA", qty: -10, avgPx: 100 });
    expect(r.cashDelta).toBe(1000);
    expect(r.realized).toBe(0);
  });
  it("BUY into flat existing position (qty=0) → replaces with LONG at fill price", () => {
    const flat: Position = { symbol: "TSLA", qty: 0, avgPx: 0, unrealPnl: 0, marketPx: 0 };
    const r = applyFill([flat], mk({ side: "buy", qty: 5 }), 200);
    expect(r.positions).toEqual([{ symbol: "TSLA", qty: 5, avgPx: 200, unrealPnl: 0, marketPx: 200 }]);
    expect(r.realized).toBe(0);
  });
});

describe("applyFill — same-direction add (average-price update)", () => {
  it("LONG 10 @ $100 + BUY 5 @ $110 → LONG 15 @ ~$103.33", () => {
    const pos: Position = { symbol: "TSLA", qty: 10, avgPx: 100, unrealPnl: 0, marketPx: 100 };
    const r = applyFill([pos], mk({ side: "buy", qty: 5 }), 110);
    expect(r.positions[0].qty).toBe(15);
    expect(r.positions[0].avgPx).toBeCloseTo((100 * 10 + 110 * 5) / 15, 6);
    expect(r.cashDelta).toBe(-550);
    expect(r.realized).toBe(0);
  });
  it("SHORT -10 @ $100 + SELL 5 @ $90 → SHORT -15 with weighted-average avgPx", () => {
    const pos: Position = { symbol: "TSLA", qty: -10, avgPx: 100, unrealPnl: 0, marketPx: 100 };
    const r = applyFill([pos], mk({ side: "sell", qty: 5 }), 90);
    expect(r.positions[0].qty).toBe(-15);
    // signedQty = -5, weighted avg = (100 * -10 + 90 * -5) / -15 = (-1000 -450)/-15 = 96.67
    expect(r.positions[0].avgPx).toBeCloseTo((100 * -10 + 90 * -5) / -15, 6);
    expect(r.cashDelta).toBe(450);
    expect(r.realized).toBe(0);
  });
});

describe("applyFill — opposite-direction partial close (realized P&L)", () => {
  it("LONG 10 @ $100 + SELL 5 @ $110 → LONG 5 remaining, realized +$50 on 5 shares", () => {
    const pos: Position = { symbol: "TSLA", qty: 10, avgPx: 100, unrealPnl: 0, marketPx: 100 };
    const r = applyFill([pos], mk({ side: "sell", qty: 5 }), 110);
    expect(r.positions[0].qty).toBe(5);
    expect(r.positions[0].avgPx).toBe(100); // preserved on partial close
    expect(r.cashDelta).toBe(550);
    expect(r.realized).toBe(50); // 5 * (110-100)
    expect(r.trade.pnl).toBe(50);
  });
  it("LONG 10 @ $100 + SELL 5 @ $90 → LONG 5 remaining, realized -$50", () => {
    const pos: Position = { symbol: "TSLA", qty: 10, avgPx: 100, unrealPnl: 0, marketPx: 100 };
    const r = applyFill([pos], mk({ side: "sell", qty: 5 }), 90);
    expect(r.positions[0].qty).toBe(5);
    expect(r.realized).toBe(-50);
    expect(r.trade.pnl).toBe(-50);
  });
  it("SHORT -10 @ $100 + BUY 5 @ $90 → covering at lower is a profit → realized +$50", () => {
    const pos: Position = { symbol: "TSLA", qty: -10, avgPx: 100, unrealPnl: 0, marketPx: 100 };
    const r = applyFill([pos], mk({ side: "buy", qty: 5 }), 90);
    expect(r.positions[0].qty).toBe(-5);
    expect(r.positions[0].avgPx).toBe(100);
    expect(r.cashDelta).toBe(-450);
    expect(r.realized).toBe(50);
  });
  it("SHORT -10 @ $100 + BUY 5 @ $110 → covering at higher is a loss → realized -$50", () => {
    const pos: Position = { symbol: "TSLA", qty: -10, avgPx: 100, unrealPnl: 0, marketPx: 100 };
    const r = applyFill([pos], mk({ side: "buy", qty: 5 }), 110);
    expect(r.realized).toBe(-50);
  });
});

describe("applyFill — opposite-direction EXACT close (position removed)", () => {
  it("LONG 10 @ $100 + SELL 10 @ $110 → position removed, realized +$100", () => {
    const pos: Position = { symbol: "TSLA", qty: 10, avgPx: 100, unrealPnl: 0, marketPx: 100 };
    const r = applyFill([pos], mk({ side: "sell", qty: 10 }), 110);
    expect(r.positions.length).toBe(0);
    expect(r.cashDelta).toBe(1100);
    expect(r.realized).toBe(100);
  });
  it("SHORT -10 @ $100 + BUY 10 @ $90 → position removed, realized +$100", () => {
    const pos: Position = { symbol: "TSLA", qty: -10, avgPx: 100, unrealPnl: 0, marketPx: 100 };
    const r = applyFill([pos], mk({ side: "buy", qty: 10 }), 90);
    expect(r.positions.length).toBe(0);
    expect(r.realized).toBe(100);
  });
});

describe("applyFill — opposite-direction OVER-flip (direction reversal)", () => {
  it("LONG 10 @ $100 + SELL 15 @ $110 → SHORT -5 at $110, realized +$100 on the 10 closed", () => {
    const pos: Position = { symbol: "TSLA", qty: 10, avgPx: 100, unrealPnl: 0, marketPx: 100 };
    const r = applyFill([pos], mk({ side: "sell", qty: 15 }), 110);
    expect(r.positions[0].qty).toBe(-5);
    expect(r.positions[0].avgPx).toBe(110); // flipped side → new basis is the fill price
    expect(r.cashDelta).toBe(1650);
    expect(r.realized).toBe(100); // only the 10 that closed the long
  });
  it("SHORT -10 @ $100 + BUY 15 @ $90 → LONG +5 at $90, realized +$100 on the 10 covered", () => {
    const pos: Position = { symbol: "TSLA", qty: -10, avgPx: 100, unrealPnl: 0, marketPx: 100 };
    const r = applyFill([pos], mk({ side: "buy", qty: 15 }), 90);
    expect(r.positions[0].qty).toBe(5);
    expect(r.positions[0].avgPx).toBe(90);
    expect(r.realized).toBe(100);
  });
});

describe("applyFill — cross-symbol isolation", () => {
  it("Trading MSFT does not touch an existing TSLA position", () => {
    const tsla: Position = { symbol: "TSLA", qty: 10, avgPx: 100, unrealPnl: 0, marketPx: 100 };
    const r = applyFill([tsla], mk({ symbol: "MSFT", side: "buy", qty: 5 }), 200);
    expect(r.positions.length).toBe(2);
    expect(r.positions.find(p => p.symbol === "TSLA")).toEqual(tsla);
    const msft = r.positions.find(p => p.symbol === "MSFT");
    expect(msft?.qty).toBe(5);
    expect(msft?.avgPx).toBe(200);
  });
});

describe("applyFill — cash-delta invariant (canon: cash = -signedQty * fillPx)", () => {
  it.each([
    { side: "buy" as const,  qty: 1,  fillPx: 100, expected: -100 },
    { side: "buy" as const,  qty: 5,  fillPx: 200, expected: -1000 },
    { side: "sell" as const, qty: 1,  fillPx: 100, expected: +100 },
    { side: "sell" as const, qty: 5,  fillPx: 200, expected: +1000 },
  ])("$side $qty @ $$fillPx → cashDelta $expected", ({ side, qty, fillPx, expected }) => {
    const r = applyFill([], mk({ side, qty }), fillPx);
    expect(r.cashDelta).toBe(expected);
  });
});
