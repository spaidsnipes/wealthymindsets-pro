import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { candleDataStatus, priceSourceBadge, resolveChartSurfaceBadge } from "../priceSource";
import { CanonicalFidelityBadge, buildCanonicalFidelityTooltip } from "@/components/marketData/CanonicalFidelityBadge";
import { CANONICAL_FIDELITY_LABELS as L, resolveCanonicalFidelityLabel } from "./canonicalFidelityLabels";
import { selectPerCapabilityFidelity } from "./selectPerCapabilityFidelity";

describe("availability is not verification or session evidence", () => {
  it.each(["polygon", "alpaca", "coinbase", "binance", "yahoo", "finnhub", "moomoo", "longbridge", "webull"])("known provider %s cannot substitute for observation", (source) => {
    for (const sessionOpen of [false, true, undefined]) for (const connected of [false, true]) {
      const badge = priceSourceBadge(source, connected, sessionOpen);
      expect(badge.availability).toBe("unavailable");
      expect(badge.live).toBe(false);
      const bars = resolveChartSurfaceBadge(source, connected, false, sessionOpen);
      const report = selectPerCapabilityFidelity({source, connected, hasCandles: false, sessionOpen});
      expect(report).toEqual({});
      const html = renderToStaticMarkup(createElement(CanonicalFidelityBadge, {badge: bars, capabilityReport: report}));
      expect(html).toContain("DATA UNAVAILABLE");
      expect(html).not.toMatch(/LAST VERIFIED|CERTIFIED|all normal/);
    }
  });

  it.each(["moomoo", "longbridge", "webull", "yahoo", "finnhub"])("keeps observed %s data available without manufacturing LIVE certification", (source) => {
    const observed = priceSourceBadge(source, true, true, {present: true, fresh: true});
    expect(observed.availability).toBeUndefined();
    expect(observed.unresolved).toBe(false);
    expect(observed.label).toBe(L.ACTIVE_DEGRADED);
    expect(observed.live).toBe(false);
    expect(priceSourceBadge(source, true, true, {present: true, fresh: false}).label).toBe(L.STALE_PIPELINE);
    expect(priceSourceBadge(source, false, undefined, {present: true, fresh: false}).label).toBe(L.STALE_PIPELINE);
    expect(priceSourceBadge(source, true, false, {present: true}).label).toBe(L.SESSION_CLOSED_LAST_VERIFIED);
    expect(priceSourceBadge(source, true, false, {present: true, fresh: false}).label).toBe(L.SESSION_CLOSED_LAST_VERIFIED);
  });

  it("price presence, freshness and connected transport are separate requirements", () => {
    for (const source of ["polygon", "alpaca", "coinbase", "binance"]) {
      expect(priceSourceBadge(source, true, true, {present: true}).live).toBe(false);
      expect(priceSourceBadge(source, true, true, {present: false, fresh: true}).live).toBe(false);
      expect(priceSourceBadge(source, false, true, {present: true, fresh: true}).live).toBe(false);
      expect(priceSourceBadge(source, true, true, {present: true, fresh: false}).label).toBe(L.STALE_PIPELINE);
      expect(priceSourceBadge(source, true, true, {present: true, fresh: true}).live).toBe(true);
    }
  });
  it.each([false, true, null, undefined])("empty unresolved chart stays unavailable for session %s", (sessionOpen) => {
    const badge = resolveChartSurfaceBadge("unavailable", false, false, sessionOpen);
    const report = selectPerCapabilityFidelity({source: "unavailable", connected: false, hasCandles: false, sessionOpen});
    expect(report.bars).toBeUndefined();
    expect(report.quotes).toBeUndefined();
    for (const variant of ["chrome", "ticker", "compact", "status"] as const) {
      const html = renderToStaticMarkup(createElement(CanonicalFidelityBadge, {badge, variant, capabilityReport: report}));
      expect(html).toContain("DATA UNAVAILABLE");
      expect(html).not.toMatch(/LAST VERIFIED|CERTIFIED|all normal|RECOVERING|STALE PIPELINE/);
    }
    expect(candleDataStatus("unavailable", false, false, 0, 10_000, 20_000, sessionOpen))
      .toEqual({state: "UNAVAILABLE", label: "DATA UNAVAILABLE", live: false});
  });

  it("unresolved quote cannot borrow the existence of historical bars", () => {
    const report = selectPerCapabilityFidelity({source: "unavailable", connected: false, hasCandles: true, sessionOpen: false});
    expect(report.bars).toBe(L.SESSION_CLOSED_LAST_VERIFIED);
    expect(report.quotes).toBeUndefined();
    expect(buildCanonicalFidelityTooltip(priceSourceBadge("unavailable", false, false), undefined, report))
      .not.toMatch(/all normal|RECOVERING|LAST VERIFIED/);
  });

  it("recovers to historical or closed bars only with actual candles, and clears again", () => {
    for (const sessionOpen of [false, true, undefined]) {
      const recovered = resolveChartSurfaceBadge("unavailable", false, true, sessionOpen);
      expect(recovered.label).toBe(sessionOpen === false ? L.SESSION_CLOSED_LAST_VERIFIED : L.HISTORICAL_BARS_VERIFIED);
      expect(renderToStaticMarkup(createElement(CanonicalFidelityBadge, {badge: recovered}))).not.toContain("DATA UNAVAILABLE");
      const cleared = resolveChartSurfaceBadge("unavailable", false, false, sessionOpen);
      expect(renderToStaticMarkup(createElement(CanonicalFidelityBadge, {badge: cleared}))).toContain("DATA UNAVAILABLE");
    }
  });

  it("does not count bars from a quote source alone", () => {
    expect(selectPerCapabilityFidelity({source: "yahoo", connected: true, hasCandles: false, sessionOpen: false}).bars).toBeUndefined();
  });

  it("closed without historical evidence is not LAST VERIFIED", () => {
    expect(resolveCanonicalFidelityLabel({sessionOpen: false, historicalBarsVerified: false})).toBeUndefined();
    expect(resolveCanonicalFidelityLabel({sessionOpen: false})).toBeUndefined();
  });
});
