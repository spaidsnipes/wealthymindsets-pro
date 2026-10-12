/**
 * Crypto has no exchange session: the stock info panel shows the venue's own rolling-24h range
 * (Coinbase /stats via /api/exchange), labelled 24h, with no prior close and no floor pivots
 * (2026-10-12 — before, these came from a delayed vendor's day bar).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SIP = readFileSync("src/components/chart/StockInfoPanel.tsx", "utf8");
const ROUTE = readFileSync("src/app/api/exchange/route.ts", "utf8");

describe("stock info on a crypto symbol", () => {
  it("reads Coinbase's rolling 24h range, never a session close", () => {
    expect(SIP).toContain('fetchExchangeQuoteBody("coinbase", up)');
    expect(SIP).toContain("prevClose: null, volume: r.volume ?? null, rolling: true");
    expect(SIP).toContain('rolling ? "24h High" : "High"');
  });
  it("shows no floor pivots without a prior close", () => {
    expect(SIP).toContain("{realOHLC && realOHLC.prevClose != null && (");
  });
  it("the exchange route carries Coinbase's own /stats high, low and volume", () => {
    expect(ROUTE).toContain("rolling24h: { high: strictProviderNumber(s?.high), low: strictProviderNumber(s?.low), volume: strictProviderNumber(s?.volume) }");
  });
});
