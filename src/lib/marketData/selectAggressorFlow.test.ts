/**
 * selectAggressorFlow — pure CVD/VWAP computation tests.
 * Mirrors and locks the math currently inlined in SmartMoneyPanel so
 * a future refactor can safely swap the primitive in without silent
 * numeric drift.
 */

import { describe, it, expect } from "vitest";
import {
  selectAggressorFlow,
  type AggressorTick,
} from "./selectAggressorFlow";

function tick(over: Partial<AggressorTick>): AggressorTick {
  return { trade: true, size: 1, price: 100, side: "buy", ...over };
}

describe("selectAggressorFlow — canon aggressor-flow selector", () => {
  it("returns an honest empty snapshot for null / undefined / [] ticks", () => {
    for (const input of [null, undefined, []] as const) {
      const s = selectAggressorFlow(input as unknown as AggressorTick[]);
      expect(s.haveData).toBe(false);
      expect(s.hasFlow).toBe(false);
      expect(s.cvd).toBe(0);
      expect(s.askVol).toBe(0);
      expect(s.bidVol).toBe(0);
      expect(s.vwap).toBe(0);
    }
  });

  it("falls back to livePrice for vwap when there is no observed volume", () => {
    const s = selectAggressorFlow([], 123.45);
    expect(s.vwap).toBeCloseTo(123.45);
  });

  it("computes CVD as askVol - bidVol on real trades", () => {
    const s = selectAggressorFlow([
      tick({ side: "buy", size: 3, price: 100 }),
      tick({ side: "buy", size: 2, price: 101 }),
      tick({ side: "sell", size: 4, price: 100 }),
    ]);
    expect(s.askVol).toBe(5);
    expect(s.bidVol).toBe(4);
    expect(s.cvd).toBe(1);
    expect(s.hasFlow).toBe(true);
    expect(s.haveData).toBe(true);
  });

  it("computes VWAP as sum(price*size) / sum(size)", () => {
    const s = selectAggressorFlow([
      tick({ side: "buy", size: 1, price: 100 }),
      tick({ side: "sell", size: 3, price: 104 }),
    ]);
    // (100*1 + 104*3) / (1+3) = (100+312)/4 = 103
    expect(s.vwap).toBeCloseTo(103);
  });

  it("filters out ticks with size ≤ 0 / price ≤ 0 / trade !== true (canon §Silence — no fabrication)", () => {
    const s = selectAggressorFlow([
      tick({ side: "buy", size: 5, price: 100 }),         // valid
      tick({ side: "sell", size: 0, price: 100 }),        // zero size — skipped
      tick({ side: "sell", size: 2, price: 0 }),          // zero price — skipped
      { size: 3, price: 100, side: "buy" },               // trade undefined — skipped
      tick({ side: "buy", size: -1, price: 100 }),        // negative size — skipped
    ]);
    expect(s.askVol).toBe(5);
    expect(s.bidVol).toBe(0);
    expect(s.cvd).toBe(5);
  });

  it("sets askDom=true when askVol >= bidVol, false when bidVol > askVol", () => {
    const dominantAsk = selectAggressorFlow([
      tick({ side: "buy", size: 10 }),
      tick({ side: "sell", size: 5 }),
    ]);
    expect(dominantAsk.askDom).toBe(true);

    const dominantBid = selectAggressorFlow([
      tick({ side: "buy", size: 5 }),
      tick({ side: "sell", size: 10 }),
    ]);
    expect(dominantBid.askDom).toBe(false);

    const tie = selectAggressorFlow([
      tick({ side: "buy", size: 5 }),
      tick({ side: "sell", size: 5 }),
    ]);
    // Tie → askDom=true (askVol >= bidVol matches SmartMoneyPanel's operator)
    expect(tie.askDom).toBe(true);
  });

  it("computes imbRatio as dominant/weaker * 100 when both sides present", () => {
    const s = selectAggressorFlow([
      tick({ side: "buy", size: 10 }),
      tick({ side: "sell", size: 2 }),
    ]);
    // 10 / 2 * 100 = 500
    expect(s.imbRatio).toBe(500);
  });

  it("flags one-sided flow and keeps the 300 numeric sentinel for dominance consumers", () => {
    const s = selectAggressorFlow([
      tick({ side: "buy", size: 10 }),
    ]);
    // The true ratio is unbounded. 300 is a sentinel for numeric consumers,
    // NOT a measurement — `oneSided` is what display layers must read so the
    // trader never sees a fabricated "300:100" chip (LIVING-PIXEL LAW).
    expect(s.oneSided).toBe(true);
    expect(s.imbRatio).toBe(300);
  });

  it("does not flag oneSided when both aggressor sides have volume", () => {
    const s = selectAggressorFlow([
      tick({ side: "buy", size: 10 }),
      tick({ side: "sell", size: 2 }),
    ]);
    expect(s.oneSided).toBe(false);
    expect(s.imbRatio).toBe(500);
  });

  it("imbRatio defaults to 100 on empty flow and is not one-sided", () => {
    const s = selectAggressorFlow([]);
    expect(s.imbRatio).toBe(100);
    expect(s.oneSided).toBe(false);
  });

  it("hasFlow=false when zero volume observed (haveData may still be false)", () => {
    const s = selectAggressorFlow([
      { size: 0, price: 100, side: "buy", trade: true },
    ]);
    expect(s.hasFlow).toBe(false);
  });
});

