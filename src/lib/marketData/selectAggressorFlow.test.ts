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
