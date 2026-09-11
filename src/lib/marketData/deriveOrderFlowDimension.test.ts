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
import type { AggressorMethod } from "./marketEvent";

/**
 * Every fixture below names a real venue in `source` ("coinbase", "webull").
 * Before 2026-09-11 the helper supplied NO `aggressorMethod`, so the selector
 * honestly resolved `UNDISCLOSED` while the assertions read as though a venue
 * had asserted the side. That is this shift's defect class inside its own test:
 * a fixture restating a provider's name minus the qualifier that made it a
 * provider. The default is coinbase's REAL method, so "source: coinbase" and
 * the sealed fidelity now agree.
 */
function tradeTick(
  side: "buy" | "sell",
  size: number,
  price = 100,
  aggressorMethod: AggressorMethod = "MAKER_SIDE_INVERTED",
): AggressorTick {
  return { side, size, price, trade: true, marketEvent: { aggressorMethod } };
}

/** A print whose side the relay reconstructed by tick rule — Alpaca's reality. */
function inferredTick(side: "buy" | "sell", size: number, price = 100): AggressorTick {
  return tradeTick(side, size, price, "TICK_RULE");
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

  describe("a sealed verdict may not out-claim the method that produced it", () => {
    function build(
      count: number,
      mk: (side: "buy" | "sell", size: number) => AggressorTick,
      seed: string,
    ) {
      const ticks: AggressorTick[] = [];
      // Buy-dominant so the verdict RESOLVES — we are testing the qualifiers
      // that ride alongside the verdict, not the verdict.
      for (let i = 0; i < count; i++) ticks.push(mk("buy", 100));
      for (let i = 0; i < 2; i++) ticks.push(mk("sell", 100));
      return deriveOrderFlowDimension({
        ticks,
        livePrice: 100,
        source: "alpaca",
        latestTickAtMs: 1_999_500,
        capturedAt: 2_000_000,
        snapshotIdSeed: seed,
      });
    }

    it("caps confidence at the tick rule's own per-print confidence, however many prints", () => {
      // 40 prints is the top count bucket (0.75 for a venue-asserted tape).
      // More samples narrow a heuristic's sampling error; they do not turn the
      // heuristic into an observation, and there is no independent observation
      // anywhere in the chain to raise it.
      const inferred = build(40, inferredTick, "chart:SPY:inferred-40");
      expect(inferred.resolution).toBe("RESOLVED");
      expect(inferred.confidence).toBeLessThanOrEqual(0.5);

      const provider = build(40, (s, z) => tradeTick(s, z), "chart:BTC:provider-40");
      expect(provider.confidence).toBeGreaterThan(inferred.confidence!);
    });

    it("stamps INFERRED, not DERIVED, when every side was reconstructed", () => {
      const d = build(40, inferredTick, "chart:SPY:inferred-fidelity");
      expect(d.evidence[0]!.fidelity).toBe("INFERRED");
    });

    it("names the method in the evidence basis so the lineage cannot be misread", () => {
      expect(build(40, inferredTick, "chart:SPY:basis").evidence[0]!.basis).toContain(
        "method: INFERRED",
      );
    });

    it("keeps the disclosure in `unknowns` even when RESOLVED", () => {
      // An empty `unknowns` is not silence — it is an affirmative claim that
      // nothing about this verdict is unknown. On a reconstruction that is the
      // lie, and it is the one that gets sealed into canonical state.
      const d = build(40, inferredTick, "chart:SPY:unknowns");
      expect(d.unknowns.length).toBeGreaterThan(0);
      expect(d.unknowns.join(" ")).toContain("tick rule");
    });

    it("says nothing extra when the venue asserted the side", () => {
      const d = build(40, (s, z) => tradeTick(s, z), "chart:BTC:clean");
      expect(d.unknowns).toHaveLength(0);
      expect(d.evidence[0]!.fidelity).toBe("DERIVED");
    });

    it("does NOT weaken the verdict string — direction is still what the tape says", () => {
      // Hedging "AGGRESSIVE BUY DOMINANT" into a maybe would hide a real
      // observation: buyers genuinely did lift more than sellers on these
      // prints. Provenance qualifies HOW WELL we know, not WHAT we saw.
      expect(build(40, inferredTick, "chart:SPY:verdict").value).toBe(
        "AGGRESSIVE BUY DOMINANT",
      );
    });

    it("treats a mixed tape as weakest-link, not mostly-observed", () => {
      const ticks: AggressorTick[] = [tradeTick("buy", 100)];
      for (let i = 0; i < 39; i++) ticks.push(inferredTick("buy", 100));
      ticks.push(inferredTick("sell", 100), inferredTick("sell", 100));
      const d = deriveOrderFlowDimension({
        ticks,
        livePrice: 100,
        source: "alpaca",
        latestTickAtMs: 1_999_500,
        capturedAt: 2_000_000,
        snapshotIdSeed: "chart:SPY:mixed",
      });
      expect(d.confidence).toBeLessThanOrEqual(0.5);
      expect(d.evidence[0]!.fidelity).toBe("INFERRED");
      expect(d.unknowns.join(" ")).toContain("weakest print");
    });

    it("caps an undisclosed tape hardest of all", () => {
      const ticks: AggressorTick[] = [];
      for (let i = 0; i < 40; i++) {
        ticks.push({ side: "buy", size: 100, price: 100, trade: true });
      }
      for (let i = 0; i < 2; i++) {
        ticks.push({ side: "sell", size: 100, price: 100, trade: true });
      }
      const d = deriveOrderFlowDimension({
        ticks,
        livePrice: 100,
        source: "unknown-relay",
        latestTickAtMs: 1_999_500,
        capturedAt: 2_000_000,
        snapshotIdSeed: "chart:???:undisclosed",
      });
      // A tape that will not say how it knows has given us no basis to rank it
      // above an admitted heuristic.
      expect(d.confidence).toBeLessThan(0.5);
      expect(d.unknowns.length).toBeGreaterThan(0);
    });

    it("carries the disclosure on the PARTIAL branch too", () => {
      const d = deriveOrderFlowDimension({
        ticks: [inferredTick("buy", 100), inferredTick("sell", 100)],
        livePrice: 100,
        source: "alpaca",
        latestTickAtMs: 1_999_500,
        capturedAt: 2_000_000,
        snapshotIdSeed: "chart:SPY:partial",
      });
      expect(d.resolution).toBe("PARTIAL");
      expect(d.unknowns[0]).toContain("below the");
      expect(d.unknowns.join(" ")).toContain("tick rule");
    });
  });

  it("ORDER_FLOW_RESOLVE_MIN_TRADES is exported so callers can align UI thresholds", () => {
    expect(ORDER_FLOW_RESOLVE_MIN_TRADES).toBeGreaterThan(0);
  });
});
