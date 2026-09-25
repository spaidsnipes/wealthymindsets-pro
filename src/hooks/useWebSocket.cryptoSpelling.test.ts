import { describe, expect, it } from "vitest";
import { binancePair, coinbaseProduct } from "./useWebSocket";

/**
 * One instrument, every spelling the product hands the trader, one socket.
 *
 * On 2026-09-24 the Founder's glass showed BTC-USD on "HISTORICAL BARS" with
 * no tape while BTCUSD, the same market, read "LIVE TAPE · OBSERVED". The
 * pickers and watchlist emit the hyphenated form, so the ordinary path onto
 * the chart was the deaf one.
 */
describe("crypto tape maps resolve every spelling of the instrument", () => {
  it.each([
    ["BTC", "BTC-USD", "btcusdt"],
    ["BTCUSD", "BTC-USD", "btcusdt"],
    ["BTC-USD", "BTC-USD", "btcusdt"],
    ["btc-usd", "BTC-USD", "btcusdt"],
    ["BTC/USD", "BTC-USD", "btcusdt"],
    ["BTC.COINBASE", "BTC-USD", "btcusdt"],
    ["ETH-USD", "ETH-USD", "ethusdt"],
    ["SOL-USD", "SOL-USD", "solusdt"],
  ])("%s → coinbase %s, binance %s", (symbol, product, pair) => {
    expect(coinbaseProduct(symbol)).toBe(product);
    expect(binancePair(symbol)).toBe(pair);
  });

  it.each(["AAPL", "EURUSD", "EUR/USD", "BRK.B", "NQ1!", ""])(
    "%s opens no crypto socket",
    symbol => {
      expect(coinbaseProduct(symbol)).toBeNull();
      expect(binancePair(symbol)).toBeNull();
    },
  );
});
