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
    // Both surfaces now ask the shared Yahoo round owner instead of building
    // the URL, so the Yahoo leg is located by the ASK. Anchoring on the URL
    // still "found" a match here — a stray mention in a comment ~40k
    // characters downstream — and so reported Yahoo as running AFTER Alpaca.
    // The ORDER of the two providers is the invariant; the transport is not.
    //
    // 2026-09-08: that repair was applied to the YAHOO half only. When Alpaca
    // got the same treatment, `indexOf("/api/alpaca")` went to -1 and the rule
    // failed asserting `249 < -1` — it had been comparing a real position
    // against "not found" and would have passed for the wrong reason if the
    // ordering ever inverted. Both ends are now located by the ASK, and both
    // are asserted PRESENT before their order is compared, so an absent leg
    // fails loudly instead of arithmetically.
    const askedAt = (policy: string, owner: string, url: string) => {
      const at = policy.indexOf(owner);
      return at === -1 ? policy.indexOf(url) : at;
    };
    for (const policy of [watchlistStockPolicy, tickerStockPolicy]) {
      const yahoo = askedAt(policy, "fetchYahooQuoteBody(", "/api/yahoo");
      const alpaca = askedAt(policy, "fetchAlpacaQuoteBody(", "/api/alpaca");
      expect(yahoo).toBeGreaterThan(-1);
      expect(alpaca).toBeGreaterThan(-1);
      expect(yahoo).toBeLessThan(alpaca);
    }
  });

  it("never routes crypto display quotes through the Alpaca equity fallback", () => {
    const hook = source("../hooks/useWebSocket.ts");
    const watchlist = source("../components/chart/WatchlistPanel.tsx");
    const tickerTape = source("../components/layout/TickerTape.tsx");

    const hookCrypto = hook.slice(hook.indexOf("Crypto display quotes"), hook.indexOf("Stocks & ETFs"));
    const watchlistCrypto = watchlist.slice(watchlist.indexOf("Crypto → public Coinbase"), watchlist.indexOf("Futures → Yahoo only"));
    const tickerCrypto = tickerTape.slice(tickerTape.indexOf("Crypto → public Coinbase"), tickerTape.indexOf("Stocks/ETFs use the same"));
    for (const policy of [hookCrypto, watchlistCrypto, tickerCrypto]) {
      // RE-ANCHORED 2026-09-08 on the ASK, not the URL — the same repair made
      // to the Yahoo ordering rule above. The invariant is WHICH PROVIDER is
      // asked; the transport moved into exchangeQuoteRounds.ts and the literal
      // URL now lives in exactly one file, as it should.
      expect(
        policy.includes("fetchExchangeQuoteBody(\"coinbase\"") ||
          policy.includes("/api/exchange?ex=coinbase"),
      ).toBe(true);
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
    // The invariant is that the fetch is SCOPED to the bounded requested set —
    // on /charts that is the 4-symbol pulse, never a full catalogue. The
    // fetcher's NAME is not the contract: it was `fetchPolygonPrices` back when
    // Polygon was the source, and the Polygon key was removed in WM-SEC-P0-05.
    expect(tickerTape).toMatch(/\bfetch\w*\(requestedTapeSymbols\)/);
  });

  it("does not manufacture Stock Info session facts from a current quote", () => {
    const stockInfo = source("../components/chart/StockInfoPanel.tsx");
    const yahooRoute = source("../app/api/yahoo/route.ts");
    expect(stockInfo).toContain("observed?.open");
    expect(stockInfo).toContain('const open  = realOHLC ? realOHLC.open.toFixed(dp)      : "—"');
    expect(stockInfo).not.toContain("ticker.price * 0.9986");
    expect(stockInfo).not.toContain("ticker.price * 1.0012");
    expect(stockInfo).not.toContain("Jun 15 16:00:00 ET");
    expect(yahooRoute).toContain("ohlcObservation");
  });
});
