import { describe, expect, it } from "vitest";
import {
  selectQuoteChange,
  quoteChangeAbsenceReason,
  type QuoteChangeAbsence,
} from "./quoteChange";

describe("quote change — 'unchanged' must be observed, never assumed", () => {
  it("withholds change when the provider gave only a price", () => {
    // Previously rendered as a green up-arrow reading "+0.00 (+0.00%)".
    expect(selectQuoteChange({ price: 431.2 }))
      .toEqual({ observed: false, absence: "NO_BASIS" });
  });

  it("withholds change when prevClose is absent", () => {
    // The old yahoo path did `prev = j?.prevClose ?? price`, forcing chg to 0.
    expect(selectQuoteChange({ price: 100, prevClose: null }))
      .toEqual({ observed: false, absence: "NO_BASIS" });
  });

  it("refuses a prevClose of zero rather than dividing by it", () => {
    expect(selectQuoteChange({ price: 100, prevClose: 0 }))
      .toEqual({ observed: false, absence: "NO_BASIS" });
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

  it("reports a real zero change as observed when the provider affirms prevClose", () => {
    // A symbol genuinely flat against its previous close is a fact worth
    // showing — it must stay distinguishable from missing data. The provider
    // affirming the field is what makes the two distinguishable at all.
    expect(selectQuoteChange({ price: 100, prevClose: 100, prevCloseObserved: true }))
      .toEqual({ observed: true, chg: 0, pct: 0 });
  });

  it("withholds an UNAFFIRMED prevClose equal to the price", () => {
    // This test previously asserted the opposite. It was rewritten, not
    // deleted, because the change is a deliberate narrowing of the contract.
    //
    // `/api/yahoo` line ~173 does `if (!prevClose || prevClose <= 0)
    // prevClose = price` and then publishes `change: 0, changePct: 0`.
    // `/api/alpaca` does the same with no flag at all. Once that substitution
    // has happened, a payload carrying `price === prevClose` and no
    // affirmation is BYTE-IDENTICAL to one from a symbol that truly did not
    // move. The information needed to tell them apart is not in the payload;
    // it was destroyed upstream.
    //
    // Given an unrecoverable ambiguity, we withhold. A withheld change renders
    // as a disclosed absence the user can act on ("—", UNRATED); a fabricated
    // flat renders as a green "+0.00 (+0.00%)" assertion that the symbol is
    // quiet. Only one of those two errors is recoverable by the reader.
    //
    // And WHICH withholding this is matters: WM may genuinely be holding a real
    // flat session here. That is not the same fact as having no basis at all,
    // and the absence name is what keeps the two apart downstream.
    expect(selectQuoteChange({ price: 100, prevClose: 100 }))
      .toEqual({ observed: false, absence: "PREV_CLOSE_EQUALS_PRICE_UNAFFIRMED" });
  });

  it("withholds when the provider disowns its own prevClose", () => {
    // `/api/yahoo` ships `ohlcObservation.prevClose: false` on exactly the
    // fallback path. That truth was computed and published for a year before
    // any consumer read it.
    expect(selectQuoteChange({ price: 110, prevClose: 100, prevCloseObserved: false }))
      .toEqual({ observed: false, absence: "PROVIDER_DISOWNED_PREV_CLOSE" });
  });

  it("stays permissive when the provider publishes no flag at all", () => {
    // /api/alpaca, /api/finnhub, cached bodies and fixtures say nothing about
    // prevClose. `undefined` must not be read as `false`, or every one of them
    // regresses to withholding everything.
    expect(selectQuoteChange({ price: 110, prevClose: 100 }))
      .toEqual({ observed: true, chg: 10, pct: 10 });
  });

  it("reports negative moves correctly", () => {
    const r = selectQuoteChange({ price: 90, prevClose: 100 });
    expect(r).toEqual({ observed: true, chg: -10, pct: -10 });
  });

  it("rejects NaN anywhere in the inputs", () => {
    // Two different NaNs, two different absences: a missing PRICE means the row
    // should not be on screen at all, while a NaN change with a usable price is
    // merely a missing basis. One `false` said neither.
    expect(selectQuoteChange({ price: Number.NaN, prevClose: 100 }))
      .toEqual({ observed: false, absence: "PRICE_NOT_OBSERVED" });
    expect(selectQuoteChange({ price: 100, change: Number.NaN, changePct: Number.NaN }))
      .toEqual({ observed: false, absence: "NO_BASIS" });
  });

  it("will not build a change chip from a percentage alone", () => {
    expect(selectQuoteChange({ price: 100, changePct: 5 }))
      .toEqual({ observed: false, absence: "NO_BASIS" });
  });
});

/**
 * × THE DEFECT: FOUR REASONS WEARING ONE `false`.
 *
 * Every branch of `selectQuoteChange` already knew why it was refusing, and all
 * of them returned the same singleton. `/scanner` then rendered the collapse as
 * a dash under a title that only restated the dash. These assertions are pinned
 * to the DISTINCTION, not to any particular wording.
 */
describe("quoteChangeAbsenceReason", () => {
  const ALL: QuoteChangeAbsence[] = [
    "PRICE_NOT_OBSERVED",
    "PROVIDER_DISOWNED_PREV_CLOSE",
    "PREV_CLOSE_EQUALS_PRICE_UNAFFIRMED",
    "NO_BASIS",
  ];

  it("gives four DIFFERENT sentences — no two absences may collapse", () => {
    const said = ALL.map(a => quoteChangeAbsenceReason(a, "NVDA"));
    expect(new Set(said).size).toBe(4);
  });

  it("every sentence names the symbol and says something a dash does not", () => {
    for (const a of ALL) {
      const s = quoteChangeAbsenceReason(a, "NVDA");
      expect(s).toContain("NVDA");
      expect(s.length).toBeGreaterThan(60);
      expect(s).not.toBe("—");
    }
  });

  it("× THE FABRICATED FLAT: no absence may claim the symbol was unchanged", () => {
    for (const a of ALL) {
      expect(quoteChangeAbsenceReason(a, "NVDA")).not.toMatch(
        /\bwas flat\b|\bis flat\b|\bunchanged\b|\+0\.00/i,
      );
    }
  });

  it("only the disowned case says waiting will not help on its own", () => {
    expect(quoteChangeAbsenceReason("PROVIDER_DISOWNED_PREV_CLOSE", "NVDA"))
      .toMatch(/waiting will not change it/i);
  });
});
