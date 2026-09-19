import { describe, it, expect } from "vitest";
import {
  exchangeSymbolId,
  ingestExchangeCandles,
  toLegacySecondsTuple,
} from "./exchangeCandleIngress";
import {
  BAR_PROVENANCES,
  SESSION_CONTINUOUS,
  SESSION_UNKNOWN,
  isSessionKnown,
  type LegacyOhlcvTuple,
} from "./canonicalBar";
import { MARKET_FIDELITIES } from "./marketFidelityAlgebra";
import type { PublicCryptoExchange } from "./exchangeTimeframes";

const t = (over: Partial<LegacyOhlcvTuple> = {}): LegacyOhlcvTuple => ({
  time: 1_700_000_000,
  open: 100,
  high: 110,
  low: 90,
  close: 105,
  volume: 1_000,
  ...over,
});

const ingest = (
  tuples: LegacyOhlcvTuple[],
  exchange: PublicCryptoExchange = "coinbase",
  coin = "BTC",
) =>
  ingestExchangeCandles({
    exchange,
    coin,
    timeframe: "15m",
    tuples,
    receivedAt: 1_700_000_999_000,
  });

describe("exchangeCandleIngress — the artery's second production consumer", () => {
  it("mints a CanonicalBar carrying every field a tuple cannot hold", () => {
    const { bars } = ingest([t()]);
    expect(bars).toHaveLength(1);
    const bar = bars[0];
    expect(bar.symbolId).toBe("COINBASE:BTC");
    expect(bar.timeframe).toBe("15m");
    expect(bar.source).toBe("coinbase");
    expect(bar.truthEpoch).toBe(0);
    expect(bar.asOf).toBe(1_700_000_000_000);
    expect(bar.receivedAt).toBe(1_700_000_999_000);
    expect(bar.asOf).not.toBe(bar.receivedAt);
  });

  /* ── SESSION: A DIFFERENT ANSWER, NOT A BETTER GUESS ─────────────────────── */

  it("says the venue has no sessions, which is not the same as not knowing", () => {
    const { bars } = ingest([t()]);
    expect(bars[0].sessionId).toBe(SESSION_CONTINUOUS);
    expect(bars[0].sessionId).not.toBe(SESSION_UNKNOWN);
    // The distinction is load-bearing: this is a KNOWN fact about the venue.
    expect(isSessionKnown(bars[0].sessionId)).toBe(true);
  });

  it("still never claims EXECUTABLE — for a reason the session does not fix", () => {
    // admitBar would now ALLOW it (the session is known). It is withheld here
    // because no execution adapter routes through a public REST proxy.
    const { bars } = ingest([t()]);
    expect(bars[0].fidelity).toBe(MARKET_FIDELITIES.INDICATIVE);
    expect(bars[0].fidelity).not.toBe(MARKET_FIDELITIES.EXECUTABLE);
  });

  /* ── PROVENANCE ──────────────────────────────────────────────────────────── */

  it("marks every venue REST_BACKFILL — fetched, never streamed, never folded", () => {
    for (const ex of ["coinbase", "kraken", "bitstamp", "binanceus", "gemini"] as const) {
      const { bars } = ingest([t()], ex);
      expect(bars[0].provenance).toBe(BAR_PROVENANCES.REST_BACKFILL);
      expect(bars[0].provenance).not.toBe(BAR_PROVENANCES.DERIVED);
      expect(bars[0].source).toBe(ex);
    }
  });

  /* ── THE COLLISION THE VENUE PREFIX EXISTS TO PREVENT ────────────────────── */

  it("gives two venues' BTC two identities, so neither is discarded as a duplicate", () => {
    expect(exchangeSymbolId("coinbase", "btc")).toBe("COINBASE:BTC");
    expect(exchangeSymbolId("kraken", "BTC")).toBe("KRAKEN:BTC");

    // Same coin, same timeframe, same instant, two venues, two real prices.
    const cb = ingest([t({ close: 105 })], "coinbase").bars[0];
    const kr = ingest([t({ close: 106 })], "kraken").bars[0];
    expect(cb.barId).not.toBe(kr.barId);
    // Without the venue prefix these would be byte-identical ids and the
    // second bar would be refused at equal truthEpoch as a redelivery.
    expect(cb.barId).toContain("COINBASE:BTC|15m|");
    expect(kr.barId).toContain("KRAKEN:BTC|15m|");
  });

  /* ── THE FIVE-WAY NORMALISATION HAZARD ───────────────────────────────────── */

  it("refuses a bar transposed by a venue's array layout instead of drawing it", () => {
    // Coinbase is [time, low, high, open, close, volume]; Kraken is
    // [time, open, high, low, ...]. Reading one with the other's indices swaps
    // high and low, which throws nothing and renders a full inside-out chart.
    const { bars, refusals } = ingest([t({ high: 90, low: 110 })]);
    expect(bars).toHaveLength(0);
    expect(refusals).toHaveLength(1);
    expect(refusals[0].reason).toContain("inside out");
    expect(refusals[0].atSeconds).toBe(1_700_000_000);
  });

  it("refuses a wick the venue never printed rather than clamping it", () => {
    const { refusals } = ingest([t({ high: 101, close: 105 })]);
    expect(refusals[0].reason).toContain("manufacture a wick");
  });

  it("refuses a negative volume — a bar cannot un-trade", () => {
    const { bars, refusals } = ingest([t({ volume: -1 })]);
    expect(bars).toHaveLength(0);
    expect(refusals[0].reason).toContain("un-trade");
  });

  it("refuses a non-finite timestamp", () => {
    const { bars, refusals } = ingest([t({ time: Number.NaN })]);
    expect(bars).toHaveLength(0);
    expect(refusals[0].reason).toContain("not a finite number");
  });

  it("refuses the same instant delivered twice rather than double-counting it", () => {
    // Close stays inside [low, high]: geometry is checked BEFORE collision, so
    // a malformed duplicate would report the geometry reason instead.
    const { bars, refusals } = ingest([t(), t({ close: 106 })]);
    expect(bars).toHaveLength(1);
    expect(bars[0].close).toBe(105);
    expect(refusals).toHaveLength(1);
    expect(refusals[0].reason).toContain("does not supersede");
  });

  it("counts refusals rather than swallowing them — on a 24/7 venue a gap is never quiet", () => {
    const { bars, refusals } = ingest([t(), t({ time: 1_700_000_900, high: 1, low: 9 })]);
    expect(bars).toHaveLength(1);
    expect(refusals).toHaveLength(1);
    expect(refusals[0].atSeconds).toBe(1_700_000_900);
  });

  /* ── ORDER: THE VENUES DISAGREE ABOUT DIRECTION ──────────────────────────── */

  it("sorts newest-first venue output into chronological order", () => {
    // Coinbase and Gemini return newest-first; the other three do not.
    const { bars } = ingest([
      t({ time: 1_700_001_800 }),
      t({ time: 1_700_000_900 }),
      t({ time: 1_700_000_000 }),
    ]);
    expect(bars.map(b => b.asOf)).toEqual([
      1_700_000_000_000, 1_700_000_900_000, 1_700_001_800_000,
    ]);
  });

  /* ── THE UNIT TRAP ───────────────────────────────────────────────────────── */

  it("narrows back to SECONDS, the unit this route has always published", () => {
    const { bars } = ingest([t()]);
    expect(toLegacySecondsTuple(bars[0])).toEqual(t());
  });

  it("round-trips the six numbers unchanged, so the wire shape is untouched", () => {
    const input = [t({ time: 1_700_000_000 }), t({ time: 1_700_000_900, close: 109 })];
    expect(ingest(input).bars.map(toLegacySecondsTuple)).toEqual(input);
  });

  it("refuses to mint an identity for a blank coin", () => {
    const { bars, refusals } = ingestExchangeCandles({
      exchange: "coinbase",
      coin: "  ",
      timeframe: "15m",
      tuples: [t()],
      receivedAt: 1,
    });
    // Found by writing this test the honest way first. The naive
    // `${EX}:${coin}` returns "COINBASE:", which is NOT blank, so mintBarId
    // minted an identity for an instrument that does not exist — the venue
    // prefix was smuggling emptiness past the check meant to catch it.
    expect(exchangeSymbolId("coinbase", "  ")).toBe("");
    expect(bars).toHaveLength(0);
    expect(refusals[0].reason).toContain("no identity to mint");
  });

  it("refuses to mint an identity for a blank timeframe", () => {
    const { bars, refusals } = ingestExchangeCandles({
      exchange: "coinbase",
      coin: "BTC",
      timeframe: "   ",
      tuples: [t()],
      receivedAt: 1,
    });
    expect(bars).toHaveLength(0);
    expect(refusals[0].reason).toContain("no identity to mint");
  });
});
