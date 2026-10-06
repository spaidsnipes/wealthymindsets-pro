import { describe, expect, it } from "vitest";

import { buildTtRoundTrips, summarizeTtLedger, ttFeeScope } from "./tastytradeLedger";
import type { TtFill } from "./tastytradeFills";

const f = (id: string, symbol: string, action: string, quantity: number, value: number, fees: number, at: string, type = "Equity Option"): TtFill =>
  ({ id, orderId: null, symbol, instrumentType: type, action, quantity, price: null, value, fees, executedAt: at });

describe("tastytrade Lifetime Ledger — round trips from the broker's own cash", () => {
  it("a long option bought and sold is one closed trip, net = cash − fees", () => {
    const trips = buildTtRoundTrips([
      f("1", "SPY 261003C00570000", "Buy to Open", 2, -300, 2.3, "2026-10-01T14:00:00Z"),
      f("2", "SPY 261003C00570000", "Sell to Close", 2, 420, 2.4, "2026-10-01T15:00:00Z"),
    ]);
    expect(trips).toHaveLength(1);
    expect(trips[0]).toMatchObject({ direction: "LONG", gross: 120, fees: 4.7, net: 115.3, truth: "ACTUAL BROKER RESULT", maxQty: 2 });
  });

  it("scaling in and out stays one trip until flat; a remaining position is OPEN, never a result", () => {
    const trips = buildTtRoundTrips([
      f("1", "/MNQZ6", "Buy to Open", 1, -10, 1, "2026-10-01T14:00:00Z", "Future"),
      f("2", "/MNQZ6", "Buy to Open", 1, -10, 1, "2026-10-01T14:01:00Z", "Future"),
      f("3", "/MNQZ6", "Sell to Close", 2, 50, 2, "2026-10-01T14:05:00Z", "Future"),
      f("4", "/MNQZ6", "Sell to Open", 1, 5, 1, "2026-10-01T15:00:00Z", "Future"),
    ]);
    const closed = trips.filter(t => t.truth !== "OPEN");
    expect(closed).toHaveLength(1);
    expect(closed[0]).toMatchObject({ fills: 3, maxQty: 2, net: 26 });
    const open = trips.find(t => t.truth === "OPEN")!;
    expect(open).toMatchObject({ direction: "SHORT", net: 0 });
  });

  it("summary counts only closed trips and groups by instrument type", () => {
    const trips = buildTtRoundTrips([
      f("1", "A", "Buy to Open", 1, -100, 1, "2026-10-01T14:00:00Z", "Equity"),
      f("2", "A", "Sell to Close", 1, 90, 1, "2026-10-01T15:00:00Z", "Equity"),
      f("3", "B", "Buy to Open", 1, -100, 1, "2026-10-01T14:00:00Z", "Equity Option"),
    ]);
    expect(summarizeTtLedger(trips)).toMatchObject({ closed: 1, open: 1, wins: 0, losses: 1, net: -12, fees: 2 });
  });

  it("uses tastytrade's own net-value when every fill carries it", () => {
    const a = { ...f("1", "X", "Buy to Open", 1, -100, 1, "2026-10-01T14:00:00Z"), netValue: -101.05 };
    const b = { ...f("2", "X", "Sell to Close", 1, 150, 1, "2026-10-01T15:00:00Z"), netValue: 148.95 };
    expect(buildTtRoundTrips([a, b])[0].net).toBe(47.9);
  });
});

describe("Garden 18 §4 — realized, gross and fees stay distinct; a partial fee sum is never the broker total", () => {
  // The Founder's case: two closed fills, net −$21.42 including $2.42 fees.
  const trips = buildTtRoundTrips([
    f("1", "/MESZ6", "Buy to Open", 1, -1000, 1.21, "2026-10-05T14:00:00Z", "Future"),
    f("2", "/MESZ6", "Sell to Close", 1, 981, 1.21, "2026-10-05T14:10:00Z", "Future"),
    f("3", "/MNQZ6", "Buy to Open", 1, -50, 0.62, "2026-10-05T15:00:00Z", "Future"),
  ]);
  const s = summarizeTtLedger(trips);
  it("realized after fees, before fees and fees are three figures", () => {
    expect(s).toMatchObject({ net: -21.42, gross: -19, fees: 2.42 });
    expect(s.gross - s.fees).toBeCloseTo(s.net, 6);
  });
  it("fees paid on an open leg are counted apart, never folded into realized", () => {
    expect(s.openFees).toBe(0.62);
    expect(s.fees).toBe(2.42);
  });
  it("the fee figure says what it covers, and a truncated read says it is not the total", () => {
    expect(ttFeeScope(s, false)).toMatch(/closed round trips only/);
    expect(ttFeeScope(s, false)).toMatch(/0\.62 paid on 1 open position, not realized/);
    expect(ttFeeScope(s, false)).toMatch(/not an account fee total/);
    expect(ttFeeScope(s, true)).toMatch(/NOT your tastytrade fee total/);
  });
});
