/**
 * exchanges — truth-lock for crypto exchange symbol convention.
 *
 * Format: <COIN>.<EXCHANGE>  e.g. "BTC.COINBASE", "ETH.BITSTAMP".
 * Plain "BTC" (no suffix) = default crypto (Coinbase WS).
 *
 * Silent drift here silently misroutes crypto symbols across the 5
 * supported exchanges (Coinbase, Kraken, Bitstamp, Binance.US, Gemini).
 */

import { describe, it, expect } from "vitest";
import {
  parseExchangeSymbol,
  isExchangeSymbol,
  exchangeSymbolLabel,
  EXCHANGES,
  EXCHANGE_LABEL,
} from "./exchanges";

describe("EXCHANGES constant", () => {
  it("contains all 5 canonical exchanges in declared order", () => {
    expect(EXCHANGES).toEqual(["coinbase", "kraken", "bitstamp", "binanceus", "gemini"]);
  });
});

describe("EXCHANGE_LABEL", () => {
  it("labels are display-canonical (Binance.US not BINANCEUS)", () => {
    expect(EXCHANGE_LABEL.coinbase).toBe("Coinbase");
    expect(EXCHANGE_LABEL.binanceus).toBe("Binance.US");
    expect(EXCHANGE_LABEL.kraken).toBe("Kraken");
    expect(EXCHANGE_LABEL.bitstamp).toBe("Bitstamp");
    expect(EXCHANGE_LABEL.gemini).toBe("Gemini");
  });
});

describe("parseExchangeSymbol", () => {
  it("parses all 5 exchanges from suffix", () => {
    expect(parseExchangeSymbol("BTC.COINBASE")).toEqual({ coin: "BTC", exchange: "coinbase" });
    expect(parseExchangeSymbol("ETH.KRAKEN")).toEqual({ coin: "ETH", exchange: "kraken" });
    expect(parseExchangeSymbol("XRP.BITSTAMP")).toEqual({ coin: "XRP", exchange: "bitstamp" });
    expect(parseExchangeSymbol("SOL.BINANCEUS")).toEqual({ coin: "SOL", exchange: "binanceus" });
    expect(parseExchangeSymbol("DOGE.GEMINI")).toEqual({ coin: "DOGE", exchange: "gemini" });
  });

  it("uppercases the input before matching (case-insensitive)", () => {
    expect(parseExchangeSymbol("btc.coinbase")).toEqual({ coin: "BTC", exchange: "coinbase" });
    expect(parseExchangeSymbol("Eth.Kraken")).toEqual({ coin: "ETH", exchange: "kraken" });
  });

  it("returns null for plain symbols without an exchange suffix", () => {
    expect(parseExchangeSymbol("BTC")).toBeNull();
    expect(parseExchangeSymbol("ETH")).toBeNull();
    expect(parseExchangeSymbol("TSLA")).toBeNull();
  });

  it("returns null for unknown exchange suffixes", () => {
    expect(parseExchangeSymbol("BTC.BINANCE")).toBeNull();   // must be BINANCEUS
    expect(parseExchangeSymbol("BTC.FTX")).toBeNull();
    expect(parseExchangeSymbol("BTC.")).toBeNull();
  });

  it("returns null when coin length is outside 2-6 chars", () => {
    expect(parseExchangeSymbol("A.COINBASE")).toBeNull();       // 1 char
    expect(parseExchangeSymbol("TOOLONG7.COINBASE")).toBeNull(); // 7 chars
  });

  it("rejects digits or special chars in coin portion", () => {
    expect(parseExchangeSymbol("BTC1.COINBASE")).toBeNull();
    expect(parseExchangeSymbol("BT-C.COINBASE")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseExchangeSymbol("")).toBeNull();
  });
});

describe("isExchangeSymbol", () => {
  it("true for exchange-suffixed symbols", () => {
    expect(isExchangeSymbol("BTC.COINBASE")).toBe(true);
    expect(isExchangeSymbol("eth.kraken")).toBe(true);
  });
  it("false for plain symbols + unknown suffixes", () => {
    expect(isExchangeSymbol("BTC")).toBe(false);
    expect(isExchangeSymbol("TSLA")).toBe(false);
    expect(isExchangeSymbol("BTC.FTX")).toBe(false);
    expect(isExchangeSymbol("")).toBe(false);
  });
});

describe("exchangeSymbolLabel", () => {
  it("formats as 'COIN · Exchange' when suffixed", () => {
    expect(exchangeSymbolLabel("BTC.COINBASE")).toBe("BTC · Coinbase");
    expect(exchangeSymbolLabel("SOL.BINANCEUS")).toBe("SOL · Binance.US");
    expect(exchangeSymbolLabel("eth.kraken")).toBe("ETH · Kraken");
  });
  it("returns the input verbatim when not an exchange symbol", () => {
    expect(exchangeSymbolLabel("BTC")).toBe("BTC");
    expect(exchangeSymbolLabel("TSLA")).toBe("TSLA");
    expect(exchangeSymbolLabel("garbage")).toBe("garbage");
  });
});
