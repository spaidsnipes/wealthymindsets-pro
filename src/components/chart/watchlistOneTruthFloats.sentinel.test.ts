import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const HOOK = readFileSync("src/lib/broker/useTastyWatchQuotes.ts", "utf8");
const DASH = readFileSync("src/components/chart/ChartsDashboard.tsx", "utf8");
// Serving TSLA after hours, 2026-10-01: watchlist 354.12 beside chart 355.70.
describe("watchlist: one truth, floating", () => {
  it("a last trade older than the live quote yields to the midpoint", () => {
    expect(HOOK).toContain("q.quoteAt - q.tradeAt <= TRADE_STALE_BESIDE_QUOTE_MS");
  });
  it("the sheet floats at the left, clear of the price axis", () => {
    const at = DASH.indexOf('id="chart-watchlist-sheet"');
    expect(DASH.slice(at, at + 800)).toContain('placement="float"');
  });
});
