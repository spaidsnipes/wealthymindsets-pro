import { describe, it, expect } from "vitest";
import { priceSourceBadge } from "./priceSource";

describe("priceSourceBadge (WM-CHART-P0-05 provenance)", () => {
  it("labels real-time streams as live", () => {
    expect(priceSourceBadge("polygon", true).live).toBe(true);
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

  it("names the provider so divergent surfaces are explainable, never blank", () => {
    for (const s of ["polygon", "binance", "alpaca", "finnhub", "yahoo", "unavailable"]) {
      const b = priceSourceBadge(s, true);
      expect(b.label.length).toBeGreaterThan(0);
      expect(b.title.length).toBeGreaterThan(0);
    }
  });
});
