import { describe, expect, it } from "vitest";
import { scannerLiveQuote } from "./scannerLiveQuote";

describe("scannerLiveQuote", () => {
  it("a fresh live price replaces the delayed one and re-bases the change on the row's own reference", () => {
    // delayed 102 at +2% → reference 100; live 103 → +3%
    const r = scannerLiveQuote({ price: 102, changePct: 2 }, { price: 103, at: 9_000 }, 10_000, 15_000)!;
    expect(r.price).toBe(103);
    expect(r.priceText).toBe("$103.00");
    expect(r.changePct).toBeCloseTo(3, 9);
    expect(r.changeText).toBe("+3.00%");
  });
  it("a stale or absent live price keeps the row's honest state", () => {
    expect(scannerLiveQuote({ price: 102, changePct: 2 }, { price: 103, at: 0 }, 20_000, 15_000)).toBeNull();
    expect(scannerLiveQuote({ price: 102, changePct: 2 }, undefined, 0, 15_000)).toBeNull();
  });
  it("with no reference the price speaks and the change says nothing", () => {
    const r = scannerLiveQuote({ price: null, changePct: null }, { price: 5, at: 1 }, 2, 15_000)!;
    expect(r.changePct).toBeNull();
    expect(r.changeText).toBeNull();
  });
});
