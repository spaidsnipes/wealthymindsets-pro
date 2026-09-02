/**
 * deriveOrderFlowDimension — LIVING-PIXEL LAW compliance tests.
 *
 * Guards the from-USE fix that wires selectAggressorFlow into the
 * canonical MarketStateDimension so the Passport ORDER FLOW node
 * reflects the same truth the OrderFlowCockpitStrip renders.
 */

import { describe, it, expect } from "vitest";
import {
  deriveOrderFlowDimension,
  ORDER_FLOW_RESOLVE_MIN_TRADES,
} from "./deriveOrderFlowDimension";
import type { AggressorTick } from "./selectAggressorFlow";

function tradeTick(side: "buy" | "sell", size: number, price = 100): AggressorTick {
  return { side, size, price, trade: true };
}

describe("deriveOrderFlowDimension", () => {
  it("returns UNKNOWN when no ticks flow", () => {
    const d = deriveOrderFlowDimension({
      ticks: [],
      livePrice: 100,
      source: "coinbase",
      latestTickAtMs: null,
      capturedAt: 2_000_000,
      snapshotIdSeed: "chart:BTC:1",
    });
    expect(d.resolution).toBe("UNKNOWN");
    expect(d.value).toBeNull();
    expect(d.evidence).toHaveLength(0);
    expect(d.unknowns[0]).toContain("No verified aggressor evidence");
  });

  it("returns UNKNOWN when every tick is not a real trade (quotes only)", () => {
    const ticks: AggressorTick[] = [
      { side: "buy", size: 1, price: 100 } as AggressorTick,
      { side: "sell", size: 1, price: 100 } as AggressorTick,
    ];
    const d = deriveOrderFlowDimension({
      ticks,
      livePrice: 100,
      source: "coinbase",
      latestTickAtMs: 1_999_000,
      capturedAt: 2_000_000,
      snapshotIdSeed: "chart:BTC:2",
    });
    expect(d.resolution).toBe("UNKNOWN");
  });

  it("returns PARTIAL (never RESOLVED) with too few trades — no fabrication", () => {
    // 2 trades — below ORDER_FLOW_RESOLVE_MIN_TRADES (5).
    const ticks: AggressorTick[] = [
      tradeTick("buy", 100),
      tradeTick("sell", 100),
    ];
    const d = deriveOrderFlowDimension({
      ticks,
      livePrice: 100,
      source: "coinbase",
      latestTickAtMs: 1_999_500,
      capturedAt: 2_000_000,
      snapshotIdSeed: "chart:BTC:3",
    });
    expect(d.resolution).toBe("PARTIAL");
    expect(d.value).toBeNull();
    expect(d.evidence).toHaveLength(1);
    expect(d.confidence).toBeLessThan(0.5);
    expect(d.unknowns[0]).toContain("below the");
  });

  it("RESOLVES with sufficient trades and reports honest verdict", () => {
    const ticks: AggressorTick[] = [];
    // 10 buys × 100 vs 2 sells × 100 → strongly buy-dominant.
    for (let i = 0; i < 10; i++) ticks.push(tradeTick("buy", 100));
    for (let i = 0; i < 2; i++) ticks.push(tradeTick("sell", 100));

    const d = deriveOrderFlowDimension({
      ticks,
      livePrice: 100,
      source: "coinbase",
      latestTickAtMs: 1_999_800,
      capturedAt: 2_000_000,
      snapshotIdSeed: "chart:BTC:4",
    });
    expect(d.resolution).toBe("RESOLVED");
    expect(d.value).toBe("AGGRESSIVE BUY DOMINANT");
    expect(d.confidence).toBeGreaterThan(0);
    expect(d.evidence[0]!.fidelity).toBe("DERIVED");
    expect(d.evidence[0]!.source).toBe("coinbase");
    expect(d.evidence[0]!.basis).toContain("12 per-trade ticks");
    expect(d.contradictions).toHaveLength(0);
  });

  it("RESOLVES to AGGRESSIVE SELL DOMINANT when sellers lead by ≥1.3:1", () => {
    const ticks: AggressorTick[] = [];
    for (let i = 0; i < 2; i++) ticks.push(tradeTick("buy", 100));
    for (let i = 0; i < 10; i++) ticks.push(tradeTick("sell", 100));

    const d = deriveOrderFlowDimension({
      ticks,
      livePrice: 100,
      source: "webull",
      latestTickAtMs: 1_999_800,
      capturedAt: 2_000_000,
      snapshotIdSeed: "chart:TSLA:5",
    });
    expect(d.resolution).toBe("RESOLVED");
    expect(d.value).toBe("AGGRESSIVE SELL DOMINANT");
    expect(d.evidence[0]!.source).toBe("webull");
  });

  it("RESOLVES to BALANCED when neither side wins by 1.3:1", () => {
    const ticks: AggressorTick[] = [];
    // 6 buys × 100 vs 5 sells × 100 → imbRatio = 120 (< 130).
    for (let i = 0; i < 6; i++) ticks.push(tradeTick("buy", 100));
    for (let i = 0; i < 5; i++) ticks.push(tradeTick("sell", 100));

    const d = deriveOrderFlowDimension({
      ticks,
      livePrice: 100,
      source: "coinbase",
      latestTickAtMs: 1_999_800,
      capturedAt: 2_000_000,
      snapshotIdSeed: "chart:BTC:6",
    });
    expect(d.resolution).toBe("RESOLVED");
    expect(d.value).toBe("BALANCED AGGRESSOR FLOW");
  });

  it("evidence.observedAt/availableAt honor capturedAt cutoff (Passport validator)", () => {
    const ticks: AggressorTick[] = [];
    for (let i = 0; i < 6; i++) ticks.push(tradeTick("buy", 100));
    for (let i = 0; i < 6; i++) ticks.push(tradeTick("sell", 100));
    const cap = 2_000_000;
    // Latest tick reported as AFTER cap — must be clamped to cap.
    const d = deriveOrderFlowDimension({
      ticks,
      livePrice: 100,
      source: "coinbase",
      latestTickAtMs: cap + 100_000,
      capturedAt: cap,
      snapshotIdSeed: "chart:BTC:clamp",
    });
    expect(d.resolution).toBe("RESOLVED");
    const ref = d.evidence[0]!;
    expect(ref.observedAt).toBeLessThanOrEqual(cap);
    expect(ref.availableAt).toBeLessThanOrEqual(cap);
    expect(ref.availableAt).toBeGreaterThanOrEqual(ref.observedAt);
    expect(ref.observedAt).toBeGreaterThan(0);
  });

  it("evidence carries a stable, unique eventId per snapshot seed", () => {
    const ticks: AggressorTick[] = [];
    for (let i = 0; i < 6; i++) ticks.push(tradeTick("buy", 100));
    for (let i = 0; i < 6; i++) ticks.push(tradeTick("sell", 100));
    const a = deriveOrderFlowDimension({
      ticks,
      livePrice: 100,
      source: "coinbase",
      latestTickAtMs: 1_999_500,
      capturedAt: 2_000_000,
      snapshotIdSeed: "chart:BTC:snap-A",
    });
    const b = deriveOrderFlowDimension({
      ticks,
      livePrice: 100,
      source: "coinbase",
      latestTickAtMs: 1_999_500,
      capturedAt: 2_000_000,
      snapshotIdSeed: "chart:BTC:snap-B",
    });
    expect(a.evidence[0]!.eventId).not.toBe(b.evidence[0]!.eventId);
    expect(a.evidence[0]!.eventId).toContain("orderFlow:aggressor:chart:BTC:snap-A");
  });

  it("falls back to a non-empty source tag when input source is missing", () => {
    const ticks: AggressorTick[] = [];
    for (let i = 0; i < 6; i++) ticks.push(tradeTick("buy", 100));
    for (let i = 0; i < 6; i++) ticks.push(tradeTick("sell", 100));
    const d = deriveOrderFlowDimension({
      ticks,
      livePrice: 100,
      source: null,
      latestTickAtMs: 1_999_500,
      capturedAt: 2_000_000,
      snapshotIdSeed: "chart:BTC:no-source",
    });
    expect(d.evidence[0]!.source.length).toBeGreaterThan(0);
  });

  it("confidence scales with trade count and never exceeds bounds", () => {
    function build(count: number) {
      const ticks: AggressorTick[] = [];
      // Split ~50/50 so BALANCED verdict — we're testing confidence bucket only.
      for (let i = 0; i < count; i++) ticks.push(tradeTick(i % 2 === 0 ? "buy" : "sell", 100));
      return deriveOrderFlowDimension({
        ticks,
        livePrice: 100,
        source: "coinbase",
        latestTickAtMs: 1_999_500,
        capturedAt: 2_000_000,
        snapshotIdSeed: `chart:BTC:count-${count}`,
      });
    }
    const low = build(5);
    const mid = build(15);
    const high = build(40);
    expect(low.confidence).toBeLessThan(mid.confidence!);
    expect(mid.confidence).toBeLessThan(high.confidence!);
    expect(high.confidence).toBeLessThanOrEqual(1);
  });

  it("ORDER_FLOW_RESOLVE_MIN_TRADES is exported so callers can align UI thresholds", () => {
    expect(ORDER_FLOW_RESOLVE_MIN_TRADES).toBeGreaterThan(0);
  });
});
