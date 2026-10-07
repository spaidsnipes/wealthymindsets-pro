/**
 * ONE FEED READING PER CHART (serving /desk SPY 5m, 2026-10-07): the chip read
 * STALE PIPELINE while the strip on the same pane read LIVE — CERTIFIED QUOTE.
 * The chip graded the provider's observation time; the strip graded when a
 * tick last reached the chart. Now both come from chartFeedReading.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CHART_LIVE_OBSERVATION_MS, chartFeedReading, type PriceSource } from "./priceSource";
import { CANONICAL_FIDELITY_LABELS as L } from "./marketData/canonicalFidelityLabels";

const NOW = 1_800_000_000_000;

describe("chartFeedReading — the chip and the strip say one thing", () => {
  it("the measured case: a quote re-delivered often but observed 40s ago is STALE in both", () => {
    const r = chartFeedReading("tastytrade", true, true, true, NOW - 40_000, NOW);
    expect(r.badge.label).toBe(L.STALE_PIPELINE);
    expect(r.status).toEqual({ state: "STALE", label: L.STALE_PIPELINE, live: false });
  });

  it("a fresh certified observation is LIVE in both", () => {
    const r = chartFeedReading("tastytrade", true, true, true, NOW - 1_000, NOW);
    expect(r.badge.live).toBe(true);
    expect(r.status).toEqual({ state: "LIVE", label: r.badge.label, live: true });
    expect(r.badge.label).toBe(L.LIVE_CERTIFIED_QUOTE);
  });

  it("the budget edge is the provider clock's, not a local receipt", () => {
    expect(chartFeedReading("tastytrade", true, true, true, NOW - (CHART_LIVE_OBSERVATION_MS - 1), NOW).status.live).toBe(true);
    expect(chartFeedReading("tastytrade", true, true, true, NOW - CHART_LIVE_OBSERVATION_MS, NOW).status.live).toBe(false);
  });

  it("no bars: awaiting while asking, unavailable once answered empty", () => {
    expect(chartFeedReading("tastytrade", true, false, true, NOW, NOW, false).status.state).toBe("AWAITING");
    expect(chartFeedReading("tastytrade", true, false, true, NOW, NOW, true).status.state).toBe("UNAVAILABLE");
  });

  it("INVARIANT over the whole grid: with bars on screen, status.live === badge.live and status.label === badge.label", () => {
    const sources: PriceSource[] = ["tastytrade", "polygon", "coinbase", "binance", "alpaca", "finnhub", "yahoo", "moomoo", "webull", "longbridge", "unavailable"];
    let checked = 0;
    for (const source of sources) for (const connected of [true, false]) for (const sessionOpen of [true, false, null]) for (const obs of [null, NOW - 1_000, NOW - 40_000]) {
      const r = chartFeedReading(source, connected, true, sessionOpen, obs, NOW, true);
      expect(r.status.live, `${source} ${connected} ${sessionOpen} ${obs}`).toBe(r.badge.live);
      expect(r.status.label, `${source} ${connected} ${sessionOpen} ${obs}`).toBe(r.badge.label);
      checked++;
    }
    expect(checked).toBe(198);
  });

  it("MainChart reads ONE reading for the chip, the strip and the countdown", () => {
    const code = readFileSync("src/components/chart/MainChart.tsx", "utf8");
    expect(code).toContain("const candleStatus = feedReading.status;");
    expect(code).toContain("const b = feedReading.badge;");
    expect(code).not.toMatch(/=\s*candleDataStatus\(/);
    expect(code).not.toContain("Date.now() - lastObservedAtMs < 15_000");
  });
});
