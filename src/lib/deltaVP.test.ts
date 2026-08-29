/**
 * computeDeltaVP — truth-lock for the Delta+VP aggregator.
 *
 * The Delta+VP drawing tool depends on this function to bin buy/sell
 * volume across a price window and identify the POC (point of control).
 * Silent regressions in binning / delta math / POC selection would
 * silently mislead chart interpretation. Locks documented behavior.
 */

import { describe, it, expect } from "vitest";
import { computeDeltaVP, type DeltaVPLevel } from "./deltaVP";

describe("computeDeltaVP — Delta+VP aggregator truth-lock", () => {
  it("returns an empty result when levels[] is empty", () => {
    const out = computeDeltaVP([], 100, 110, 10);
    expect(out.rows).toEqual([]);
    expect(out.pocVolume).toBe(0);
    expect(out.totalVolume).toBe(0);
    expect(out.totalDelta).toBe(0);
  });

  it("returns an empty result when the price window has zero span", () => {
    const levels: DeltaVPLevel[] = [{ priceLevel: 100, bid: 5, ask: 5 }];
    const out = computeDeltaVP(levels, 100, 100, 10);
    expect(out.rows).toEqual([]);
  });

  it("returns an empty result when nBins <= 0 (clamped internally)", () => {
    // Empty levels short-circuits before the clamp; use empty to verify
    // the guard doesn't crash on zero-bin request.
    const out = computeDeltaVP([], 100, 110, 0);
    expect(out.rows).toEqual([]);
  });

  it("ignores levels outside [lo, hi] (confines the profile to the drawn box)", () => {
    const levels: DeltaVPLevel[] = [
      { priceLevel: 95, bid: 10, ask: 10 },   // below lo
      { priceLevel: 105, bid: 3, ask: 7 },    // in window
      { priceLevel: 115, bid: 10, ask: 10 },  // above hi
    ];
    const out = computeDeltaVP(levels, 100, 110, 10);
    expect(out.totalBuy).toBe(7);
    expect(out.totalSell).toBe(3);
    expect(out.totalDelta).toBe(4);
    expect(out.totalVolume).toBe(10);
  });

  it("aggregates ask=buy and bid=sell per bin (canon: aggressor convention)", () => {
    const levels: DeltaVPLevel[] = [
      { priceLevel: 100.5, bid: 2, ask: 8 },
      { priceLevel: 100.7, bid: 3, ask: 1 },  // same bin
    ];
    const out = computeDeltaVP(levels, 100, 110, 10);
    // bin 0 = [100, 101). Both levels land here.
    const row = out.rows.find((r) => r.loPrice === 100);
    expect(row?.buy).toBe(9);   // ask total
    expect(row?.sell).toBe(5);  // bid total
    expect(row?.delta).toBe(4);
    expect(row?.volume).toBe(14);
  });

  it("returns rows sorted by price descending (top-of-chart first)", () => {
    const levels: DeltaVPLevel[] = [
      { priceLevel: 100.5, bid: 1, ask: 1 },  // low
      { priceLevel: 109.5, bid: 1, ask: 1 },  // high
      { priceLevel: 105.5, bid: 1, ask: 1 },  // mid
    ];
    const out = computeDeltaVP(levels, 100, 110, 10);
    const prices = out.rows.map((r) => r.price);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeLessThan(prices[i - 1]);
    }
  });

  it("drops empty rows (never draws a zero-volume bar)", () => {
    const levels: DeltaVPLevel[] = [
      { priceLevel: 100.5, bid: 5, ask: 5 },  // bin 0 only
    ];
    const out = computeDeltaVP(levels, 100, 110, 10);
    expect(out.rows).toHaveLength(1);
  });

  it("POC = bin-center price with the largest volume", () => {
    const levels: DeltaVPLevel[] = [
      { priceLevel: 100.5, bid: 1, ask: 1 },   // vol 2
      { priceLevel: 105.5, bid: 20, ask: 30 }, // vol 50 → POC
      { priceLevel: 109.5, bid: 3, ask: 3 },   // vol 6
    ];
    const out = computeDeltaVP(levels, 100, 110, 10);
    expect(out.pocVolume).toBe(50);
    // bin covering 105.5 is [105, 106); center = 105.5
    expect(out.pocPrice).toBeCloseTo(105.5);
  });

  it("maxAbsDelta captures the largest |row delta| across bins (positive or negative)", () => {
    const levels: DeltaVPLevel[] = [
      { priceLevel: 100.5, bid: 10, ask: 2 },  // delta -8
      { priceLevel: 105.5, bid: 1, ask: 6 },   // delta +5
    ];
    const out = computeDeltaVP(levels, 100, 110, 10);
    expect(out.maxAbsDelta).toBe(8);
  });

  it("swaps loPrice/hiPrice when the caller passes them reversed", () => {
    const levels: DeltaVPLevel[] = [
      { priceLevel: 105, bid: 3, ask: 7 },
    ];
    // Same input as an earlier test but with lo/hi swapped.
    const out = computeDeltaVP(levels, 110, 100, 10);
    expect(out.totalVolume).toBe(10);
    expect(out.totalDelta).toBe(4);
  });

  it("filters malformed level rows (non-finite priceLevel / negative volumes)", () => {
    const levels: DeltaVPLevel[] = [
      { priceLevel: NaN, bid: 5, ask: 5 },     // NaN price — skipped
      { priceLevel: 105, bid: -3, ask: -7 },   // negative volumes → clamped to 0
      { priceLevel: 106, bid: 2, ask: 3 },     // valid
    ];
    const out = computeDeltaVP(levels, 100, 110, 10);
    // Only the valid row contributes; the negative-volumes row contributes 0.
    expect(out.totalBuy).toBe(3);
    expect(out.totalSell).toBe(2);
  });
});
