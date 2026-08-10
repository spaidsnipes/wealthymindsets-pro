import { describe, it, expect } from "vitest";
import { priceSourceBadge } from "./priceSource";

describe("priceSourceBadge (WM-CHART-P0-05 provenance)", () => {
  it("labels real-time streams as live", () => {
    expect(priceSourceBadge("polygon", true).live).toBe(true);
    expect(priceSourceBadge("coinbase", true).live).toBe(true);
    expect(priceSourceBadge("binance", true).live).toBe(true);
    expect(priceSourceBadge("binance", false).live).toBe(true); // crypto stream is live regardless of the stock-feed flag
  });

  it("does NOT present delayed feeds as live", () => {
    expect(priceSourceBadge("finnhub", true).live).toBe(false);
    expect(priceSourceBadge("yahoo", true).live).toBe(false);
  });

  it("ties alpaca liveness to the connection state (IEX is real-time only while connected in RTH)", () => {
    expect(priceSourceBadge("alpaca", true).live).toBe(true);
    expect(priceSourceBadge("alpaca", false).live).toBe(false);
  });

  it("shows an explicit no-feed state before any source resolves", () => {
    const b = priceSourceBadge("unavailable", false);
    expect(b.label).toBe("NO FEED");
    expect(b.live).toBe(false);
  });

  it("keeps provider identity internal and renders only vendor-agnostic states", () => {
    const publicLabels = new Set(["LIVE", "DELAYED", "DELAYED 15 MIN", "NO FEED"]);
    for (const s of ["polygon", "coinbase", "binance", "alpaca", "finnhub", "yahoo", "unavailable"]) {
      const b = priceSourceBadge(s, true);
      expect(publicLabels.has(b.label)).toBe(true);
      expect(b.label.toLowerCase()).not.toContain(s);
      expect(b.title.toLowerCase()).not.toContain(s);
      expect(b.provenance).toBe(s);
      expect(b.title.length).toBeGreaterThan(0);
    }
  });
});
