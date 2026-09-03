import { describe, expect, it } from "vitest";
import {
  MODEL_SPREAD_FLOOR,
  longOptionUnrealised,
  modelBand,
} from "./optionModelBand";

describe("model band", () => {
  it("brackets the mid symmetrically", () => {
    const b = modelBand(2)!;
    expect(b.ask).toBeCloseTo(2.06, 10);
    expect(b.bid).toBeCloseTo(1.94, 10);
    expect(b.mid).toBe(2);
  });

  it("applies the floor to small premiums", () => {
    const b = modelBand(0.10)!;
    // 3% of 0.10 is 0.003, below the floor.
    expect(b.ask).toBeCloseTo(0.10 + MODEL_SPREAD_FLOOR, 10);
  });

  it("never produces a negative bid", () => {
    const b = modelBand(0.01)!;
    expect(b.bid).toBe(0);
  });

  it("refuses a non-finite or negative premium instead of pricing off NaN", () => {
    expect(modelBand(Number.NaN)).toBeNull();
    expect(modelBand(Number.POSITIVE_INFINITY)).toBeNull();
    expect(modelBand(-1)).toBeNull();
  });
});

/**
 * The defect this encodes: entry was recorded at the ASK and a close paid the
 * BID, but the open position's unrealised P&L was computed from the MID. Every
 * open long therefore displayed a better number than closing it could produce.
 */
describe("long option unrealised P&L marks to the bid", () => {
  it("is strictly worse than a mid-based mark", () => {
    const mid = 2.5, entry = 2.575, qty = 1, mult = 100;
    const bidBased = longOptionUnrealised(mid, entry, qty, mult)!;
    const midBased = (mid - entry) * qty * mult;
    expect(bidBased).toBeLessThan(midBased);
  });

  it("shows a flat trade as the round-trip cost, not break-even", () => {
    // Buy at the ask and mark immediately: the trader is down the full band.
    const mid = 2;
    const entry = modelBand(mid)!.ask;
    const pnl = longOptionUnrealised(mid, entry, 1, 100)!;
    expect(pnl).toBeCloseTo((modelBand(mid)!.bid - entry) * 100, 8);
    expect(pnl).toBeLessThan(0);
  });

  it("scales with quantity and multiplier", () => {
    const one = longOptionUnrealised(3, 3, 1, 100)!;
    const five = longOptionUnrealised(3, 3, 5, 100)!;
    expect(five).toBeCloseTo(one * 5, 8);
  });

  it("returns null rather than a number it cannot justify", () => {
    expect(longOptionUnrealised(Number.NaN, 1, 1, 100)).toBeNull();
    expect(longOptionUnrealised(1, Number.NaN, 1, 100)).toBeNull();
  });
});
