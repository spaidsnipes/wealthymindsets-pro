import { describe, it, expect } from "vitest";
import {
  canonicalAssetClass,
  canonicalInstrumentId,
  canonicalSession,
  canonicalMarketStateIdentity,
} from "./canonicalIdentity";

describe("canonicalAssetClass", () => {
  it("classifies known crypto tickers", () => {
    expect(canonicalAssetClass("BTC")).toBe("crypto");
    expect(canonicalAssetClass("eth")).toBe("crypto");
    expect(canonicalAssetClass("SOL")).toBe("crypto");
  });
  it("classifies continuous futures", () => {
    expect(canonicalAssetClass("NQ1!")).toBe("futures");
    expect(canonicalAssetClass("ES1!")).toBe("futures");
    expect(canonicalAssetClass("CL=F")).toBe("futures");
  });
  it("classifies forex pairs", () => {
    expect(canonicalAssetClass("EUR/USD")).toBe("forex");
    expect(canonicalAssetClass("GBP/JPY")).toBe("forex");
  });
  it("defaults to equity for tickers with no other marker", () => {
    expect(canonicalAssetClass("TSLA")).toBe("equity");
    expect(canonicalAssetClass("NVDA")).toBe("equity");
    expect(canonicalAssetClass("aapl")).toBe("equity");
  });
});

describe("canonicalInstrumentId", () => {
  it("uppercases equity", () => {
    expect(canonicalInstrumentId("tsla")).toBe("TSLA");
    expect(canonicalInstrumentId("nvda")).toBe("NVDA");
  });
  it("suffixes crypto with -USD", () => {
    expect(canonicalInstrumentId("BTC")).toBe("BTC-USD");
    expect(canonicalInstrumentId("eth")).toBe("ETH-USD");
  });
  it("preserves futures marker", () => {
    expect(canonicalInstrumentId("NQ1!")).toBe("NQ1!");
  });
  it("preserves forex slash", () => {
    expect(canonicalInstrumentId("eur/usd")).toBe("EUR/USD");
  });
  it("rejects empty input", () => {
    expect(() => canonicalInstrumentId("")).toThrow();
    expect(() => canonicalInstrumentId("   ")).toThrow();
  });
  it("NEVER attaches an exchange suffix — the source of the b46fa64 P0", () => {
    // Regression: prior code emitted 'TSLA:NASDAQ' at one call site and
    // 'TSLA' at another. Canonical id is exchange-agnostic.
    expect(canonicalInstrumentId("TSLA")).not.toContain(":");
    expect(canonicalInstrumentId("AAPL")).not.toContain(":");
  });
});

describe("canonicalSession", () => {
  it("returns RTH when extHours is false", () => {
    expect(canonicalSession(false)).toBe("RTH");
  });
  it("returns EXTENDED when extHours is true", () => {
    expect(canonicalSession(true)).toBe("EXTENDED");
  });
  it("NEVER emits legacy 'REGULAR' — the other half of the b46fa64 P0", () => {
    // Regression: /command-deck was reading session 'REGULAR' while the
    // publisher wrote 'RTH'. The canonical enum has no 'REGULAR' member.
    expect(canonicalSession(false)).not.toBe("REGULAR");
  });
});

describe("canonicalMarketStateIdentity — contract test", () => {
  it("writer identity matches reader identity for equity", () => {
    // Both /command-deck (reader) and chartMarketStatePublisher (writer)
    // must produce the SAME identity from the same inputs. If this test
    // ever fails, the class of P0 that b46fa64 fixed has returned.
    const reader = canonicalMarketStateIdentity({ symbol: "TSLA", timeframe: "15m", extHours: false });
    const writer = canonicalMarketStateIdentity({ symbol: "tsla", timeframe: "15M", extHours: false });
    expect(reader).toEqual(writer);
  });

  it("differs on timeframe (separate identities)", () => {
    const a = canonicalMarketStateIdentity({ symbol: "TSLA", timeframe: "15m" });
    const b = canonicalMarketStateIdentity({ symbol: "TSLA", timeframe: "1h" });
    expect(a.timeframeContext).not.toEqual(b.timeframeContext);
  });

  it("differs on session (RTH vs EXTENDED are separate identities)", () => {
    const rth = canonicalMarketStateIdentity({ symbol: "TSLA", timeframe: "15m", extHours: false });
    const ext = canonicalMarketStateIdentity({ symbol: "TSLA", timeframe: "15m", extHours: true });
    expect(rth.session).not.toBe(ext.session);
  });

  it("differs on symbol (TSLA vs NVDA are separate identities)", () => {
    const t = canonicalMarketStateIdentity({ symbol: "TSLA", timeframe: "15m" });
    const n = canonicalMarketStateIdentity({ symbol: "NVDA", timeframe: "15m" });
    expect(t.instrumentId).not.toBe(n.instrumentId);
  });

  it("crypto identity uses -USD suffix consistently", () => {
    const btc = canonicalMarketStateIdentity({ symbol: "BTC", timeframe: "1h" });
    expect(btc.instrumentId).toBe("BTC-USD");
  });

  it("timeframe normalization is idempotent (round-trip stable)", () => {
    const one = canonicalMarketStateIdentity({ symbol: "AAPL", timeframe: "5M" });
    const two = canonicalMarketStateIdentity({ symbol: "AAPL", timeframe: one.timeframeContext[0] });
    expect(one).toEqual(two);
  });
});
