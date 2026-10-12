import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(__dirname, path), "utf8");

describe("same-screen market truth contract", () => {
  it("no surface asks a delayed stock quote (2026-10-12); Alpaca IEX is the only polled stock fallback", () => {
    const watchlist = source("../components/chart/WatchlistPanel.tsx");
    const tickerTape = source("../components/layout/TickerTape.tsx");
    const hook = source("../hooks/useWebSocket.ts");
    for (const f of [watchlist, tickerTape, hook]) {
      expect(f).not.toContain("fetchYahooQuoteBody(");
      expect(f).toContain("fetchAlpacaQuoteBody(");
    }
  });

  it("never routes crypto display quotes through the Alpaca equity fallback", () => {
    const hook = source("../hooks/useWebSocket.ts");
    const watchlist = source("../components/chart/WatchlistPanel.tsx");
    const tickerTape = source("../components/layout/TickerTape.tsx");

    const hookCrypto = hook.slice(hook.indexOf("Crypto display quotes"), hook.indexOf("Stocks & ETFs"));
    const watchlistCrypto = watchlist.slice(watchlist.indexOf("Crypto → the venue's own public quote"), watchlist.indexOf("Stocks/ETFs: Alpaca's IEX quote"));
    const tickerCrypto = tickerTape.slice(tickerTape.indexOf("Crypto → the venue's own public quote"), tickerTape.indexOf("Stocks/ETFs: Alpaca's IEX quote"));
    for (const slice of [watchlistCrypto, tickerCrypto]) expect(slice.length).toBeGreaterThan(40);
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

  it("the Alpaca relay is gone — nothing elects it (removed 2026-10-12, host answered 404)", () => {
    const hook = source("../hooks/useWebSocket.ts");
    expect(hook).not.toContain("alpacaRelayCleanup");
    expect(hook).not.toContain("aplacawsproxy");
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
    // "Am I on the instrument view?" is the same decision as "where is the
    // instrument view" — so the predicate derives too. It read
    // `pathname === "/charts"` in six places in this one file.
    expect(tickerTape).toContain("pathname === INSTRUMENT_VIEW_ROUTE ? chartPulseSymbols");
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
    // Since 2026-10-12 the session facts are the exchange's own (tastytrade Summary), admitted only
    // when open, high, low AND prior close were all said — never derived from the current price.
    expect(stockInfo).toContain("const o = liveQ?.dayOpen, h = liveQ?.dayHigh, l = liveQ?.dayLow, pc = liveQ?.prevClose;");
    expect(stockInfo).toMatch(/if \(o != null && o > 0 && h != null && h > 0 && l != null && l > 0 && pc != null && pc > 0\)/);
    // This line used to be pinned to the EXACT BYTES of
    //   `const open  = realOHLC ? realOHLC.open.toFixed(dp)      : "—"`
    // including its interior spacing. That pinned a SPELLING, not the
    // invariant — and the spelling contained a defect of its own (the `"—"`
    // branch could not tell "no quote" from "quote without the field", and the
    // sibling Turnover row was a hardcoded glyph for a figure WM never
    // computes). The invariant this test actually owns is: OPEN IS GATED ON AN
    // OBSERVED QUOTE AND IS NEVER DERIVED FROM THE CURRENT PRICE. That is now
    // asserted against the owner call, which cannot manufacture — see
    // src/lib/chart/stockInfoSessionFacts.ts and its own Sentinel.
    expect(stockInfo).toMatch(/const open\s*=\s*priceSessionFact\(realOHLC\?\.open,/);
    expect(stockInfo).toContain("const observedQuote = realOHLC !== null");
    expect(stockInfo).not.toMatch(/const open\s*=[^\n]*ticker\.price/);
    expect(stockInfo).not.toContain("ticker.price * 0.9986");
    expect(stockInfo).not.toContain("ticker.price * 1.0012");
    expect(stockInfo).not.toContain("Jun 15 16:00:00 ET");
    expect(yahooRoute).toContain("ohlcObservation");
  });
});
