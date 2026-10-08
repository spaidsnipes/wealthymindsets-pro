/**
 * traderSourceWords — the data source in a trader's words (G19 sheriff ruling,
 * 2026-10-08): Inspect said "Source · tastytrade", "tastytrade futures
 * options", "coinbase". Trader-facing text names the KIND of source; the
 * vendor's name stays in the machine receipt (and the line's title).
 * PURE.
 */
export function traderSourceWords(source: string | null | undefined): string {
  if (!source || !source.trim()) return "not named by its owner";
  const s = source.toLowerCase();
  const options = /option|chain|\boi\b/.test(s) ? " · options chain" : "";
  if (/tastytrade|webull|alpaca|schwab|ibkr|interactive brokers|tradovate|oanda|moomoo|robinhood/.test(s)) return `broker feed${options}`;
  if (/coinbase|kraken|binance|bybit|okx|cme|cboe|nasdaq|nyse|exchange/.test(s)) return `exchange data${options}`;
  if (/yahoo|finnhub|fmp|polygon|alpha ?vantage|twelve ?data/.test(s)) return `market-data vendor${options}`;
  if (/bar|candle|tape|chart/.test(s)) return `this chart's ${s.includes("tape") ? "tape" : "bars"}`;
  return `named feed${options}`;
}

/** A signed whole-number reading that never prints "−0" or "+0". */
export function signedWhole(v: number, unit = ""): string {
  const r = Math.round(Number.isFinite(v) ? v : 0);
  const body = Math.abs(r).toLocaleString("en-US");
  const out = r > 0 ? `+${body}` : r < 0 ? `−${body}` : "0";
  return unit ? `${out} ${unit}` : out;
}
