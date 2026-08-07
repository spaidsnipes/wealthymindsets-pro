import { describe, expect, it } from "vitest";
import {
  SCANNER_RSI_SYMBOLS, compareScannerRsiIdentity, parseScannerRsiIdentity,
  scannerRsiIdentity, scannerRsiIdentityDomToken, scannerRsiIdentityKey,
  serializeScannerRsiIdentity,
} from "./scannerRequestIdentity";

const raw = (symbol: unknown, extra: Record<string, unknown> = {}) => ({
  symbol, timeframe: "D", bars: 40, indicator: "rsi14", version: "scanner-rsi-v1", ...extra,
});

describe("Scanner RSI request identity", () => {
  it("normalizes and serializes in the frozen field order", () => {
    const identity = parseScannerRsiIdentity(raw("  aapl  "))!;
    expect(identity.symbol).toBe("AAPL");
    expect(serializeScannerRsiIdentity(identity)).toBe("version=scanner-rsi-v1&indicator=rsi14&symbol=AAPL&timeframe=D&bars=40");
    expect(scannerRsiIdentityKey(identity)).toBe(serializeScannerRsiIdentity(identity));
  });

  it("accepts exactly the 30-symbol frozen universe", () => {
    expect(SCANNER_RSI_SYMBOLS).toHaveLength(30);
    for (const symbol of SCANNER_RSI_SYMBOLS) expect(parseScannerRsiIdentity(raw(symbol))?.symbol).toBe(symbol);
    expect(scannerRsiIdentity("NQ1!").symbol).toBe("NQ1!");
    expect(scannerRsiIdentity("ES1!").symbol).toBe("ES1!");
  });

  it.each([
    raw(""), raw("A APL"), raw("ÅAPL"), raw("IBM"), raw("BRK.B"),
    { ...raw("AAPL"), timeframe: "15m" }, { ...raw("AAPL"), bars: 41 },
    { ...raw("AAPL"), indicator: "rsi" }, { ...raw("AAPL"), version: "scanner-rsi-v2" },
    raw("AAPL", { provider: "yahoo" }), raw("AAPL", { accountId: "secret" }),
  ])("rejects an invalid, dynamic, or expanded identity", value => {
    expect(parseScannerRsiIdentity(value)).toBeNull();
  });

  it("provides stable ordering and collision-free UTF-8 hexadecimal DOM tokens", () => {
    const aapl = scannerRsiIdentity("AAPL");
    const tsla = scannerRsiIdentity("TSLA");
    expect(compareScannerRsiIdentity(aapl, tsla)).toBeLessThan(0);
    expect(scannerRsiIdentityDomToken(aapl)).toMatch(/^[0-9a-f]+$/);
    expect(scannerRsiIdentityDomToken(aapl)).not.toBe(scannerRsiIdentityDomToken(tsla));
    expect(new Set(SCANNER_RSI_SYMBOLS.map(s => scannerRsiIdentityDomToken(scannerRsiIdentity(s)))).size).toBe(30);
  });

  it("contains no credential, account, user, session, range, or provider fields", () => {
    expect(Object.keys(scannerRsiIdentity("AAPL")).sort()).toEqual(["bars", "indicator", "symbol", "timeframe", "version"]);
  });
});
