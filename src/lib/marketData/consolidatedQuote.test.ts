import { describe, it, expect } from "vitest";
import {
  resolveConsolidatedQuote,
  classifyQuoteSymbol,
  CRYPTO_SYMS,
  FUTURES_SYMS,
  type FetchJson,
} from "./consolidatedQuote";

/** Build an injectable fetcher from a url-substring → response map. Any url
 *  not matched resolves to null (as a failed fetch would). */
function fetcher(map: Record<string, unknown>): FetchJson {
  return async (url: string) => {
    if (url.includes("/api/yahoo")) return map.yahoo ?? null;
    if (url.includes("/api/alpaca")) return map.alpaca ?? null;
    if (url.includes("/api/finnhub")) return map.finnhub ?? null;
    return null;
  };
}
const observed = (price: number, prevClose: number) => ({
  price, prevClose, observation: { resolution: "RESOLVED" },
});
const unobserved = (price: number) => ({
  price, prevClose: price, observation: { resolution: "UNKNOWN" },
});

describe("classifyQuoteSymbol — one canonical classification", () => {
  it("classifies futures (explicit set + 1! heuristic)", () => {
    expect(classifyQuoteSymbol("ES1!")).toBe("futures");
    expect(classifyQuoteSymbol("VX1!")).toBe("futures");     // was only in Watchlist's set
    expect(classifyQuoteSymbol("ZN1!")).toBe("futures");     // was only in TickerTape's set
    expect(classifyQuoteSymbol("ANYTHING1!")).toBe("futures");
  });
  it("classifies crypto from the unified set", () => {
    expect(classifyQuoteSymbol("BTC")).toBe("crypto");
    expect(classifyQuoteSymbol("ATOM")).toBe("crypto");      // was only in TickerTape's set
    expect(classifyQuoteSymbol("uni")).toBe("crypto");       // case-insensitive
  });
  it("classifies everything else as equity", () => {
    expect(classifyQuoteSymbol("AAPL")).toBe("equity");
    expect(classifyQuoteSymbol("SPY")).toBe("equity");
  });
  it("the unified sets are supersets of both prior consumers", () => {
    ["ATOM", "UNI"].forEach((s) => expect(CRYPTO_SYMS.has(s)).toBe(true));
    ["VX1!", "ZN1!", "MNQ1!"].forEach((s) => expect(FUTURES_SYMS.has(s)).toBe(true));
  });
});

describe("equity ladder — Yahoo(observed) → Alpaca(source) → Finnhub", () => {
  it("takes observed Yahoo first and computes change from prevClose", async () => {
    const q = await resolveConsolidatedQuote("AAPL", { fetchJson: fetcher({ yahoo: observed(101, 100) }) });
    expect(q).toEqual({ price: 101, change: 1, changePct: 1, src: "yahoo" });
  });

  it("SKIPS unobserved Yahoo (fake-fresh) and falls to Alpaca", async () => {
    const q = await resolveConsolidatedQuote("AAPL", {
      fetchJson: fetcher({ yahoo: unobserved(100), alpaca: { price: 50, change: 2, changePct: 4, source: "alpaca" } }),
    });
    expect(q?.src).toBe("alpaca");
    expect(q?.price).toBe(50);
  });

  it("REJECTS an Alpaca equity quote that does not self-identify as source=alpaca", async () => {
    // This is the exact divergence: WatchlistPanel used to accept this; the
    // canonical resolver does not, so it falls through to Finnhub.
    const q = await resolveConsolidatedQuote("AAPL", {
      fetchJson: fetcher({
        yahoo: unobserved(100),
        alpaca: { price: 50, source: "iex" },
        finnhub: { price: 49, change: -1, changePct: -2 },
      }),
    });
    expect(q?.src).toBe("finnhub");
    expect(q?.price).toBe(49);
  });

  it("returns null when every provider fails (blank > invented)", async () => {
    const q = await resolveConsolidatedQuote("AAPL", { fetchJson: fetcher({}) });
    expect(q).toBeNull();
  });
});

describe("crypto ladder — Alpaca → Yahoo(observed)", () => {
  it("takes Alpaca first (no source gate for crypto)", async () => {
    const q = await resolveConsolidatedQuote("BTC", {
      fetchJson: fetcher({ alpaca: { price: 64000, change: 100, changePct: 0.15 } }),
    });
    expect(q).toEqual({ price: 64000, change: 100, changePct: 0.15, src: "alpaca" });
  });
  it("falls to observed Yahoo when Alpaca is empty", async () => {
    const q = await resolveConsolidatedQuote("ETH", {
      fetchJson: fetcher({ alpaca: { price: 0 }, yahoo: observed(3000, 2900) }),
    });
    expect(q?.src).toBe("yahoo");
    expect(q?.price).toBe(3000);
  });
  it("does NOT accept unobserved Yahoo for crypto either", async () => {
    const q = await resolveConsolidatedQuote("ETH", {
      fetchJson: fetcher({ alpaca: null, yahoo: unobserved(3000) }),
    });
    expect(q).toBeNull();
  });
});

describe("futures ladder — Yahoo(observed) only", () => {
  it("takes observed Yahoo", async () => {
    const q = await resolveConsolidatedQuote("ES1!", { fetchJson: fetcher({ yahoo: observed(5000, 4990) }) });
    expect(q?.src).toBe("yahoo");
    expect(q?.change).toBe(10);
  });
  it("never consults Alpaca/Finnhub for futures", async () => {
    const q = await resolveConsolidatedQuote("ES1!", {
      fetchJson: fetcher({ yahoo: unobserved(5000), alpaca: { price: 5000, source: "alpaca" }, finnhub: { price: 5000 } }),
    });
    expect(q).toBeNull(); // Yahoo unobserved → nothing, does not fall through
  });
});

describe("cross-consumer agreement (the P0 the resolver exists to fix)", () => {
  it("two independent calls for the same symbol return the identical quote", async () => {
    const f = fetcher({ yahoo: observed(250.5, 248) });
    const a = await resolveConsolidatedQuote("TSLA", { fetchJson: f });
    const b = await resolveConsolidatedQuote("TSLA", { fetchJson: f });
    expect(a).toEqual(b); // TickerTape and WatchlistPanel can no longer disagree
  });
});
