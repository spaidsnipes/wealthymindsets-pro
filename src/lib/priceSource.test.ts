import { describe, it, expect } from "vitest";
import { candleDataStatus, priceSourceBadge } from "./priceSource";

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

describe("candleDataStatus", () => {
  it("never promotes a recently refreshed delayed feed to LIVE", () => {
    expect(candleDataStatus("yahoo", true, true, 9_999, 10_000)).toEqual({
      state: "DELAYED", label: "DELAYED", live: false,
    });
  });

  it("distinguishes fresh, stale, and unavailable live-channel evidence", () => {
    expect(candleDataStatus("coinbase", true, true, 9_999, 10_000).state).toBe("LIVE");
    expect(candleDataStatus("coinbase", true, true, 1, 30_000).state).toBe("STALE");
    expect(candleDataStatus("unavailable", false, false, 0, 10_000).state).toBe("UNAVAILABLE");
  });

  // SHIFT-H H-Bkt 1: P1 truth defect discovered by USE on /charts —
  // chart shows full historical OHLCV yet the chrome said NO FEED.
  // Contradiction. When candles are rendered, chart is DELAYED at worst.
  describe("HISTORICAL guarantee — chart with candles is never NO FEED", () => {
    it("returns DELAYED / HISTORICAL when candles exist but realtime source is unavailable", () => {
      const s = candleDataStatus("unavailable", false, true, 0, 10_000);
      expect(s.state).toBe("DELAYED");
      expect(s.label).toBe("HISTORICAL");
      expect(s.live).toBe(false);
    });
    it("still emits NO FEED when there are no candles at all", () => {
      const s = candleDataStatus("unavailable", false, false, 0, 10_000);
      expect(s.state).toBe("UNAVAILABLE");
      expect(s.label).toBe("NO FEED");
    });
    it("still emits DELAYED with the vendor-neutral badge label for delayed providers", () => {
      expect(candleDataStatus("yahoo", true, true, 9_999, 10_000).label).toBe("DELAYED");
      expect(candleDataStatus("finnhub", true, true, 9_999, 10_000).label).toBe("DELAYED 15 MIN");
    });
  });
});
