import { describe, it, expect } from "vitest";
import { candleDataStatus, priceSourceBadge, resolveChartSurfaceBadge } from "./priceSource";
import {
  CANONICAL_FIDELITY_LABELS as L,
  ALL_CANONICAL_FIDELITY_LABELS,
} from "./marketData/canonicalFidelityLabels";

/**
 * Labels updated 2026-08-28 SHIFT-P: priceSource emits canonical
 * Living Market Visual Systems vocabulary (2026-08-27 canon). Legacy
 * "NO FEED" / "DELAYED 15 MIN" / "HISTORICAL" strings are quarantined;
 * every test here asserts on the canon-approved labels.
 */

/**
 * Founder-observed defect, 2026-09-05 (Saturday, screenshot of /charts):
 * the ticker rail and every watchlist row read "ACTIVE DEGRADED" while the
 * US market was closed. `priceSourceBadge` switched on provider alone, so the
 * word ACTIVE was asserted on a closed session — the §8 class "may never say
 * LIVE on a closed session". BTC read "LIVE — CERTIFIED QUOTE" correctly on
 * the same screen, which is what made the contradiction visible.
 */
describe("priceSourceBadge — closed session dominates the provider verdict", () => {
  it("retires the false ACTIVE DEGRADED claim when the session is proven closed", () => {
    for (const src of ["yahoo", "finnhub"] as const) {
      expect(priceSourceBadge(src, true).label).toBe(L.ACTIVE_DEGRADED); // the defect, unguarded
      const closed = priceSourceBadge(src, true, false);
      expect(closed.label).toBe(L.SESSION_CLOSED_LAST_VERIFIED);
      expect(closed.live).toBe(false);
      expect(closed.title).not.toMatch(/delayed/i); // closed is not delayed
    }
  });

  it("outranks every non-continuous provider verdict, including live ones", () => {
    expect(priceSourceBadge("polygon", true, false).label).toBe(L.SESSION_CLOSED_LAST_VERIFIED);
    expect(priceSourceBadge("polygon", true, false).live).toBe(false);
    expect(priceSourceBadge("alpaca", true, false).label).toBe(L.SESSION_CLOSED_LAST_VERIFIED);
    expect(priceSourceBadge("unavailable", false, false).label).toBe(L.SESSION_CLOSED_LAST_VERIFIED);
  });

  it("never prints SESSION CLOSED over a continuous crypto tape (mirror-image bug)", () => {
    for (const src of ["binance", "coinbase"] as const) {
      const b = priceSourceBadge(src, true, false);
      expect(b.label).toBe(L.LIVE_CERTIFIED_QUOTE);
      expect(b.live).toBe(true);
    }
  });

  it("treats an unestablished session as no information — never rounds it into a claim", () => {
    for (const unknown of [undefined, null] as const) {
      expect(priceSourceBadge("yahoo", true, unknown).label).toBe(L.ACTIVE_DEGRADED);
      expect(priceSourceBadge("polygon", true, unknown).label).toBe(L.LIVE_CERTIFIED_QUOTE);
      expect(priceSourceBadge("unavailable", false, unknown).unresolved).toBe(true);
    }
    // sessionOpen === true is not a promotion either: a delayed provider stays degraded.
    expect(priceSourceBadge("yahoo", true, true).label).toBe(L.ACTIVE_DEGRADED);
  });

  it("keeps the closed verdict intact through the chart-surface guard", () => {
    // resolveChartSurfaceBadge promotes unresolved+candles to HISTORICAL BARS
    // VERIFIED. Closed must not be downgraded into it — canon ranks closed higher.
    const b = resolveChartSurfaceBadge("unavailable", false, true);
    expect(b.label).toBe(L.HISTORICAL_BARS_VERIFIED);
    expect(priceSourceBadge("unavailable", false, false).unresolved).toBe(false);
  });
});

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

  it("emits STALE_PIPELINE + unresolved=true before any source resolves", () => {
    const b = priceSourceBadge("unavailable", false);
    expect(b.label).toBe(L.STALE_PIPELINE);
    expect(b.live).toBe(false);
    expect(b.unresolved).toBe(true);
  });

  it("resolved providers never carry unresolved=true", () => {
    for (const s of ["polygon", "coinbase", "binance", "alpaca", "finnhub", "yahoo"]) {
      expect(priceSourceBadge(s, true).unresolved).toBe(false);
    }
  });

  it("every emitted label is one of the seven canon-approved strings", () => {
    for (const s of ["polygon", "coinbase", "binance", "alpaca", "finnhub", "yahoo", "unavailable"]) {
      const b = priceSourceBadge(s, true);
      expect(ALL_CANONICAL_FIDELITY_LABELS as readonly string[]).toContain(b.label);
      expect(b.label.toLowerCase()).not.toContain(s);
      expect(b.title.toLowerCase()).not.toContain(s);
      expect(b.provenance).toBe(s);
      expect(b.title.length).toBeGreaterThan(0);
    }
  });
});

