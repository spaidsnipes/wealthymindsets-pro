import { describe, expect, it } from "vitest";

import { cheapForAReason, shortlistJobWords } from "./expressionShortlist";

describe("shortlist words — fits and tradeoffs, never 'best'", () => {
  it("every job names what it buys and what it costs, without a superlative of merit", () => {
    for (const job of ["FAST", "BALANCED", "MORE_TIME"] as const) {
      const w = shortlistJobWords(job);
      expect(w.fits.length).toBeGreaterThan(20);
      expect(w.tradeoff.length).toBeGreaterThan(20);
      expect(`${w.fits} ${w.tradeoff}`).not.toMatch(/\b(best|winner|safe|guaranteed)\b/i);
    }
  });

  it("cheap for a reason: low delta, wide spread, little time — only from observed fields", () => {
    expect(cheapForAReason({ delta: 0.12, bid: 0.4, ask: 0.6, hoursToExpiry: 20 })).toHaveLength(3);
    expect(cheapForAReason({ delta: -0.5, bid: 5.0, ask: 5.2, hoursToExpiry: 200 })).toEqual([]);
    expect(cheapForAReason({ delta: null, bid: null, ask: null, hoursToExpiry: null })).toEqual([]);
  });
});
