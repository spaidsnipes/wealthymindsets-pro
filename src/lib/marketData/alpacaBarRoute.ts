/**
 * THE ALPACA BAR ROUTE'S TIMEFRAME TABLE — moved out of
 * src/app/api/alpaca/route.ts on 2026-09-26 (Garden 16 §26), byte-for-byte.
 *
 * Why it moved: a Next route file may only export its handlers, so the table
 * could not be imported, and the timeframe ladder's NATIVE claims were pinned
 * to it by parsing the route's source text. The ladder now has to answer PER
 * SYMBOL (ES1! never reaches Alpaca; BTC reaches it only for intervals Coinbase
 * does not publish), which means reading the table at runtime. One owner, two
 * readers: the route that serves the bars and the ladder that labels them.
 */

export const ALPACA_TF_MAP: Readonly<Record<string, { timeframe: string; daysBack: number }>> = Object.freeze({
  "1m":  { timeframe: "1Min",  daysBack: 2   },
  "2m":  { timeframe: "2Min",  daysBack: 5   },
  "3m":  { timeframe: "3Min",  daysBack: 5   },
  "5m":  { timeframe: "5Min",  daysBack: 5   },
  "10m": { timeframe: "10Min", daysBack: 10  },
  "15m": { timeframe: "15Min", daysBack: 30  },
  "30m": { timeframe: "30Min", daysBack: 60  },
  "1h":  { timeframe: "1Hour", daysBack: 90  },
  "2h":  { timeframe: "2Hour", daysBack: 120 },
  "4h":  { timeframe: "4Hour", daysBack: 180 },
  "D":   { timeframe: "1Day",  daysBack: 2000 },
  "W":   { timeframe: "1Week", daysBack: 3650 },
  // Monthly & multi-month/year period selectors → monthly candles spanning
  // years. Alpaca's largest bucket is 1Month; without these entries they fell
  // through to the "1Min" default, which is why Monthly showed minute bars.
  "M":   { timeframe: "1Month", daysBack: 5475 },   // ~15y
  "3M":  { timeframe: "1Month", daysBack: 7300 },
  "6M":  { timeframe: "1Month", daysBack: 7300 },
  "1Y":  { timeframe: "1Month", daysBack: 7300 },
  "3Y":  { timeframe: "1Month", daysBack: 7300 },
  "5Y":  { timeframe: "1Month", daysBack: 7300 },
  // WM-CHART-P0-01A: MainChart.tsx uses "1D"/"1W"/"1M" as canonical keys;
  // alpaca's map originally used the shorter "D"/"W"/"M" alone. The mismatch
  // silently sent "1M" through the ?? default (1Day/2000) — same defect
  // class as "Monthly showed minute bars". Accept both spellings.
  "1D":  { timeframe: "1Day",   daysBack: 2000 },
  "1W":  { timeframe: "1Week",  daysBack: 3650 },
  "1M":  { timeframe: "1Month", daysBack: 5475 },
});

/**
 * Alpaca crypto symbols use "BTC/USD" format. Moved with the table, unchanged:
 * the route and the ladder must agree on which pair Alpaca is asked for.
 *
 * KNOWN, NOT FIXED HERE: a quote-suffixed form such as "BTCUSD" becomes
 * "BTCUSD/USD", a pair Alpaca does not list (serving, BTCUSD 1m, 2026-09-26 —
 * see MainChart's venue note). The ladder reports that truthfully instead of
 * assuming Alpaca answered: see `alpacaCryptoPairResolves`.
 */
export function toAlpacaCryptoSymbol(sym: string): string {
  const up = sym.replace(/[/-]USD$/i, "").toUpperCase();
  return `${up}/USD`;
}
