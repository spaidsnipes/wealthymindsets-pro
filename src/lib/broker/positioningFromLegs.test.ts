/**
 * The ONE receipt builder for live Derivatives Pressure — futures options and (since 2026-10-12,
 * when Cboe's delayed quotes were removed) stocks, ETFs and cash indices.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { positioningFromLegs, type Leg } from "./useTastyFuturesPositioning";

const legs: Leg[] = Array.from({ length: 10 }, (_, i) => ({ contract: `C${i}`, streamer: `.S${i}`, type: i % 2 ? "put" : "call", expiration: "2026-11-20", strike: 100 + i, multiplier: 100 }));
const q = (oi: number | null) => ({ openInterest: oi, gamma: 0.02, iv: 0.3, dayVolume: 5 });

describe("positioningFromLegs", () => {
  it("builds a live receipt from contracts that reported open interest", () => {
    const quotes = new Map(legs.map(l => [l.streamer, q(1000)]));
    const p = positioningFromLegs(legs, quotes, "AAPL", 104);
    expect(p.edge).toBeNull();
    expect(p.receipt).toMatchObject({ source: "TASTYTRADE_LIVE", spot: 104, rows: expect.any(Array) });
    expect(p.receipt!.rows).toHaveLength(10);
  });
  it("says it is still gathering while too few contracts have reported", () => {
    const quotes = new Map(legs.slice(0, 3).map(l => [l.streamer, q(1000)]));
    expect(positioningFromLegs(legs, quotes, "AAPL", 104).edge).toBe("GATHERING_OI:3/10");
  });
  it("names an all-zero open interest as the provider's figure", () => {
    const quotes = new Map(legs.map(l => [l.streamer, q(0)]));
    expect(positioningFromLegs(legs, quotes, "AAPL", 104).edge).toBe("PROVIDER_REPORTS_ZERO_OI:0/10");
  });
  it("no legs → no contracts near price", () => {
    expect(positioningFromLegs([], new Map(), "AAPL", 104).edge).toBe("NO_CONTRACTS_NEAR_PRICE");
  });
  it("the room reads stocks and indices from tastytrade, never the delayed Cboe route", () => {
    const cd = readFileSync("src/components/chart/ChartsDashboard.tsx", "utf8");
    expect(cd).toContain("useTastyEquityPositioning(symbol, equityPressureOn,");
    expect(cd).toContain("useTastyEquityPositioning(mappedIndex ?? \"\",");
    expect(cd).not.toContain("/api/market-data/cboe/options");
  });
});

import { holdPositioning, POSITIONING_RECEIPT_MIN_MS } from "./useTastyFuturesPositioning";

describe("holdPositioning — a live receipt changes at most every 2 s unless its edge changes", () => {
  const drawn = (n: number) => ({ edge: null, receipt: { rows: [n] } } as never);
  it("holds a same-edge receipt inside the window and releases after it", () => {
    const first = holdPositioning(null, drawn(1), 1_000);
    expect(holdPositioning(first, drawn(2), 1_000 + POSITIONING_RECEIPT_MIN_MS - 1)).toBe(first);
    expect(holdPositioning(first, drawn(3), 1_000 + POSITIONING_RECEIPT_MIN_MS).value).toEqual(drawn(3));
  });
  it("an edge change (loading → drawn, drawn → refused) passes through at once", () => {
    const loading = holdPositioning(null, { edge: "LOADING", receipt: null }, 1_000);
    expect(holdPositioning(loading, drawn(1), 1_001).value).toEqual(drawn(1));
    const d = holdPositioning(null, drawn(1), 1_000);
    expect(holdPositioning(d, { edge: "GATHERING_OI:1/10", receipt: null }, 1_001).value?.edge).toBe("GATHERING_OI:1/10");
  });
});
