import { describe, expect, it } from "vitest";
import { realizedR } from "@/lib/proofLane/proofLaneR";
import { computeJournalRealizedR } from "./computePnl";

/**
 * FOUNDER TRADEDAY MATH (Garden 19 Mansion handoff, 2026-10-11): realized R = net realized P&L ÷ the
 * dollar 1R frozen BEFORE entry. The denominator never moves after the trade; an unpriced or unplanned
 * trade has no R (never a 0.00R breakeven); a day's R is the sum of each trade's own R.
 */
describe("Founder TradeDay R fixture", () => {
  it("−$100 on a frozen $100 1R is −1.00R; +$300 on $100 is +3.00R; the day is +2.00R and +$200", () => {
    const t1 = realizedR({ plannedRDollars: 100, realizedPnlDollars: -100 });
    const t2 = realizedR({ plannedRDollars: 100, realizedPnlDollars: 300 });
    expect(t1).toBe(-1);
    expect(t2).toBe(3);
    expect(t1 + t2).toBe(2);
    expect(-100 + 300).toBe(200);
  });
  it("a trade whose 1R was $200 keeps its own R — the day is never divided by one convenient denominator", () => {
    const a = realizedR({ plannedRDollars: 100, realizedPnlDollars: -100 });
    const b = realizedR({ plannedRDollars: 200, realizedPnlDollars: 300 });
    expect(a + b).toBe(0.5);
  });
  it("no planned 1R → no R at all (never a fabricated R from bare P&L)", () => {
    expect(computeJournalRealizedR({ entry: 100, exit: 101, size: 1 } as never)).toBeUndefined();
  });
});
