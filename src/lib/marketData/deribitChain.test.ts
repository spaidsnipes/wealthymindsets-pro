import { describe, expect, it } from "vitest";
import { deribitStrikesNear, normalizeDeribitChain } from "./deribitChain";

// Row shape captured from Deribit's public get_book_summary_by_currency, 2026-10-01.
const row = (name: string, o: Record<string, unknown> = {}) => ({
  instrument_name: name, bid_price: 0.0035, ask_price: 0.0038, mark_price: 0.00368984,
  open_interest: 480.2, mark_iv: 35.13, underlying_price: 85271.29,
  estimated_delivery_price: 85187.02, creation_timestamp: 1790911536247, ...o,
});
const NOW = Date.parse("2026-10-02T03:00:00Z");

describe("Deribit chain, view only", () => {
  it("groups by expiry and strike, prices in USD from the row's own forward", () => {
    const c = normalizeDeribitChain({ result: [
      row("BTC-9OCT26-81000-P"), row("BTC-9OCT26-81000-C", { bid_price: 0.05, ask_price: null }),
      row("BTC-9OCT26-90000-C"), row("BTC-30OCT26-85000-C", { underlying_price: 85500 }),
      row("ETH-9OCT26-3000-C"), row("garbage"),
    ] }, "BTC", NOW);
    expect(c.index).toBe(85187.02);
    expect(c.asOf).toBe(new Date(1790911536247).toISOString());
    expect(c.expiries.map(e => e.expiration)).toEqual(["2026-10-09", "2026-10-30"]);
    const e = c.expiries[0];
    expect(e.forward).toBe(85271.29);
    expect(e.strikes.map(s => s.strike)).toEqual([81000, 90000]);
    expect(e.strikes[0].put?.bidUsd).toBe(Math.round(0.0035 * 85271.29 * 100) / 100);
    expect(e.strikes[0].call?.bidUsd).toBe(Math.round(0.05 * 85271.29 * 100) / 100);
    expect(e.strikes[0].call?.askUsd).toBeNull();
    expect(e.strikes[0].put?.iv).toBeCloseTo(0.3513, 6);
    expect(e.strikes[1].put).toBeNull();
    expect(e.dte).toBeGreaterThan(7);
  });
  it("drops expired contracts and picks strikes around the forward", () => {
    const c = normalizeDeribitChain({ result: [row("BTC-1OCT26-80000-C"), ...[70000, 80000, 85000, 86000, 90000, 100000].map(k => row(`BTC-9OCT26-${k}-C`))] }, "BTC", NOW);
    expect(c.expiries.length).toBe(1);
    expect(deribitStrikesNear(c.expiries[0], 1).map(s => s.strike)).toEqual([85000, 86000]);
  });
});
