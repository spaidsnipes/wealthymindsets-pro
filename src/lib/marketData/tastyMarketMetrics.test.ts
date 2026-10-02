import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { metricsSymbolFor, readMarketMetrics } from "./tastyMarketMetrics";

describe("tastytrade market metrics on Market Info (2026-10-01)", () => {
  it("asks for stocks by ticker, futures by product root, nothing for coins or pairs", () => {
    expect(metricsSymbolFor("TSLA")).toBe("TSLA");
    expect(metricsSymbolFor("ES1!")).toBe("/ES");
    expect(metricsSymbolFor("BTC-USD")).toBeNull();
    expect(metricsSymbolFor("EURUSD")).toBeNull();
  });
  it("prints tastytrade's numbers and leaves out zero placeholders", () => {
    // Shapes captured from the serving route, 2026-10-01.
    const tsla = readMarketMetrics({ "implied-volatility-index": "0.485176881", "implied-volatility-index-rank": "0.216488153", beta: "1.839516294", "market-cap": 1469666080781, "price-earnings-ratio": "372.4266", earnings: { "expected-report-date": "2026-10-28", estimated: false }, "historical-volatility-30-day": "39.84", "liquidity-rating": 4, "listed-market": "XNAS" });
    const by = Object.fromEntries(tsla.map(r => [r.label, r.value]));
    expect(by["Implied volatility (IVx)"]).toBe("48.5%");
    expect(by["IV rank"]).toBe("21.6%");
    expect(by["Market cap"]).toBe("$1.47T");
    expect(by["Next earnings"]).toBe("2026-10-28");
    expect(by["Options liquidity"]).toBe("●●●●○");
    const es = readMarketMetrics({ "implied-volatility-index": "0.159865163", "market-cap": 0, "price-earnings-ratio": "0.0", "earnings-per-share": "0.0" });
    expect(es.map(r => r.label)).toEqual(["Implied volatility (IVx)"]);
  });
  it("the fundamentals panel shows the card and keeps host secrets out of guest copy", () => {
    const d = readFileSync("src/components/chart/ChartsDashboard.tsx", "utf8");
    expect(d).toContain('{tab === "Profile" || tab === "Valuation" ? <MarketMetricsCard symbol={symbol} /> : null}');
    expect(d).not.toContain("Set it in Cloudflare Worker environment variables");
    expect(d).toContain('if (!map || (ac !== "equity" && ac !== "etf"))');
  });
});
