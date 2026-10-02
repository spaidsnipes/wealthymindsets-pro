import { describe, expect, it } from "vitest";
import { headlineNames, newsTermsFor } from "./newsTermsFor";

describe("the News door finds headlines by the instrument's names (2026-10-02)", () => {
  it("TSLA finds Tesla; the ticker counts only as a whole word", () => {
    const t = newsTermsFor("TSLA");
    expect(headlineNames(t, "Tesla deliveries beat estimates", "", [])).toBe(true);
    expect(headlineNames(t, "$TSLA rips premarket", "", [])).toBe(true);
    expect(headlineNames(t, "Apple supplier update", "", [])).toBe(false);
  });
  it("futures and coins use their market words", () => {
    expect(headlineNames(newsTermsFor("NQ1!"), "Nasdaq futures slip after PCE", "", [])).toBe(true);
    expect(headlineNames(newsTermsFor("BTC-USD"), "Bitcoin ETF flows hit record", "", [])).toBe(true);
    expect(headlineNames(newsTermsFor("CL1!"), "Oil jumps on supply fears", "", [])).toBe(true);
    // A short futures ticker never matches inside a word.
    expect(headlineNames(newsTermsFor("ES1!"), "Fed rates decision looms", "", [])).toBe(false);
  });
});
