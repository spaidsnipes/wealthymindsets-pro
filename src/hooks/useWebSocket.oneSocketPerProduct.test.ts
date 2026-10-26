import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { coinbaseTapeKey } from "./useWebSocket";

/**
 * PERF P0 2026-10-25: the tape hub was keyed by the caller's spelling, so a chart on `BTC` and a
 * watchlist / ticker strip spelling it `BTC-USD` opened two sockets for one product. Every spelling of
 * a listed product now shares one hub.
 */
describe("one Coinbase socket per product", () => {
  it("every spelling of a listed product names the same hub", () => {
    const k = coinbaseTapeKey("BTC");
    expect(k).toBe("coinbase:BTC-USD");
    for (const s of ["BTC-USD", "btc", "BTCUSD", "BTC/USD"]) expect(coinbaseTapeKey(s)).toBe(k);
    expect(coinbaseTapeKey("ETH-USD")).toBe(coinbaseTapeKey("ETH"));
    expect(coinbaseTapeKey("ETH")).not.toBe(k);
  });
  it("both joiners use the product key", () => {
    const src = readFileSync(join(__dirname, "useWebSocket.ts"), "utf8");
    expect(src.match(/joinTape\(\s*coinbaseTapeKey\(/g)?.length).toBe(2);
    expect(src).not.toContain("`coinbase:${symbol.toUpperCase()}`");
    expect(src).not.toContain("`coinbase:${sym}`");
  });
});
