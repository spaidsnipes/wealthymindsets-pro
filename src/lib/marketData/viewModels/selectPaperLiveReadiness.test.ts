/**
 * Paper acts only on a LIVE price (Founder 2026-10-12: "remove anything delayed and dead").
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PAPER_LIVE_QUOTE_MAX_AGE_MS, actionablePaperQuotePrice, initialPaperQuoteReadiness, selectPaperLiveReadiness } from "./selectPaperQuoteReadiness";

const NOW = 1_800_000_000_000;

describe("selectPaperLiveReadiness", () => {
  it("a fresh tastytrade price authorizes a fill and says LIVE", () => {
    const r = selectPaperLiveReadiness({ price: 25010.25, at: NOW - 1_000 }, initialPaperQuoteReadiness(), NOW);
    expect(r).toMatchObject({ status: "LIVE", actionable: true, price: 25010.25, ageMs: 1_000, label: "LIVE · tastytrade" });
    expect(actionablePaperQuotePrice(r)).toBe(25010.25);
  });
  it("a crypto venue's print is credited to the venue, not to tastytrade", () => {
    const r = selectPaperLiveReadiness({ price: 81_033.22, at: NOW - 1_000, source: "coinbase" }, initialPaperQuoteReadiness(), NOW);
    expect(r).toMatchObject({ status: "LIVE", source: "coinbase", label: "LIVE · coinbase" });
  });
  it("a price older than the live budget stays visible as STALE and authorizes nothing", () => {
    const r = selectPaperLiveReadiness({ price: 100, at: NOW - PAPER_LIVE_QUOTE_MAX_AGE_MS - 1 }, initialPaperQuoteReadiness(), NOW);
    expect(r.status).toBe("STALE");
    expect(r.price).toBe(100);
    expect(actionablePaperQuotePrice(r)).toBeNull();
  });
  it("no live price is UNKNOWN — never a fallback number", () => {
    const r = selectPaperLiveReadiness(null, initialPaperQuoteReadiness(), NOW);
    expect(r).toMatchObject({ status: "UNKNOWN", actionable: false, price: null });
  });
  it("the paper page reads the live stream, not the delayed Yahoo quote", () => {
    const page = readFileSync("src/app/paper/page.tsx", "utf8");
    expect(page).toContain("useTastyWatchQuotes(PAPER_SYMBOLS)");
    expect(page).toContain("selectPaperLiveReadiness(");
    expect(page).not.toContain("fetchYahooQuoteBody(");
    // Crypto rows (BTC, ETH) take the venue's own live prints when tastytrade has none (fixed 2026-10-12: BTC read "—").
    expect(page).toContain("useCoinbaseLivePrices(PAPER_SYMBOLS)");
  });
});
