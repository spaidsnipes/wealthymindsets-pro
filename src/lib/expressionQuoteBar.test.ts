/**
 * THE BAR MAY NEVER MAKE A BOOK LOOK CHEAPER TO CROSS THAN IT IS.
 */

import { describe, expect, it } from "vitest";

import { selectExpressionQuoteBar } from "./expressionQuoteBar";
import type { OptionContract } from "./optionContractResponse";

function contract(patch: Partial<OptionContract> = {}): OptionContract {
  return {
    symbol: "TEST260918C00100000",
    contractType: "call",
    expirationDate: "2026-09-18",
    strike: 100,
    ...patch,
  };
}

describe("selectExpressionQuoteBar", () => {
  it("draws nothing without a contract", () => {
    expect(selectExpressionQuoteBar(null)).toBeNull();
  });

  it("splits the ask into the part that is the gap and the part that is not", () => {
    const bar = selectExpressionQuoteBar(contract({ bid: 1.2, ask: 1.85 }))!;
    expect(bar.spread).toBeCloseTo(0.65);
    // 0.65 / 1.85 — better than a third of the premium is the gap, which is
    // the fact "bid 1.20 · ask 1.85" does not communicate.
    expect(bar.spreadPctOfAsk).toBeCloseTo(35.135, 2);
    expect(bar.bidPctOfAsk + bar.spreadPctOfAsk).toBeCloseTo(100);
    expect(bar.mid).toBeCloseTo(1.525);
  });

  it("divides by the ask, not the mid — the flattering denominator is banned", () => {
    const bar = selectExpressionQuoteBar(contract({ bid: 1, ask: 2 }))!;
    // Share of ask is 50. Share of mid would have been 66.7 for the same book;
    // ask is what the buyer hands over, and it is also the larger denominator,
    // so this is the conservative reading of the two, not the loud one.
    expect(bar.spreadPctOfAsk).toBeCloseTo(50);
    expect(bar.mid).toBeCloseTo(1.5);
  });

  it("treats an unobserved side as UNKNOWN and refuses to draw", () => {
    // The dangerous case: a missing bid coerced to 0 draws a 100% gap — the
    // loudest bar on the page, manufactured out of an absence.
    expect(selectExpressionQuoteBar(contract({ ask: 1.85 }))).toBeNull();
    expect(selectExpressionQuoteBar(contract({ bid: 1.2 }))).toBeNull();
    expect(selectExpressionQuoteBar(contract())).toBeNull();
  });

  it("does not mistake a genuine zero bid for an absence", () => {
    // Nobody bids, and the snapshot DID observe that. It is a real reading and
    // the whole premium is gap — this must draw, and draw at full width.
    const bar = selectExpressionQuoteBar(contract({ bid: 0, ask: 0.05 }))!;
    expect(bar.spreadPctOfAsk).toBeCloseTo(100);
    expect(bar.bidPctOfAsk).toBeCloseTo(0);
  });

  it("refuses a crossed or unreadable book rather than mirroring it", () => {
    expect(selectExpressionQuoteBar(contract({ bid: 2, ask: 1 }))).toBeNull();
    expect(selectExpressionQuoteBar(contract({ bid: 0, ask: 0 }))).toBeNull();
    expect(selectExpressionQuoteBar(contract({ bid: -1, ask: 1 }))).toBeNull();
  });

  it("draws a locked book as no gap at all", () => {
    const bar = selectExpressionQuoteBar(contract({ bid: 1.5, ask: 1.5 }))!;
    expect(bar.spreadPctOfAsk).toBeCloseTo(0);
    expect(bar.bidPctOfAsk).toBeCloseTo(100);
  });

  it("ranks three books the way an eye should rank them", () => {
    const tight = selectExpressionQuoteBar(contract({ bid: 1.95, ask: 2.0 }))!;
    const middling = selectExpressionQuoteBar(contract({ bid: 1.6, ask: 2.0 }))!;
    const wide = selectExpressionQuoteBar(contract({ bid: 0.8, ask: 2.0 }))!;
    expect(tight.spreadPctOfAsk).toBeLessThan(middling.spreadPctOfAsk);
    expect(middling.spreadPctOfAsk).toBeLessThan(wide.spreadPctOfAsk);
  });

  it("carries no verdict — there is no wide/tight flag to render as a badge", () => {
    const bar = selectExpressionQuoteBar(contract({ bid: 0.1, ask: 5 }))!;
    // §8 bans prophecy. A threshold separating acceptable from unacceptable is
    // a market judgement this module does not hold, so no key may appear that
    // a surface could render as a grade.
    expect(Object.keys(bar).sort()).toEqual(
      ["ask", "bid", "bidPctOfAsk", "mid", "spread", "spreadPctOfAsk"],
    );
  });
});
