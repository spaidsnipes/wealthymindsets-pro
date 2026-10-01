import { describe, expect, it } from "vitest";

import { expectedMove, readFopTicket } from "./fopTicket";

// MNQ futures options: $2 per point (tastytrade notional-value 0.02 / display-factor 0.01).
const base = { right: "PUT" as const, strike: 30675, qty: 1, limit: 10, multiplier: 2, delta: -0.3, theta: -4.5 };

describe("futures-option ticket arithmetic", () => {
  it("long put: pays premium x multiplier; max loss is the premium; breakeven strike - premium", () => {
    // The Founder's real 2026-09-30 fill: bought 1 MNQ 30675 put @ 10 → $20 debit.
    const r = readFopTicket({ ...base, side: "BUY" });
    expect(r).toMatchObject({ cash: -20, maxLoss: 20, maxLossUnlimited: false, breakeven: 30665 });
    expect(r.maxProfit).toBe(30675 * 2 - 20);
    expect(r.deltaDollarsPerPoint).toBeCloseTo(-0.6);
    expect(r.thetaDollarsPerDay).toBeCloseTo(-9);
  });

  it("short call: receives the premium; loss unlimited; theta works for the seller", () => {
    const r = readFopTicket({ ...base, right: "CALL", delta: 0.3, side: "SELL", qty: 2 });
    expect(r).toMatchObject({ cash: 40, maxProfit: 40, maxLossUnlimited: true, maxLoss: null, breakeven: 30685 });
    expect(r.thetaDollarsPerDay).toBeCloseTo(18);
  });

  it("long call: profit unlimited; a missing multiplier or limit yields nulls, never a guess", () => {
    expect(readFopTicket({ ...base, right: "CALL", side: "BUY" }).maxProfitUnlimited).toBe(true);
    const r = readFopTicket({ ...base, side: "BUY", multiplier: null });
    expect(r).toMatchObject({ cash: null, maxLoss: null, deltaDollarsPerPoint: null, thetaDollarsPerDay: null });
    expect(readFopTicket({ ...base, side: "BUY", limit: null }).cash).toBeNull();
  });

  it("expected move = price x IV x sqrt(years); null without inputs", () => {
    // 30,822.5 at IV 34.9% with ~4h left (tastytrade showed ±213.84 for the 0d).
    const em = expectedMove(30822.5, 0.349, 4 * 3_600_000)!;
    expect(em).toBeGreaterThan(200);
    expect(em).toBeLessThan(260);
    expect(expectedMove(null, 0.3, 1)).toBeNull();
    expect(expectedMove(100, 0.3, -5)).toBeNull();
  });
});
