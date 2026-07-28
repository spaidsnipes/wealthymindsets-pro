import { describe, it, expect } from "vitest";
import {
  TIMEFRAMES, TF_IDS, getTimeframe, isTFId, isSupported, normalizeTFId,
  resolveFetchPlan, assertGranularity, aggregateCandles, hasEnoughBarsForState,
  CHART_TF_ORDER, HEATMAP_TF_ORDER, PROVIDER_EVIDENCE,
  type Candle, type TFId,
} from "./timeframes";

describe("canonical timeframe set", () => {
  it("covers all 19 required intervals from 1m through 5Y", () => {
    const required: TFId[] = [
      "1m","2m","3m","5m","10m","15m","30m","45m","1h","2h","4h",
      "1D","1W","1M","3M","6M","1Y","2Y","5Y",
    ];
    expect([...TF_IDS].sort()).toEqual([...required].sort());
  });

  it("has no duplicate ids", () => {
    expect(new Set(TF_IDS).size).toBe(TF_IDS.length);
  });

  it("uses 1D/1W/1M and never the legacy D/W/M forms", () => {
    expect(TF_IDS).toContain("1D");
    expect(TF_IDS as readonly string[]).not.toContain("D");
    expect(TF_IDS as readonly string[]).not.toContain("W");
    expect(TF_IDS as readonly string[]).not.toContain("M");
  });

  it("keeps candle interval and visible range as independent axes", () => {
    // 5Y is a weekly candle over five years, not a five-year candle.
    const fiveY = getTimeframe("5Y");
    expect(fiveY.candleIntervalSec).toBe(7 * 86_400);
    expect(fiveY.defaultRangeSec).toBe(1825 * 86_400);
    expect(fiveY.defaultRangeSec).toBeGreaterThan(fiveY.candleIntervalSec);
  });
});

describe("provider support is measured, not assumed", () => {
  it("marks exactly the four provider-rejected intervals as aggregated", () => {
    const aggregated = TIMEFRAMES.filter(t => t.source === "aggregated").map(t => t.id);
    expect(aggregated.sort()).toEqual(["10m", "2h", "3m", "45m"]);
  });

  it("aggregated intervals match the intervals the provider actually rejected", () => {
    const rejected = [...PROVIDER_EVIDENCE.rejectedIntervals].sort();
    expect(rejected).toEqual(["10m", "2h", "3m", "45m"]);
  });

  it("every native timeframe declares a provider interval the provider accepts", () => {
    for (const tf of TIMEFRAMES.filter(t => t.source === "native")) {
      expect(tf.providerInterval).toBeDefined();
      expect(PROVIDER_EVIDENCE.validIntervals).toContain(tf.providerInterval!);
    }
  });

  it("never claims a depth cap it did not measure", () => {
    // null is permitted (unknown stays unknown); undefined is not.
    for (const tf of TIMEFRAMES) expect(tf.maxRangeSec !== undefined).toBe(true);
  });
});

describe("aggregation safety — exact integer divisors only", () => {
  it("every aggregated timeframe divides its source exactly", () => {
    for (const tf of TIMEFRAMES.filter(t => t.source === "aggregated")) {
      const src = getTimeframe(tf.aggregatedFrom!);
      const ratio = tf.candleIntervalSec / src.candleIntervalSec;
      expect(Number.isInteger(ratio)).toBe(true);
      expect(ratio).toBe(tf.aggregationFactor);
    }
  });

  it("rejects non-integer aggregation factors", () => {
    const bars: Candle[] = [];
    expect(() => aggregateCandles(bars, 1.5)).toThrow(/positive integer/);
    expect(() => aggregateCandles(bars, 0)).toThrow(/positive integer/);
  });

  it("aggregates OHLCV correctly", () => {
    const src: Candle[] = [
      { time: 0,   open: 10, high: 12, low: 9,  close: 11, volume: 100 },
      { time: 60,  open: 11, high: 15, low: 10, close: 14, volume: 200 },
      { time: 120, open: 14, high: 16, low: 8,  close: 9,  volume: 300 },
    ];
    const [bar] = aggregateCandles(src, 3);
    expect(bar.time).toBe(0);       // first bar's timestamp
    expect(bar.open).toBe(10);      // first open
    expect(bar.close).toBe(9);      // last close
    expect(bar.high).toBe(16);      // max high
    expect(bar.low).toBe(8);        // min low
    expect(bar.volume).toBe(600);   // summed
  });

  it("drops trailing partial groups rather than emitting a half-formed bar", () => {
    const src: Candle[] = Array.from({ length: 7 }, (_, i) => ({
      time: i * 60, open: 1, high: 1, low: 1, close: 1, volume: 1,
    }));
    expect(aggregateCandles(src, 3)).toHaveLength(2); // 7 -> 2 complete, 1 dropped
  });
});

