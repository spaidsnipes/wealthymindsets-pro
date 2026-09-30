import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fromYahooSearchSymbol } from "./yahooSymbol";
import { matchCuratedSymbols } from "./marketData/curatedSymbolCatalog";

describe("every market is searchable (Founder, 2026-09-28)", () => {
  it("search hits are named the way WM opens them", () => {
    expect(fromYahooSearchSymbol("GC=F", "FUTURE")).toBe("GC1!");
    expect(fromYahooSearchSymbol("SI=F", "FUTURE")).toBe("SI1!");
    expect(fromYahooSearchSymbol("ZW=F", "FUTURE")).toBe("ZW1!");
    expect(fromYahooSearchSymbol("KE=F", "FUTURE")).toBe("KE=F");
    expect(fromYahooSearchSymbol("^GSPC", "INDEX")).toBe("SPX");
    expect(fromYahooSearchSymbol("^N225", "INDEX")).toBe("^N225");
    expect(fromYahooSearchSymbol("EURUSD=X", "CURRENCY")).toBe("EURUSD");
    // 2026-09-29: Yahoo's three-letter form is quoted against the dollar — one instrument, one name.
    expect(fromYahooSearchSymbol("JPY=X", "CURRENCY")).toBe("USDJPY");
    expect(fromYahooSearchSymbol("MXN=X", "CURRENCY")).toBe("USDMXN");
    expect(fromYahooSearchSymbol("SOL-USD", "CRYPTOCURRENCY")).toBe("SOL-USD");
    expect(fromYahooSearchSymbol("PHO", "ETF")).toBe("PHO");
  });
  it("forms the chart cannot open are never offered", () => {
    expect(fromYahooSearchSymbol("KEOZ26.NYB", "FUTURE")).toBeNull();
    expect(fromYahooSearchSymbol("M6EH27.CME", "FUTURE")).toBeNull();
    expect(fromYahooSearchSymbol("18QQ.Z", "INDEX")).toBeNull();
  });
  it("the palette searches every asset class, filters by category, and never blanks on a failed answer", () => {
    const P = readFileSync("src/components/layout/shellPanels.tsx", "utf8");
    expect(P).toContain("useInstrumentSearch(query)");
    const owner = readFileSync("src/lib/marketData/instrumentSearch.ts", "utf8");
    expect(owner).toContain("/api/symbol-search?q=");
    expect(P).not.toContain("/api/finnhub?q=");
    expect(P).toContain('const SEARCH_CATEGORIES = ["All", "Stock", "ETF", "Index", "Futures", "Forex", "Crypto"] as const;');
    // Failed discovery retains the honest built-in list, with an explicit note.
    expect(P).toContain("Live search unavailable");
    const R = readFileSync("src/app/api/symbol-search/route.ts", "utf8");
    expect(R).toContain("const sym = fromYahooSearchSymbol(r.symbol, r.quoteType);");
  });
  it("spot metals are not silently aliased to a different futures market", () => {
    const gold = matchCuratedSymbols("spot gold", 5).map(s => s.sym);
    expect(gold).not.toContain("GC1!");
    expect(matchCuratedSymbols("gold", 5)[0]?.sym).toBe("GC1!");
    expect(gold).not.toContain("XAUUSD");
    expect(matchCuratedSymbols("platinum", 5).map(s => s.sym)).toContain("PL1!");
  });
  it("grains and treasury words reach their futures (serving search, 2026-09-30)", () => {
    expect(matchCuratedSymbols("corn", 3).map(s => s.sym)[0]).toBe("ZC1!");
    expect(matchCuratedSymbols("wheat", 3).map(s => s.sym)[0]).toBe("ZW1!");
    expect(matchCuratedSymbols("soybeans", 3).map(s => s.sym)[0]).toBe("ZS1!");
    expect(matchCuratedSymbols("10 year", 3).map(s => s.sym)[0]).toBe("ZN1!");
    expect(fromYahooSearchSymbol("ZC=F", "FUTURE")).toBe("ZC1!");
    expect(matchCuratedSymbols("dax", 3).map(s => s.sym)[0]).toBe("^GDAXI");
    expect(matchCuratedSymbols("nikkei", 3).map(s => s.sym)[0]).toBe("^N225");
  });
});
