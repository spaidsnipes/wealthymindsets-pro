/**
 * domTruth — truth-lock for the observed-DOM ladder builder + mid-price
 * derivation. Both are pure and consumed by the chart's L2/depth surface.
 */

import { describe, it, expect } from "vitest";
import { buildObservedDom, deriveDomCenter, type DomLevel } from "./domTruth";

describe("buildObservedDom — observed DOM ladder", () => {
  it("returns [] on empty bids and asks", () => {
    const out = buildObservedDom([], [], 2);
    expect(out).toEqual([]);
  });

  it("caps at 12 asks + 12 bids and orders asks HIGHEST→closest-to-spread, bids HIGHEST→closest", () => {
    const asks = Array.from({ length: 20 }, (_, i) => ({ price: 100 + i, size: 5 }));
    const bids = Array.from({ length: 20 }, (_, i) => ({ price: 99 - i, size: 5 }));
    const out = buildObservedDom(bids, asks, 2);
    expect(out.filter((level) => !level.isBid)).toHaveLength(12);
    expect(out.filter((level) => level.isBid)).toHaveLength(12);
    // First entry is the highest-priced ask (top of ladder rendering).
    const askRows = out.filter((level) => !level.isBid);
    expect(askRows[0].price).toBe(111);
    // Bids start with best bid (highest bid price).
    const bidRows = out.filter((level) => level.isBid);
    expect(bidRows[0].price).toBe(99);
  });

  it("wall detection: isWall = size >= 60% of max side size", () => {
    // Max bid size 10 → wallThreshold = 6.
    const out = buildObservedDom(
      [{ price: 99, size: 10 }, { price: 98, size: 5 }],
      [{ price: 101, size: 3 }, { price: 102, size: 7 }],
      2,
    );
    // The 10-size bid crosses threshold (10 >= 6) → wall.
    expect(out.find((l) => l.isBid && l.price === 99)?.isWall).toBe(true);
    // The 5-size bid doesn't (5 < 6) → not a wall.
    expect(out.find((l) => l.isBid && l.price === 98)?.isWall).toBe(false);
    // The 7-size ask (7 >= 6) → wall; the 3-size ask → not.
    expect(out.find((l) => !l.isBid && l.price === 102)?.isWall).toBe(true);
    expect(out.find((l) => !l.isBid && l.price === 101)?.isWall).toBe(false);
  });

  it("rounds price to `dp` decimal places", () => {
    const out = buildObservedDom(
      [{ price: 99.12345, size: 1 }],
      [{ price: 100.98765, size: 1 }],
      2,
    );
    expect(out.find((l) => l.isBid)?.price).toBeCloseTo(99.12);
    expect(out.find((l) => !l.isBid)?.price).toBeCloseTo(100.99);
  });

  it("rounds size to 2 decimal places", () => {
    const out = buildObservedDom(
      [{ price: 99, size: 3.14159 }],
      [{ price: 100, size: 2.7182 }],
      2,
    );
    expect(out.find((l) => l.isBid)?.bidSize).toBeCloseTo(3.14);
    expect(out.find((l) => !l.isBid)?.askSize).toBeCloseTo(2.72);
  });
});

describe("deriveDomCenter — mid-price with fallback", () => {
  function bid(price: number): DomLevel {
    return { price, bidSize: 1, askSize: 0, isWall: false, isBid: true };
  }
  function ask(price: number): DomLevel {
    return { price, bidSize: 0, askSize: 1, isWall: false, isBid: false };
  }

  it("returns fallback when the ladder is empty", () => {
    expect(deriveDomCenter([], 123.45)).toBeCloseTo(123.45);
  });

  it("returns (bestBid + bestAsk) / 2 when both sides present", () => {
    expect(deriveDomCenter([bid(99), bid(98), ask(101), ask(102)], 0)).toBeCloseTo(100);
  });

  it("returns best-bid alone when no asks present", () => {
    expect(deriveDomCenter([bid(99), bid(98)], 0)).toBeCloseTo(99);
  });

  it("returns best-ask alone when no bids present", () => {
    expect(deriveDomCenter([ask(101), ask(102)], 0)).toBeCloseTo(101);
  });

  it("best-bid is the highest bid price; best-ask is the lowest ask price", () => {
    // Verifies the max/min contract even when levels are shuffled.
    const shuffled = [ask(105), bid(97), ask(103), bid(99), ask(101), bid(95)];
    expect(deriveDomCenter(shuffled, 0)).toBeCloseTo((99 + 101) / 2);
  });
});
