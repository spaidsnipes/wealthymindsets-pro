import { describe, expect, it } from "vitest";

import {
  CRYPTO_QUOTE_SUBSTITUTION_VERSION,
  cryptoQuoteMayStandIn,
  judgeCryptoQuoteSubstitution,
} from "./cryptoQuoteSubstitution";

/**
 * The provider symbol in every EXACT case below is the one MEASURED on the
 * serving host on 2026-09-20: `/api/finnhub?sym=BTCUSDT&type=quote` answered
 * `price: 81608` with `providerSymbol: "BINANCE:BTCUSDT"` while the right rail
 * of /charts printed PRICE UNKNOWN for that same symbol.
 */
const BINANCE_BTC = "BINANCE:BTCUSDT";

describe("judgeCryptoQuoteSubstitution", () => {
  it("has a version, so a stale consumer cannot pass silently", () => {
    expect(CRYPTO_QUOTE_SUBSTITUTION_VERSION).toBe(
      "wm.crypto-quote-substitution.v1",
    );
  });

  it("lets the MEASURED case through — BTCUSDT asked, BTCUSDT answered", () => {
    // This is the whole point. If this one is refused, the founder's chart
    // keeps printing PRICE UNKNOWN over a price the product is serving.
    const v = judgeCryptoQuoteSubstitution("BTCUSDT", BINANCE_BTC);
    expect(v.kind).toBe("EXACT");
    expect(cryptoQuoteMayStandIn(v)).toBe(true);
  });

  it("lets a bare base through — naming no currency contradicts none", () => {
    const v = judgeCryptoQuoteSubstitution("BTC", BINANCE_BTC);
    expect(v.kind).toBe("UNNAMED");
    expect(cryptoQuoteMayStandIn(v)).toBe(true);
    // But it still reports what the venue quotes in, because the trader is
    // entitled to know the number is tether-denominated.
    expect(v).toMatchObject({ quotedIn: "USDT" });
  });

  it("REFUSES the USD→USDT substitution, and says both currencies out loud", () => {
    // USDT tracks the dollar; it is not the dollar, and the gap is exactly the
    // thing that moves when it matters.
    const v = judgeCryptoQuoteSubstitution("BTCUSD", BINANCE_BTC);
    expect(v.kind).toBe("SUBSTITUTED");
    expect(cryptoQuoteMayStandIn(v)).toBe(false);
    const reason = v.kind === "SUBSTITUTED" ? v.reason : "";
    expect(reason).toContain("USD");
    expect(reason).toContain("USDT");
    // The refusal must name the instrument it actually got, or the trader
    // cannot check the claim against the provider.
    expect(reason).toContain(BINANCE_BTC);
  });

  it("refuses the slash spelling too — notation is not a different question", () => {
    // Both spellings are offered by this product's own pickers: SymbolSearch
    // lists "BTCUSD", ChartToolbar lists "BTC/USD". A gate that catches one
    // and not the other is not a gate.
    expect(judgeCryptoQuoteSubstitution("BTC/USD", BINANCE_BTC).kind).toBe(
      "SUBSTITUTED",
    );
  });

  it("names a DIFFERENT COIN as a substitution rather than shrugging", () => {
    const v = judgeCryptoQuoteSubstitution("ETHUSDT", BINANCE_BTC);
    expect(v.kind).toBe("SUBSTITUTED");
    const reason = v.kind === "SUBSTITUTED" ? v.reason : "";
    expect(reason).toMatch(/different instrument/i);
    expect(reason).toContain("ETH");
  });

  it("does not treat SILENCE as a match — the defect would ship anyway", () => {
    // "the provider did not say" and "the provider said it matches" are
    // different facts. Defaulting the first to the second is precisely how a
    // currency substitution reaches the glass unannounced.
    for (const said of [undefined, null, "", "   ", 42, {}]) {
      const v = judgeCryptoQuoteSubstitution("BTCUSDT", said);
      expect(v.kind, `provider said ${JSON.stringify(said)}`).toBe("UNDISCLOSED");
      expect(cryptoQuoteMayStandIn(v)).toBe(false);
    }
  });

  it("refuses a provider string it cannot read as venue and pair", () => {
    const v = judgeCryptoQuoteSubstitution("BTCUSDT", "some free text");
    expect(v.kind).toBe("UNDISCLOSED");
    expect(cryptoQuoteMayStandIn(v)).toBe(false);
  });

  it("will not answer a non-crypto question it was handed by mistake", () => {
    // AAPL has no crypto base, so there is no quote currency to compare. The
    // honest output is "cannot compare", never a green light.
    const v = judgeCryptoQuoteSubstitution("AAPL", BINANCE_BTC);
    expect(v.kind).toBe("UNDISCLOSED");
    expect(cryptoQuoteMayStandIn(v)).toBe(false);
  });

  it("is case- and whitespace-insensitive on both sides", () => {
    expect(
      judgeCryptoQuoteSubstitution("  btcusdt ", " binance:btcusdt ").kind,
    ).toBe("EXACT");
  });

  it("is pure — the same two strings twice give the same verdict", () => {
    expect(judgeCryptoQuoteSubstitution("BTCUSD", BINANCE_BTC)).toEqual(
      judgeCryptoQuoteSubstitution("BTCUSD", BINANCE_BTC),
    );
  });
});

describe("the crypto quote lane actually reaches Finnhub", () => {
  it("is not structurally unreachable any more — useWebSocket asks", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(
      resolve(process.cwd(), "src/hooks/useWebSocket.ts"),
      "utf8",
    );
    // The measured defect: the crypto branch asked Coinbase and fell straight
    // past the equity block that holds the Finnhub leg. If this guard stops
    // finding the compiler in the crypto branch, BTCUSDT is back to
    // PRICE UNKNOWN over a price the product serves.
    expect(src, "the crypto quote branch no longer consults Finnhub")
      .toMatch(/judgeCryptoQuoteSubstitution\(/);
    expect(src, "the substitution verdict is judged but never enforced")
      .toMatch(/cryptoQuoteMayStandIn\(/);
  });
});