describe("silent-downgrade protection", () => {
  it("accepts a matching granularity", () => {
    expect(() => assertGranularity("1m", "1m")).not.toThrow();
  });

  it("rejects the measured range=max downgrade to 3mo bars", () => {
    expect(() => assertGranularity("1m", "3mo")).toThrow(/granularity mismatch/i);
  });

  it("tolerates a provider that omits granularity metadata", () => {
    expect(() => assertGranularity("1m", undefined)).not.toThrow();
  });
});

describe("fetch planning", () => {
  it("routes an aggregated timeframe to its source interval with a factor", () => {
    const plan = resolveFetchPlan("3m");
    expect(plan.providerInterval).toBe("1m");
    expect(plan.aggregationFactor).toBe(3);
    expect(plan.expectedGranularity).toBe("1m");
  });

  it("routes a native timeframe with factor 1", () => {
    const plan = resolveFetchPlan("15m");
    expect(plan.providerInterval).toBe("15m");
    expect(plan.aggregationFactor).toBe(1);
  });

  it("clamps a request beyond the measured cap instead of letting it downgrade", () => {
    // 1m measured cap is 8 days; asking for 365 must clamp, not silently coarsen.
    const plan = resolveFetchPlan("1m", 365 * 86_400);
    expect(plan.rangeSec).toBe(8 * 86_400);
    expect(plan.clamped).toBe(true);
  });

  it("does not flag clamping when the request fits", () => {
    expect(resolveFetchPlan("1m", 2 * 86_400).clamped).toBe(false);
  });

  it("an aggregated timeframe inherits its source's depth cap", () => {
    // 3m aggregates from 1m, so it cannot exceed the 8-day 1m cap.
    expect(resolveFetchPlan("3m", 365 * 86_400).rangeSec).toBe(8 * 86_400);
  });
});

describe("legacy migration keeps saved layouts working", () => {
  it("maps the old chart forms onto canonical ids", () => {
    expect(normalizeTFId("D")).toBe("1D");
    expect(normalizeTFId("W")).toBe("1W");
    expect(normalizeTFId("M")).toBe("1M");
  });

  it("maps raw provider strings onto canonical ids", () => {
    expect(normalizeTFId("1d")).toBe("1D");
    expect(normalizeTFId("60m")).toBe("1h");
  });

  it("passes canonical ids through unchanged", () => {
    expect(normalizeTFId("15m")).toBe("15m");
  });

  it("returns null for genuine nonsense rather than guessing", () => {
    expect(normalizeTFId("banana")).toBeNull();
    expect(normalizeTFId("7m")).toBeNull();
  });
});

describe("TFId round-trips between chart and heatmap", () => {
  it("every heatmap timeframe is a valid chart timeframe — one shared vocabulary", () => {
    for (const id of HEATMAP_TF_ORDER) {
      expect(isTFId(id)).toBe(true);
      expect(CHART_TF_ORDER).toContain(id);
    }
  });

  it("every ordered id is a real timeframe", () => {
    for (const id of [...CHART_TF_ORDER, ...HEATMAP_TF_ORDER]) {
      expect(() => getTimeframe(id)).not.toThrow();
    }
  });

  it("chart ordering covers the full set", () => {
    expect([...CHART_TF_ORDER].sort()).toEqual([...TF_IDS].sort());
  });
});

describe("state gating", () => {
  it("blocks state computation below the minimum bar count", () => {
    const min = getTimeframe("1m").minBarsForState;
    expect(hasEnoughBarsForState("1m", min - 1)).toBe(false);
    expect(hasEnoughBarsForState("1m", min)).toBe(true);
  });

  it("every timeframe declares a positive minimum", () => {
    for (const tf of TIMEFRAMES) expect(tf.minBarsForState).toBeGreaterThan(0);
  });
});

describe("guards", () => {
  it("throws on an unknown timeframe rather than returning a default", () => {
    expect(() => getTimeframe("99y" as TFId)).toThrow(/Unknown timeframe/);
  });

  it("isSupported is true for every shipped timeframe", () => {
    for (const id of TF_IDS) expect(isSupported(id)).toBe(true);
  });
});
