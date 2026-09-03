import { describe, expect, it } from "vitest";
import { selectQuoteChange } from "./quoteChange";

describe("quote change — 'unchanged' must be observed, never assumed", () => {
  it("withholds change when the provider gave only a price", () => {
    // Previously rendered as a green up-arrow reading "+0.00 (+0.00%)".
    expect(selectQuoteChange({ price: 431.2 })).toEqual({ observed: false });
  });

  it("withholds change when prevClose is absent", () => {
    // The old yahoo path did `prev = j?.prevClose ?? price`, forcing chg to 0.
    expect(selectQuoteChange({ price: 100, prevClose: null })).toEqual({ observed: false });
  });

  it("refuses a prevClose of zero rather than dividing by it", () => {
    expect(selectQuoteChange({ price: 100, prevClose: 0 })).toEqual({ observed: false });
  });

  it("uses provider-stated change and percentage when both are present", () => {
    expect(selectQuoteChange({ price: 100, change: 2.5, changePct: 2.56 }))
      .toEqual({ observed: true, chg: 2.5, pct: 2.56 });
  });

  it("derives the percentage when only the absolute change is given", () => {
    const r = selectQuoteChange({ price: 102, prevClose: 100, change: 2 });
    expect(r.observed).toBe(true);
    if (!r.observed) throw new Error("expected observed");
    expect(r.pct).toBeCloseTo(2, 10);
  });

  it("derives both from a genuine previous close", () => {
    const r = selectQuoteChange({ price: 110, prevClose: 100 });
    expect(r).toEqual({ observed: true, chg: 10, pct: 10 });
  });

  it("reports a real zero change as observed", () => {
    // A symbol genuinely flat against its previous close is a fact worth
    // showing — it must stay distinguishable from missing data.
    expect(selectQuoteChange({ price: 100, prevClose: 100 }))
      .toEqual({ observed: true, chg: 0, pct: 0 });
  });

  it("reports negative moves correctly", () => {
    const r = selectQuoteChange({ price: 90, prevClose: 100 });
    expect(r).toEqual({ observed: true, chg: -10, pct: -10 });
  });

  it("rejects NaN anywhere in the inputs", () => {
    expect(selectQuoteChange({ price: Number.NaN, prevClose: 100 })).toEqual({ observed: false });
    expect(selectQuoteChange({ price: 100, change: Number.NaN, changePct: Number.NaN }))
      .toEqual({ observed: false });
  });

  it("will not build a change chip from a percentage alone", () => {
    expect(selectQuoteChange({ price: 100, changePct: 5 })).toEqual({ observed: false });
  });
});