/**
 * AGGRESSOR PROVENANCE — "how do you know these sides?" (2026-09-11)
 *
 * `CanonicalMarketEvent` has always published `aggressorMethod`. Nothing in
 * `src/` rendered it, and `AggressorTick` narrowed the fact away at the seam,
 * so a tick-rule reconstruction from the Alpaca relay (confidence 0.5, and the
 * only live equity tape today) was painted in exactly the chrome a
 * venue-asserted Coinbase aggressor gets.
 *
 * These tests drive the DERIVATION. A test that retyped "INFERRED" for a
 * fixture without asking the selector would pin the next provider migration's
 * bug green the same way the retyped broker list did.
 */
describe("selectAggressorFlow — provenance is derived, never assumed", () => {
  const sided = (
    side: "buy" | "sell",
    method: string | undefined,
    size = 10,
  ): AggressorTick => ({
    trade: true,
    size,
    price: 100,
    side,
    marketEvent: method === undefined
      ? undefined
      : { aggressorMethod: method as never },
  });

  it("REGRESSION: a pure tick-rule tape is INFERRED, not silently trustworthy", () => {
    const s = selectAggressorFlow([
      sided("buy", "TICK_RULE"),
      sided("sell", "TICK_RULE", 4),
    ]);
    expect(s.provenance).toBe("INFERRED");
    expect(s.provenance).not.toBe("PROVIDER");
    // The numbers themselves are unchanged — this is a disclosure, not a filter.
    expect(s.askVol).toBe(10);
    expect(s.bidVol).toBe(4);
    expect(s.cvd).toBe(6);
  });

  it("a venue-asserted tape is PROVIDER", () => {
    expect(selectAggressorFlow([sided("buy", "PROVIDER")]).provenance).toBe("PROVIDER");
  });

  it("MAKER_SIDE_INVERTED counts as PROVIDER — inverting a maker flag is deterministic, not a guess", () => {
    expect(selectAggressorFlow([sided("sell", "MAKER_SIDE_INVERTED")]).provenance).toBe("PROVIDER");
  });

  it("QUOTE_TEST is INFERRED — a quote comparison reconstructs, it does not observe", () => {
    expect(selectAggressorFlow([sided("buy", "QUOTE_TEST")]).provenance).toBe("INFERRED");
  });

  it("weakest link: one guessed print among venue-asserted prints makes the whole figure MIXED", () => {
    const s = selectAggressorFlow([
      sided("buy", "PROVIDER", 1000),
      sided("buy", "PROVIDER", 1000),
      sided("sell", "TICK_RULE", 1),
    ]);
    // NOT a majority vote. 2000 good prints do not vouch for the third.
    expect(s.provenance).toBe("MIXED");
    expect(s.provenance).not.toBe("PROVIDER");
  });

  it("a tape that says nothing about method is UNDISCLOSED, never PROVIDER by default", () => {
    expect(selectAggressorFlow([sided("buy", undefined)]).provenance).toBe("UNDISCLOSED");
    expect(selectAggressorFlow([sided("buy", "NONE")]).provenance).toBe("UNDISCLOSED");
  });

  it("an empty snapshot is UNDISCLOSED — absence of flow is not a clean bill of health", () => {
    expect(selectAggressorFlow([]).provenance).toBe("UNDISCLOSED");
    expect(selectAggressorFlow(null).provenance).toBe("UNDISCLOSED");
  });

  it("REGRESSION: an unsided print is NOT counted as a sell", () => {
    // The old `else` branch turned "we do not know the side" into bidVol,
    // fabricating seller-initiated volume out of an absent field — and then
    // reported askDom=false from it, painting the strip red.
    const s = selectAggressorFlow([
      { trade: true, size: 50, price: 100, side: "buy", marketEvent: { aggressorMethod: "PROVIDER" } },
      { trade: true, size: 999, price: 100 },
    ]);
    expect(s.bidVol).toBe(0);
    expect(s.askVol).toBe(50);
    expect(s.askDom).toBe(true);
    // It is still a real print: it moves VWAP and it is disclosed.
    expect(s.haveData).toBe(true);
    expect(s.provenance).toBe("MIXED");
  });

  it("an unsided print still contributes to VWAP — it is a real trade, just an unattributed one", () => {
    const s = selectAggressorFlow([
      { trade: true, size: 1, price: 100, side: "buy" },
      { trade: true, size: 1, price: 200 },
    ]);
    expect(s.vwap).toBe(150);
  });
});
