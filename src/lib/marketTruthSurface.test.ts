import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(__dirname, path), "utf8");

describe("same-screen market truth contract", () => {
  it("keeps consolidated stock quotes ahead of IEX-only fallbacks", () => {
    const watchlist = source("../components/chart/WatchlistPanel.tsx");
    const tickerTape = source("../components/layout/TickerTape.tsx");

    const watchlistStockPolicy = watchlist.slice(watchlist.indexOf("Stocks/ETFs use the same"));
    const tickerStockPolicy = tickerTape.slice(tickerTape.indexOf("Stocks/ETFs use the same"));
    expect(watchlistStockPolicy.indexOf("/api/yahoo")).toBeLessThan(watchlistStockPolicy.indexOf("/api/alpaca"));
    expect(tickerStockPolicy.indexOf("/api/yahoo")).toBeLessThan(tickerStockPolicy.indexOf("/api/alpaca"));
  });

  it("keys the DOM by instrument so old and new books cannot share state", () => {
    const dashboard = source("../components/chart/ChartsDashboard.tsx");
    expect(dashboard).toContain('<DOMPanel key={symbol} symbol={symbol} />');
  });
});
