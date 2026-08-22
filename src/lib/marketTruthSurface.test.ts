import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(__dirname, path), "utf8");

describe("same-screen market truth contract", () => {
  it("both same-screen quote consumers delegate to the ONE canonical resolver", () => {
    // Stronger than the previous source-text ordering proxy: the watchlist and
    // ticker must not each re-implement the quote ladder (that let them diverge
    // — different gates, different symbol sets). They must route through the one
    // consolidatedQuote resolver, whose ladder/gates are unit-tested. If neither
    // UI re-implements the ladder, they cannot disagree on the same screen.
    const watchlist = source("../components/chart/WatchlistPanel.tsx");
    const tickerTape = source("../components/layout/TickerTape.tsx");

    for (const [name, src] of [["WatchlistPanel", watchlist], ["TickerTape", tickerTape]] as const) {
      expect(src, `${name} must delegate to resolveConsolidatedQuote`).toContain("resolveConsolidatedQuote");
      // No inline provider QUOTE fetch may remain (symbol-search is separate).
      expect(src, `${name} must not re-fetch /api/alpaca quotes inline`).not.toMatch(/\/api\/alpaca\?[^`'"]*type=quote/);
      expect(src, `${name} must not re-fetch /api/yahoo quotes inline`).not.toMatch(/\/api\/yahoo\?[^`'"]*type=quote/);
    }

    // And the canonical resolver keeps consolidated Yahoo ahead of the
    // IEX-only Alpaca fallback for equities.
    const resolver = source("./marketData/consolidatedQuote.ts");
    const equityPath = resolver.slice(resolver.indexOf("// equity"));
    expect(equityPath.indexOf("fromYahoo")).toBeLessThan(equityPath.indexOf("fromAlpaca"));
  });

  it("keys the DOM by instrument so old and new books cannot share state", () => {
    const dashboard = source("../components/chart/ChartsDashboard.tsx");
    expect(dashboard).toContain('<DOMPanel key={symbol} symbol={symbol} />');
  });
});
