import { describe, it, expect } from "vitest";
import { formatTradeAge, TRADE_FRESH_MS, TRADE_STALE_MS } from "./tradeFreshness";

const NOW = 1_755_400_000_000;

describe("formatTradeAge", () => {
  it("unknown when lastTradeAtMs is null/invalid (never fabricates 0s)", () => {
    for (const bad of [null, undefined, 0, -1, Number.NaN]) {
      const f = formatTradeAge(bad as number | null, NOW);
      expect(f.unknown).toBe(true);
      expect(f.label).toBeNull();
      expect(f.ageMs).toBeNull();
    }
  });

  it("unknown when nowMs is unavailable", () => {
    const f = formatTradeAge(NOW - 5_000, null);
    expect(f.unknown).toBe(true);
    expect(f.label).toBeNull();
  });

  it("seconds granularity under a minute", () => {
    const f = formatTradeAge(NOW - 8_000, NOW);
    expect(f.label).toBe("8s ago");
    expect(f.ageMs).toBe(8_000);
  });

  it("minutes granularity under an hour", () => {
    expect(formatTradeAge(NOW - 3 * 60_000, NOW).label).toBe("3m ago");
  });

  it("hours + days for older observations", () => {
    expect(formatTradeAge(NOW - 2 * 3_600_000, NOW).label).toBe("2.0h ago");
    expect(formatTradeAge(NOW - 3 * 86_400_000, NOW).label).toBe("3.0d ago");
  });

  it("fresh below 30s, not fresh at/after", () => {
    expect(formatTradeAge(NOW - (TRADE_FRESH_MS - 1), NOW).fresh).toBe(true);
    expect(formatTradeAge(NOW - TRADE_FRESH_MS, NOW).fresh).toBe(false);
  });

  it("stale at/after 5m", () => {
    expect(formatTradeAge(NOW - (TRADE_STALE_MS - 1), NOW).stale).toBe(false);
    expect(formatTradeAge(NOW - TRADE_STALE_MS, NOW).stale).toBe(true);
  });

  it("clock skew (lastTrade in the future) clamps age to 0, not negative", () => {
    const f = formatTradeAge(NOW + 5_000, NOW);
    expect(f.ageMs).toBe(0);
    expect(f.label).toBe("0ms ago");
    expect(f.fresh).toBe(true);
  });

  it("is pure — identical input, identical output", () => {
    expect(formatTradeAge(NOW - 12_000, NOW)).toEqual(formatTradeAge(NOW - 12_000, NOW));
  });
});
