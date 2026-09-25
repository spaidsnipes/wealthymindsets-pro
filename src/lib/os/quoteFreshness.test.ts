/**
 * THE FRESHNESS JOIN HAS ONE OWNER, AND BOTH BADGES READ IT.
 *
 * Serving BTC 1m, 2026-09-25: the masthead read LIVE — CERTIFIED QUOTE while
 * the decision rail's plaque read DEGRADED / CHART INTEGRITY · WOUNDED, because
 * only the masthead joined `lastObservedAtMs` to the clock.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FEED_CLOCK_SAMPLE_INTERVAL_MS, LIVE_STALENESS_BUDGET_MS, quoteFreshness } from "./osChrome";
import { priceSourceBadge } from "@/lib/priceSource";
import { CANONICAL_FIDELITY_LABELS } from "@/lib/marketData/canonicalFidelityLabels";

const NOW = 1_790_000_000_000;

describe("quoteFreshness", () => {
  it("a streaming print inside the budget is fresh; past it is not", () => {
    expect(quoteFreshness("coinbase", NOW - 2_000, NOW)).toBe(true);
    expect(quoteFreshness("coinbase", NOW - LIVE_STALENESS_BUDGET_MS, NOW)).toBe(true);
    expect(quoteFreshness("coinbase", NOW - LIVE_STALENESS_BUDGET_MS - 1, NOW)).toBe(false);
  });

  it("never rounds an unknown into true: no stamp, no source, a future stamp, the 0 clock", () => {
    expect(quoteFreshness("coinbase", null, NOW)).toBeUndefined();
    expect(quoteFreshness(null, NOW, NOW)).toBeUndefined();
    expect(quoteFreshness("coinbase", NOW + FEED_CLOCK_SAMPLE_INTERVAL_MS + 1, NOW)).toBeUndefined();
    expect(quoteFreshness("coinbase", NOW, 0)).toBeUndefined();
    // Inside one sampling interval ahead is our stale sample, not their clock.
    expect(quoteFreshness("coinbase", NOW + 1_000, NOW)).toBe(true);
  });

  it("a REST source is not established, never stale", () => {
    expect(quoteFreshness("yahoo", NOW - 10 * 60_000, NOW)).toBeUndefined();
  });

  it("fed to the grader, a ticking Coinbase socket certifies — as the masthead already did", () => {
    const fresh = quoteFreshness("coinbase", NOW - 2_000, NOW);
    expect(priceSourceBadge("coinbase", true, true, { present: true, fresh }).label)
      .toBe(CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE);
    expect(priceSourceBadge("coinbase", true, true, { present: true }).label)
      .toBe(CANONICAL_FIDELITY_LABELS.ACTIVE_DEGRADED);
  });

  it("the masthead and the chart room both read this one join", () => {
    const os = readFileSync(path.join(process.cwd(), "src/lib/os/osChrome.ts"), "utf8");
    expect(os).toContain("const fresh = quoteFreshness(obs.source, obs.lastObservedAtMs, evaluatedAtMs);");
    const room = readFileSync(path.join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8");
    expect(room).toContain("const quoteClockMs = useFeedEvaluationClock();");
    expect(room).toContain('fresh: quoteFreshness(source === "unavailable" ? null : source, lastObservedAtMs, quoteClockMs),');
  });
});
