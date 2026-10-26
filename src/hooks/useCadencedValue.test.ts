import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ANALYTIC_CADENCE_MS, cadenceTakes } from "./useCadencedValue";

/**
 * PERF P0 2026-10-25 (Founder: "lag on the second charts and delays … no lags, no delays"):
 * the room's TAPE readers re-derive at most 4×/s instead of every frame; the header and the forming
 * candle stay per frame. The cadence may never hold a previous instrument's sample, never hold back
 * the first prints, and never hold anything longer than ANALYTIC_CADENCE_MS.
 */
const empty = (a: readonly unknown[]) => a.length === 0;

describe("cadenceTakes — when a held analytic sample advances", () => {
  const a = [1], b = [1, 2];
  it("takes the first value, a new key, and the first non-empty sample at once", () => {
    expect(cadenceTakes(null, a, "BTC|1m", 0, 250)).toBe(true);
    expect(cadenceTakes({ value: a, at: 0, key: "BTC|1m" }, b, "BTC|5m", 1, 250)).toBe(true);
    expect(cadenceTakes({ value: [], at: 0, key: "BTC|1m" }, a, "BTC|1m", 1, 250, empty)).toBe(true);
  });
  it("holds inside the window and takes at its edge", () => {
    expect(cadenceTakes({ value: a, at: 0, key: "k" }, b, "k", 249, 250, empty)).toBe(false);
    expect(cadenceTakes({ value: a, at: 0, key: "k" }, b, "k", 250, 250, empty)).toBe(true);
  });
  it("an unchanged value is never a new sample", () => {
    expect(cadenceTakes({ value: a, at: 0, key: "k" }, a, "k", 10_000, 250)).toBe(false);
  });
  it("the window is a quarter second", () => {
    expect(ANALYTIC_CADENCE_MS).toBe(250);
  });
});

describe("the room reads the cadenced tape; the header reads the frame", () => {
  const src = readFileSync("src/components/chart/ChartsDashboard.tsx", "utf8");
  it("every recentTicks reader in ChartsDashboard reads the cadenced tape", () => {
    expect(src).toContain("recentTicks: frameTicks, source, tapeSource, connected, lastObservedAtMs } = useWebSocket({ symbol, timeframe });");
    expect(src).toMatch(/const recentTicks = useCadencedValue\(frameTicks, tapeCadenceKey, ANALYTIC_CADENCE_MS, ticksAreEmpty\);/);
    // frameTicks has exactly one reader: the cadence.
    expect(src.match(/\bframeTicks\b/g)?.length).toBe(2);
  });
  it("the Living Profile's distribution is built off the frame; its live price stays per frame", () => {
    expect(src).toMatch(/const livingProfileSnapshot = React\.useMemo\(\s*\(\) => buildLivingProfileSnapshot\(/);
    expect(src).toMatch(/selectLivingProfile\(livingProfileSnapshot, \{\s*livePrice: ticker\.price,/);
  });
  it("no per-print setState re-renders the room: the alerts' reference price follows the cadence", () => {
    expect(src).toContain("if (analyticPrice > 0) setCurrentPrice(analyticPrice);");
    expect(src).not.toContain("setCurrentPrice(ticker.price)");
  });
});