describe("candleDataStatus", () => {
  it("never promotes a recently refreshed delayed feed to LIVE", () => {
    // Monday Test 2: a delayed consolidated quote with no proven entitlement
    // edge is ACTIVE_DEGRADED, never DELAYED_BY_ENTITLEMENT.
    expect(candleDataStatus("yahoo", true, true, 9_999, 10_000)).toEqual({
      state: "DELAYED", label: L.ACTIVE_DEGRADED, live: false,
    });
  });

  it("distinguishes fresh, stale, and unavailable live-channel evidence", () => {
    expect(candleDataStatus("coinbase", true, true, 9_999, 10_000).state).toBe("LIVE");
    expect(candleDataStatus("coinbase", true, true, 1, 30_000).state).toBe("STALE");
    expect(candleDataStatus("unavailable", false, false, 0, 10_000).state).toBe("UNAVAILABLE");
  });

  // SHIFT-H H-Bkt 1 → SHIFT-P canon: chart with candles is never mis-
  // labeled as absent. The canon label is HISTORICAL_BARS_VERIFIED.
  describe("HISTORICAL guarantee — chart with candles renders as bars-verified", () => {
    it("returns DELAYED / HISTORICAL_BARS_VERIFIED when candles exist but realtime source is unavailable", () => {
      const s = candleDataStatus("unavailable", false, true, 0, 10_000);
      expect(s.state).toBe("DELAYED");
      expect(s.label).toBe(L.HISTORICAL_BARS_VERIFIED);
      expect(s.live).toBe(false);
    });
    it("emits SESSION_CLOSED_LAST_VERIFIED when there are no candles at all (canon: closed is not delayed)", () => {
      const s = candleDataStatus("unavailable", false, false, 0, 10_000);
      expect(s.state).toBe("UNAVAILABLE");
      expect(s.label).toBe(L.SESSION_CLOSED_LAST_VERIFIED);
    });
    it("passes through the honest degraded label for delayed providers (no unproven entitlement claim)", () => {
      expect(candleDataStatus("yahoo", true, true, 9_999, 10_000).label).toBe(L.ACTIVE_DEGRADED);
      expect(candleDataStatus("finnhub", true, true, 9_999, 10_000).label).toBe(L.ACTIVE_DEGRADED);
    });
  });

  // Orkin §22 state-matrix — every realistic reachable branch of
  // candleDataStatus, now speaking the canon vocabulary.
  describe("state matrix — every realistic reachable branch", () => {
    it("polygon connected + candles + fresh tick → LIVE", () => {
      const s = candleDataStatus("polygon", true, true, 9_999, 10_000);
      expect(s).toEqual({ state: "LIVE", label: L.LIVE_CERTIFIED_QUOTE, live: true });
    });
    it("polygon connected + no candles → UNAVAILABLE / SESSION_CLOSED_LAST_VERIFIED", () => {
      const s = candleDataStatus("polygon", true, false, 0, 10_000);
      expect(s.state).toBe("UNAVAILABLE");
      expect(s.label).toBe(L.SESSION_CLOSED_LAST_VERIFIED);
    });
    it("alpaca connected + candles + fresh tick → LIVE (equity IEX-only path)", () => {
      const s = candleDataStatus("alpaca", true, true, 9_999, 10_000);
      expect(s.state).toBe("LIVE");
    });
    it("alpaca DISCONNECTED + candles → DELAYED / STALE_PIPELINE (reconnecting)", () => {
      const s = candleDataStatus("alpaca", false, true, 9_999, 10_000);
      expect(s.state).toBe("DELAYED");
      expect(s.label).toBe(L.STALE_PIPELINE);
    });
    it("binance connected=false + candles + fresh tick → LIVE (crypto stream is live regardless)", () => {
      const s = candleDataStatus("binance", false, true, 9_999, 10_000);
      expect(s.state).toBe("LIVE");
    });
    it("coinbase live source + candles + no tick ever (lastTickAt=0) → STALE / STALE_PIPELINE", () => {
      const s = candleDataStatus("coinbase", true, true, 0, 10_000);
      expect(s.state).toBe("STALE");
      expect(s.label).toBe(L.STALE_PIPELINE);
    });
    it("yahoo delayed + candles → DELAYED regardless of connected flag", () => {
      expect(candleDataStatus("yahoo", true, true, 9_999, 10_000).state).toBe("DELAYED");
      expect(candleDataStatus("yahoo", false, true, 9_999, 10_000).state).toBe("DELAYED");
    });
    it("finnhub delayed + candles → ACTIVE_DEGRADED (no provider-proven entitlement edge)", () => {
      expect(candleDataStatus("finnhub", true, true, 9_999, 10_000).label).toBe(L.ACTIVE_DEGRADED);
    });
    it("unknown source string + candles → HISTORICAL_BARS_VERIFIED (unresolved → bars-only truth)", () => {
      const s = candleDataStatus("some-future-provider-not-in-switch", true, true, 0, 10_000);
      expect(s.state).toBe("DELAYED");
      expect(s.label).toBe(L.HISTORICAL_BARS_VERIFIED);
    });
    it("unknown source string + no candles → SESSION_CLOSED_LAST_VERIFIED", () => {
      const s = candleDataStatus("mystery", false, false, 0, 10_000);
      expect(s.state).toBe("UNAVAILABLE");
      expect(s.label).toBe(L.SESSION_CLOSED_LAST_VERIFIED);
    });
    it("live=false paths never claim live=true (rejection guarantee)", () => {
      for (const s of ["yahoo", "finnhub", "unknown"] as const) {
        expect(candleDataStatus(s, true, true, 9_999, 10_000).live).toBe(false);
      }
    });
    it("staleAfterMs boundary — exactly at the threshold is STALE, one ms before is LIVE", () => {
      expect(candleDataStatus("coinbase", true, true, 0, 20_000).state).toBe("STALE");
      expect(candleDataStatus("coinbase", true, true, 1, 20_000).state).toBe("LIVE");
    });
  });

  // H-Bkt 8 nest closure — pure helper protects future chart-chrome pills.
  describe("resolveChartSurfaceBadge — H-Bkt 1/8 truth guard as reusable helper", () => {
    it("promotes unresolved to HISTORICAL_BARS_VERIFIED when candles are on-screen", () => {
      const b = resolveChartSurfaceBadge("unavailable", false, true);
      expect(b.label).toBe(L.HISTORICAL_BARS_VERIFIED);
      expect(b.live).toBe(false);
      expect(b.title.toLowerCase()).toContain("historical");
    });
    it("keeps STALE_PIPELINE when there are no candles to display (unresolved fallthrough)", () => {
      expect(resolveChartSurfaceBadge("unavailable", false, false).label).toBe(L.STALE_PIPELINE);
    });
    it("preserves live-source LIVE_CERTIFIED_QUOTE labels regardless of hasCandles", () => {
      expect(resolveChartSurfaceBadge("polygon", true, true).label).toBe(L.LIVE_CERTIFIED_QUOTE);
      expect(resolveChartSurfaceBadge("polygon", true, false).label).toBe(L.LIVE_CERTIFIED_QUOTE);
    });
    it("preserves delayed-provider canon labels — never over-promotes, never claims entitlement", () => {
      expect(resolveChartSurfaceBadge("yahoo", true, true).label).toBe(L.ACTIVE_DEGRADED);
      expect(resolveChartSurfaceBadge("finnhub", true, true).label).toBe(L.ACTIVE_DEGRADED);
    });
    it("provenance is preserved on the promoted badge (internal diagnostics)", () => {
      const b = resolveChartSurfaceBadge("unavailable", false, true);
      expect(b.provenance).toBe("unavailable");
    });
  });
});
