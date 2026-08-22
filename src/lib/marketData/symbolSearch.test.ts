import { describe, it, expect } from "vitest";
import { searchSymbols, type FetchJson } from "./symbolSearch";

function fetcher(map: { canon?: unknown; finnhub?: unknown; canonThrows?: boolean }): FetchJson {
  return async (url: string) => {
    if (url.includes("/api/symbol-search")) {
      if (map.canonThrows) throw new Error("network");
      return map.canon ?? null;
    }
    if (url.includes("/api/finnhub")) return map.finnhub ?? null;
    return null;
  };
}

const canonResp = {
  results: [
    { sym: "AAPL", label: "Apple Inc.", cat: "Stock", exchange: "XNAS" },
    { sym: "BTC", label: "Bitcoin", cat: "Crypto", exchange: "crypto" },
  ],
};
const finnhubResp = {
  results: [
    { sym: "TSLA", name: "Tesla Inc", type: "Common Stock", exchange: "NASDAQ" },
    { sym: "QQQ", name: "Invesco QQQ", type: "ETP", exchange: "NASDAQ" },
  ],
};

describe("searchSymbols — canonical-first with Finnhub fallback", () => {
  it("returns empty for a blank query without fetching", async () => {
    let called = false;
    const f: FetchJson = async () => { called = true; return null; };
    expect(await searchSymbols("   ", { fetchJson: f })).toEqual([]);
    expect(called).toBe(false);
  });

  it("uses the canonical route when it returns results", async () => {
    const hits = await searchSymbols("apple", { fetchJson: fetcher({ canon: canonResp }) });
    expect(hits.map((h) => h.sym)).toEqual(["AAPL", "BTC"]);
    expect(hits[0]).toEqual({ sym: "AAPL", name: "Apple Inc.", cat: "Stock", exchange: "XNAS" });
  });

  it("falls back to Finnhub when the canonical route is empty", async () => {
    const hits = await searchSymbols("tesla", { fetchJson: fetcher({ canon: { results: [] }, finnhub: finnhubResp }) });
    expect(hits.map((h) => h.sym)).toEqual(["TSLA", "QQQ"]);
  });

  it("falls back to Finnhub when the canonical route throws (key unset / provider down)", async () => {
    const hits = await searchSymbols("tesla", { fetchJson: fetcher({ canonThrows: true, finnhub: finnhubResp }) });
    expect(hits.map((h) => h.sym)).toEqual(["TSLA", "QQQ"]);
  });

  it("normalizes Finnhub category vocabulary to match the canonical set", async () => {
    const hits = await searchSymbols("q", { fetchJson: fetcher({ canon: null, finnhub: finnhubResp }) });
    expect(hits.find((h) => h.sym === "TSLA")!.cat).toBe("Stock"); // "Common Stock" -> Stock
    expect(hits.find((h) => h.sym === "QQQ")!.cat).toBe("ETF");    // "ETP" -> ETF
  });

  it("filters rows missing sym or name, and respects the limit", async () => {
    const messy = { results: [{ sym: "A", label: "" }, { sym: "", label: "x" }, { sym: "B", label: "Beta", cat: "Stock", exchange: "" }] };
    const hits = await searchSymbols("x", { fetchJson: fetcher({ canon: messy }), limit: 5 });
    expect(hits.map((h) => h.sym)).toEqual(["B"]);
  });

  it("returns empty (never throws) when both providers fail", async () => {
    const hits = await searchSymbols("zzz", { fetchJson: fetcher({}) });
    expect(hits).toEqual([]);
  });

  it("accepts Finnhub's legacy {result:[...]} shape too", async () => {
    const hits = await searchSymbols("t", { fetchJson: fetcher({ canon: null, finnhub: { result: [{ symbol: "T", description: "AT&T", type: "Common Stock" }] } }) });
    expect(hits[0]).toMatchObject({ sym: "T", name: "AT&T", cat: "Stock" });
  });
});
