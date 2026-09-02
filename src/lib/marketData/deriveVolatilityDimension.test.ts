/**
 * deriveVolatilityDimension — LIVING-PIXEL LAW compliance tests.
 *
 * Guards the extension of the ORDER FLOW Passport pattern to VOLATILITY.
 * No fake range values, honest degradation below the sample threshold.
 */

import { describe, it, expect } from "vitest";
import {
  deriveVolatilityDimension,
  VOLATILITY_LOW_MAX_PCT,
  VOLATILITY_HIGH_MIN_PCT,
  VOLATILITY_RESOLVE_MIN_TRADES,
} from "./deriveVolatilityDimension";
import type { AggressorTick } from "./selectAggressorFlow";

function trade(price: number): AggressorTick {
  return { side: "buy", size: 1, price, trade: true };
}

describe("deriveVolatilityDimension", () => {
  it("returns UNKNOWN when no ticks flow", () => {
    const d = deriveVolatilityDimension({
      ticks: [],
      source: "coinbase",
      latestTickAtMs: null,
      capturedAt: 2_000_000,
      snapshotIdSeed: "chart:BTC:v-empty",
    });
    expect(d.resolution).toBe("UNKNOWN");
    expect(d.value).toBeNull();
    expect(d.evidence).toHaveLength(0);
    expect(d.unknowns[0]).toContain("No verified price evidence");
  });

  it("returns UNKNOWN when no tick is trade:true", () => {
    const ticks: AggressorTick[] = [
      { side: "buy", size: 1, price: 100 } as AggressorTick,
      { side: "sell", size: 1, price: 100 } as AggressorTick,
    ];
    const d = deriveVolatilityDimension({
      ticks,
      source: "coinbase",
      latestTickAtMs: 1_999_500,
      capturedAt: 2_000_000,
      snapshotIdSeed: "chart:BTC:v-quotes",
    });
    expect(d.resolution).toBe("UNKNOWN");
  });

  it("returns PARTIAL below the sample threshold — no fabrication", () => {
    const ticks: AggressorTick[] = [];
    for (let i = 0; i < 4; i++) ticks.push(trade(100 + i));
    const d = deriveVolatilityDimension({
      ticks,
      source: "coinbase",
      latestTickAtMs: 1_999_500,
      capturedAt: 2_000_000,
      snapshotIdSeed: "chart:BTC:v-thin",
    });
    expect(d.resolution).toBe("PARTIAL");
    expect(d.value).toBeNull();
    expect(d.evidence).toHaveLength(1);
    expect(d.unknowns[0]).toContain("below the");
  });

  it("RESOLVES to LOW VOLATILITY when range fraction is under the low cap", () => {
    const ticks: AggressorTick[] = [];
    // Ten trades in a very tight band — < 0.05% range around 100.
    for (let i = 0; i < 10; i++) ticks.push(trade(100.00 + i * 0.001));
    const d = deriveVolatilityDimension({
      ticks,
      source: "coinbase",
      latestTickAtMs: 1_999_800,
      capturedAt: 2_000_000,
      snapshotIdSeed: "chart:BTC:v-low",
    });
    expect(d.resolution).toBe("RESOLVED");
    expect(d.value).toBe("LOW VOLATILITY");
    expect(d.confidence).toBeGreaterThan(0);
    expect(d.evidence[0]!.fidelity).toBe("DERIVED");
  });

  it("RESOLVES to HIGH VOLATILITY when range fraction is above the high floor", () => {
    const ticks: AggressorTick[] = [];
    // Range 100 → 101 → 1% > VOLATILITY_HIGH_MIN_PCT (0.30%).
    for (let i = 0; i < 10; i++) ticks.push(trade(100 + i * 0.1));
    const d = deriveVolatilityDimension({
      ticks,
      source: "webull",
      latestTickAtMs: 1_999_800,
      capturedAt: 2_000_000,
      snapshotIdSeed: "chart:TSLA:v-high",
    });
    expect(d.resolution).toBe("RESOLVED");
    expect(d.value).toBe("HIGH VOLATILITY");
    expect(d.evidence[0]!.source).toBe("webull");
  });

  it("RESOLVES to NORMAL VOLATILITY between the low and high thresholds", () => {
    const ticks: AggressorTick[] = [];
    // Craft ~0.10% range (100 → 100.10), > LOW_MAX and < HIGH_MIN.
    for (let i = 0; i < 10; i++) ticks.push(trade(100 + i * 0.01));
    const d = deriveVolatilityDimension({
      ticks,
      source: "coinbase",
      latestTickAtMs: 1_999_800,
      capturedAt: 2_000_000,
      snapshotIdSeed: "chart:BTC:v-normal",
    });
    expect(d.resolution).toBe("RESOLVED");
    expect(d.value).toBe("NORMAL VOLATILITY");
  });

  it("evidence timestamps respect the capturedAt cutoff", () => {
    const ticks: AggressorTick[] = [];
    for (let i = 0; i < 10; i++) ticks.push(trade(100 + i));
    const cap = 2_000_000;
    // Simulate a tick reported AFTER the snapshot cutoff — must clamp.
    const d = deriveVolatilityDimension({
      ticks,
      source: "coinbase",
      latestTickAtMs: cap + 50_000,
      capturedAt: cap,
      snapshotIdSeed: "chart:BTC:v-clamp",
    });
    expect(d.resolution).toBe("RESOLVED");
    const ref = d.evidence[0]!;
    expect(ref.observedAt).toBeLessThanOrEqual(cap);
    expect(ref.availableAt).toBeLessThanOrEqual(cap);
    expect(ref.availableAt).toBeGreaterThanOrEqual(ref.observedAt);
    expect(ref.observedAt).toBeGreaterThan(0);
  });

  it("evidence eventId is unique per snapshot seed", () => {
    const ticks: AggressorTick[] = [];
    for (let i = 0; i < 10; i++) ticks.push(trade(100 + i));
    const base = {
      ticks,
      source: "coinbase",
      latestTickAtMs: 1_999_500,
      capturedAt: 2_000_000,
    };
    const a = deriveVolatilityDimension({ ...base, snapshotIdSeed: "seed-A" });
    const b = deriveVolatilityDimension({ ...base, snapshotIdSeed: "seed-B" });
    expect(a.evidence[0]!.eventId).not.toBe(b.evidence[0]!.eventId);
  });

  it("falls back to a non-empty source tag when input source is missing", () => {
    const ticks: AggressorTick[] = [];
    for (let i = 0; i < 10; i++) ticks.push(trade(100 + i));
    const d = deriveVolatilityDimension({
      ticks,
      source: null,
      latestTickAtMs: 1_999_500,
      capturedAt: 2_000_000,
      snapshotIdSeed: "seed-no-source",
    });
    expect(d.evidence[0]!.source.length).toBeGreaterThan(0);
  });

  it("confidence scales with sample count and never exceeds 1", () => {
    function build(count: number) {
      const ticks: AggressorTick[] = [];
      for (let i = 0; i < count; i++) ticks.push(trade(100 + (i % 3) * 0.01));
      return deriveVolatilityDimension({
        ticks,
        source: "coinbase",
        latestTickAtMs: 1_999_500,
        capturedAt: 2_000_000,
        snapshotIdSeed: `seed-count-${count}`,
      });
    }
    const low = build(VOLATILITY_RESOLVE_MIN_TRADES);
    const mid = build(20);
    const high = build(60);
    expect(low.confidence).toBeLessThan(mid.confidence!);
    expect(mid.confidence).toBeLessThan(high.confidence!);
    expect(high.confidence).toBeLessThanOrEqual(1);
  });

  it("exports the seal threshold and band boundaries so callers can align", () => {
    expect(VOLATILITY_RESOLVE_MIN_TRADES).toBeGreaterThan(0);
    expect(VOLATILITY_LOW_MAX_PCT).toBeGreaterThan(0);
    expect(VOLATILITY_HIGH_MIN_PCT).toBeGreaterThan(VOLATILITY_LOW_MAX_PCT);
  });

  it("basis line names the observed range percent and sample count", () => {
    const ticks: AggressorTick[] = [];
    for (let i = 0; i < 12; i++) ticks.push(trade(100 + i * 0.02));
    const d = deriveVolatilityDimension({
      ticks,
      source: "coinbase",
      latestTickAtMs: 1_999_500,
      capturedAt: 2_000_000,
      snapshotIdSeed: "seed-basis",
    });
    expect(d.resolution).toBe("RESOLVED");
    expect(d.evidence[0]!.basis).toMatch(/Range \d+\.\d+% observed across 12 per-trade ticks/);
  });
});
