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

  it("never routes crypto display quotes through the Alpaca equity fallback", () => {
    const hook = source("../hooks/useWebSocket.ts");
    const watchlist = source("../components/chart/WatchlistPanel.tsx");
    const tickerTape = source("../components/layout/TickerTape.tsx");

    const hookCrypto = hook.slice(hook.indexOf("Crypto display quotes"), hook.indexOf("Stocks & ETFs"));
    const watchlistCrypto = watchlist.slice(watchlist.indexOf("Crypto → public Coinbase"), watchlist.indexOf("Futures → Yahoo only"));
    const tickerCrypto = tickerTape.slice(tickerTape.indexOf("Crypto → public Coinbase"), tickerTape.indexOf("Stocks/ETFs use the same"));
    for (const policy of [hookCrypto, watchlistCrypto, tickerCrypto]) {
      expect(policy).toContain("/api/exchange?ex=coinbase");
      expect(policy).not.toContain("/api/alpaca");
    }
  });

  it("does not elect the Alpaca relay from transport-open alone", () => {
    const hook = source("../hooks/useWebSocket.ts");
    const relay = hook.slice(hook.indexOf("const alpacaRelayCleanup"), hook.indexOf("if (alpacaRelayCleanup)"));
    expect(relay).toContain('tapeSourceRef.current = "alpaca"');
    expect(relay).toContain('tapeSource: "alpaca"');
    expect(relay).toContain("Socket readiness is transport truth only");
    expect(relay).not.toContain("if (ok)");
  });

  it("keys the DOM by instrument and does not paint quotes as market depth", () => {
    const dashboard = source("../components/chart/ChartsDashboard.tsx");
    const dom = source("../components/chart/DOMPanel.tsx");
    expect(dashboard).toContain('<DOMPanel key={symbol} symbol={symbol} onClose={() => setVpDomOpen(false)} />');
    expect(dom).toContain("No observed market depth");
    expect(dom).not.toContain("Level 2 not connected");
    expect(dom).toContain("Quotes and trades are not displayed as depth.");
    expect(dom).toContain('aria-label="Close market depth panel"');
    expect(dom).toContain('href="/readiness"');
  });

  it("keeps Charts focused by replacing the duplicated scrolling tape with a bounded market pulse", () => {
    const tickerTape = source("../components/layout/TickerTape.tsx");
    expect(tickerTape).toContain("const chartPulseSymbols");
    expect(tickerTape).toContain(".slice(0, 4)");
    expect(tickerTape).toContain('pathname === "/charts" ? chartPulseSymbols');
    expect(tickerTape).toContain('{ animation: "none" }');
    expect(tickerTape).toContain("fetchPolygonPrices(requestedTapeSymbols)");
  });
});
