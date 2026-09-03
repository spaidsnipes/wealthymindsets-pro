import { describe, it, expect } from "vitest";
import {
  canonicalAssetClass,
  canonicalInstrumentId,
  canonicalSession,
  canonicalMarketStateIdentity,
  selectCanonicalFuturesSessionTruth,
  selectCanonicalSessionPresentation,
  US_CASH_SESSION_UNKNOWN_LABEL,
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

describe("selectCanonicalFuturesSessionTruth", () => {
  const base = {
    instrumentId: "NQ1!",
    assetClass: "futures" as const,
    requestedFilter: "RTH" as const,
    observedActivityAt: 1_000,
    evaluatedAt: 2_000,
  };

  it("keeps observed Sunday-style activity separate from session identity", () => {
    expect(selectCanonicalFuturesSessionTruth(base)).toMatchObject({
      resolution: "UNKNOWN",
      session: null,
      activity: "OBSERVED",
      label: "FUTURES ACTIVITY OBSERVED",
      requestedFilter: "RTH",
    });
  });

  it("does not let absent, invalid, or future observation time prove activity", () => {
    for (const observedActivityAt of [null, Number.NaN, -1, 3_000]) {
      expect(selectCanonicalFuturesSessionTruth({ ...base, observedActivityAt }).activity).toBe("UNKNOWN");
    }
  });

  it("resolves only a matching, sourced, versioned, effective calendar fact", () => {
    expect(selectCanonicalFuturesSessionTruth({
      ...base,
      authoritativeCalendarFact: {
        instrumentId: "NQ1!",
        session: "OVERNIGHT",
        source: "calendar-authority",
        version: "2026.08",
        effectiveFrom: 1_500,
        effectiveTo: 2_500,
      },
    })).toMatchObject({ resolution: "RESOLVED", session: "OVERNIGHT", activity: "OBSERVED" });
  });

  it("fails closed on mismatched, unversioned, or expired facts", () => {
    const fact = {
      instrumentId: "NQ1!",
      session: "OVERNIGHT" as const,
      source: "calendar-authority",
      version: "2026.08",
      effectiveFrom: 1_500,
      effectiveTo: 2_500,
    };
    expect(selectCanonicalFuturesSessionTruth({ ...base, authoritativeCalendarFact: { ...fact, instrumentId: "ES1!" } }).resolution).toBe("UNKNOWN");
    expect(selectCanonicalFuturesSessionTruth({ ...base, authoritativeCalendarFact: { ...fact, version: "" } }).resolution).toBe("UNKNOWN");
    expect(selectCanonicalFuturesSessionTruth({ ...base, authoritativeCalendarFact: { ...fact, effectiveTo: 1_999 } }).resolution).toBe("UNKNOWN");
  });

  it("fails closed when evaluation time is not finite", () => {
    const truth = selectCanonicalFuturesSessionTruth({
      ...base,
      evaluatedAt: Number.NaN,
      authoritativeCalendarFact: {
        instrumentId: "NQ1!",
        session: "OVERNIGHT",
        source: "calendar-authority",
        version: "2026.08",
        effectiveFrom: 1_500,
        effectiveTo: 2_500,
      },
    });

    expect(truth.resolution).toBe("UNKNOWN");
    expect(truth.session).toBeNull();
    expect(truth.reasons).toContain("Evaluation time is invalid.");
  });

  it("does not let a requested EXTENDED filter become session truth", () => {
    const truth = selectCanonicalFuturesSessionTruth({ ...base, requestedFilter: "EXTENDED" });
    expect(truth).toMatchObject({ resolution: "UNKNOWN", session: null, requestedFilter: "EXTENDED" });
  });

  it("keeps the cash-session footer fail-closed", () => {
    expect(US_CASH_SESSION_UNKNOWN_LABEL).toBe("US CASH SESSION · STATUS UNKNOWN");
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
    const writer = canonicalMarketStateIdentity({ symbol: "tsla", timeframe: "15m", extHours: false });
    expect(reader).toEqual(writer);
  });

  it("timeframe normalization preserves canonical daily/weekly/monthly casing", () => {
    // The app's TFId registry uses 'D', 'W', 'M' uppercase for periods above
    // 4h. If canonicalMarketStateIdentity naively lowercased '1D' → '1d' it
    // would produce a store key that no other publisher/reader recognizes —
    // the exact drift class this module exists to prevent.
    const daily = canonicalMarketStateIdentity({ symbol: "SPY", timeframe: "1D" });
    expect(daily.timeframeContext).toEqual(["1D"]);
    const weekly = canonicalMarketStateIdentity({ symbol: "SPY", timeframe: "1W" });
    expect(weekly.timeframeContext).toEqual(["1W"]);
  });

  it("legacy timeframe aliases normalize to canonical (60m → 1h, 1d → 1D)", () => {
    const legacy60m = canonicalMarketStateIdentity({ symbol: "SPY", timeframe: "60m" });
    expect(legacy60m.timeframeContext).toEqual(["1h"]);
    const legacy1d = canonicalMarketStateIdentity({ symbol: "SPY", timeframe: "1d" });
    expect(legacy1d.timeframeContext).toEqual(["1D"]);
  });

  it("unknown timeframe throws — never silently substitutes", () => {
    // Founder Aug-16 IV: 'Do not silently substitute a different timeframe.'
    expect(() =>
      canonicalMarketStateIdentity({ symbol: "SPY", timeframe: "banana" }),
    ).toThrow(/unknown timeframe/);
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
    const one = canonicalMarketStateIdentity({ symbol: "AAPL", timeframe: "5m" });
    const two = canonicalMarketStateIdentity({ symbol: "AAPL", timeframe: one.timeframeContext[0] });
    expect(one).toEqual(two);
  });

  /* Real from-USE defect (2026-09-03): /command-deck rendered
   * "session RTH · connected" for BTCUSD. RTH = US Regular Trading Hours,
   * an equity concept with no meaning for a 24/7 crypto instrument. */
  describe("continuous-market session truth", () => {
    it("classifies crypto as 24X7 regardless of the extHours toggle", () => {
      expect(canonicalSession(false, "crypto")).toBe("24X7");
      expect(canonicalSession(true, "crypto")).toBe("24X7");
    });

    it("leaves equity/futures session mapping unchanged", () => {
      expect(canonicalSession(false, "equity")).toBe("RTH");
      expect(canonicalSession(true, "equity")).toBe("EXTENDED");
      expect(canonicalSession(false)).toBe("RTH");
      expect(canonicalSession(true)).toBe("EXTENDED");
    });

    it("never labels a crypto instrument RTH or EXTENDED in the presenter", () => {
      const p = selectCanonicalSessionPresentation({
        symbol: "BTC",
        requestedSession: "RTH",
        connected: true,
        dayOfWeek: 3,
        observedActivityAt: null,
        evaluatedAt: 1_788_000_000_000,
      });
      expect(p.value).toBe("24X7");
      expect(p.value).not.toBe("RTH");
      expect(p.detail).toContain("continuous market");
    });

    it("never claims a crypto market is closed on a weekend", () => {
      for (const dayOfWeek of [0, 6]) {
        const p = selectCanonicalSessionPresentation({
          symbol: "ETH",
          requestedSession: "RTH",
          connected: true,
          dayOfWeek,
          observedActivityAt: null,
          evaluatedAt: 1_788_000_000_000,
        });
        expect(p.value).toBe("24X7");
        expect(p.detail).not.toContain("market closed");
      }
    });

    it("still reports an honest disconnection for a continuous market", () => {
      const p = selectCanonicalSessionPresentation({
        symbol: "BTC",
        requestedSession: "EXTENDED",
        connected: false,
        dayOfWeek: 2,
        observedActivityAt: null,
        evaluatedAt: 1_788_000_000_000,
      });
      expect(p.value).toBe("24X7");
      expect(p.detail).toContain("no data connection");
    });

    it("equities still report market closed on a weekend", () => {
      const p = selectCanonicalSessionPresentation({
        symbol: "AAPL",
        requestedSession: "RTH",
        connected: true,
        dayOfWeek: 0,
        observedActivityAt: null,
        evaluatedAt: 1_788_000_000_000,
      });
      expect(p.detail).toBe("market closed");
    });
  });
});
