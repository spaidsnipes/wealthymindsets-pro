/**
 * One live-candle loader for the surfaces that are not the chart (Founder 2026-10-12:
 * "remove anything delayed and dead"): the crypto venue, then tastytrade — never Yahoo.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { liveCandleSourceFor, liveCandleVenue } from "./liveCandles";

describe("liveCandleSourceFor — the venue the bars will come from", () => {
  it("a Coinbase product at a size Coinbase publishes is Coinbase's own candles", () => {
    expect(liveCandleVenue("BTC-USD")).toEqual({ exchange: "coinbase", coin: "BTC" });
    expect(liveCandleSourceFor("BTC-USD", "1h")).toBe("coinbase");
  });
  it("stocks and futures are tastytrade's", () => {
    for (const s of ["TSLA", "SPY", "NQ1!", "ES1!"]) expect(liveCandleSourceFor(s, "5m"), s).toBe("tastytrade");
  });
});

describe("no delayed door", () => {
  it("the loader and every surface it serves ask no Yahoo, Finnhub, Alpaca or Polygon bars", () => {
    const files = [
      "src/lib/marketData/liveCandles.ts",
      "src/components/chart/WatchlistGrid.tsx",
      "src/app/scanner/map/page.tsx",
      "src/components/journal/UnsettledEstimate.tsx",
      "src/components/experience/DeckMarketChart.tsx",
    ];
    for (const f of files) {
      const src = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      expect(src, f).not.toMatch(/fetch\(`\/api\/(yahoo|finnhub|alpaca|polygon)/);
    }
  });
});
