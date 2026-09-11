/**
 * deriveDirectionDimension — LIVING-PIXEL LAW compliance tests.
 *
 * Guards the third Passport producer (after ORDER FLOW and VOLATILITY).
 * Direction carries more downstream consequence than its siblings —
 * selectCLC, selectDLAR and selectTradeExpectation all branch on the value
 * string — so these tests lock the VOCABULARY as hard as the resolution.
 */

import { describe, it, expect } from "vitest";
import {
  deriveDirectionDimension,
  DIRECTION_RESOLVE_MIN_TRADES,
  DIRECTION_MIN_RANGE_SHARE,
  type DirectionTick,
} from "./deriveDirectionDimension";

const BASE = {
  source: "coinbase",
  latestTickAtMs: 1_999_500,
  capturedAt: 2_000_000,
  snapshotIdSeed: "chart:BTC:d-test",
} as const;

function trade(price: number, time: number): DirectionTick {
  return { price, time, trade: true };
}

/** A clean one-way ramp of `n` trades from `from` to `to`. */
function ramp(n: number, from: number, to: number): DirectionTick[] {
  const step = (to - from) / (n - 1);
  return Array.from({ length: n }, (_, i) => trade(from + step * i, 1_000_000 + i));
}

describe("deriveDirectionDimension", () => {
  it("returns UNKNOWN when no ticks flow", () => {
    const d = deriveDirectionDimension({ ...BASE, ticks: [] });
    expect(d.resolution).toBe("UNKNOWN");
    expect(d.value).toBeNull();
    expect(d.evidence).toHaveLength(0);
    expect(d.unknowns[0]).toContain("No verified price evidence");
  });

  it("returns UNKNOWN when no tick is trade:true — quotes are not a direction", () => {
    const ticks: DirectionTick[] = [
      { price: 100, time: 1_000_000 },
      { price: 140, time: 1_000_001 },
    ];
    const d = deriveDirectionDimension({ ...BASE, ticks });
    expect(d.resolution).toBe("UNKNOWN");
    expect(d.value).toBeNull();
  });

  it("returns UNKNOWN when every trade price is invalid", () => {
    const ticks: DirectionTick[] = [
      { price: 0, time: 1, trade: true },
      { price: -4, time: 2, trade: true },
      { price: Number.NaN, time: 3, trade: true },
      { price: null, time: 4, trade: true },
    ];
    expect(deriveDirectionDimension({ ...BASE, ticks }).resolution).toBe("UNKNOWN");
  });

  it("never RESOLVES below the seal threshold, however clean the ramp", () => {
    const ticks = ramp(DIRECTION_RESOLVE_MIN_TRADES - 1, 100, 110);
    const d = deriveDirectionDimension({ ...BASE, ticks });
    expect(d.resolution).toBe("PARTIAL");
    expect(d.value).toBeNull();
    expect(d.confidence).toBe(0);
    expect(d.unknowns[0]).toContain(`below the ${DIRECTION_RESOLVE_MIN_TRADES}-trade seal threshold`);
    // PARTIAL still shows its work — the tape it did see is real evidence.
    expect(d.evidence).toHaveLength(1);
  });

  it("RESOLVES UP on a sustained one-way rally at the threshold exactly", () => {
    const ticks = ramp(DIRECTION_RESOLVE_MIN_TRADES, 100, 110);
    const d = deriveDirectionDimension({ ...BASE, ticks });
    expect(d.resolution).toBe("RESOLVED");
    expect(d.value).toBe("UP");
    expect(d.confidence).toBeGreaterThan(0);
    expect(d.contradictions).toHaveLength(0);
    expect(d.unknowns).toHaveLength(0);
  });

  it("RESOLVES DOWN on a sustained one-way selloff", () => {
    const ticks = ramp(30, 110, 100);
    const d = deriveDirectionDimension({ ...BASE, ticks });
    expect(d.resolution).toBe("RESOLVED");
    expect(d.value).toBe("DOWN");
  });

  it("refuses to resolve chop — a round trip is not a direction", () => {
    // Up to 110 and all the way back to 100: 40 trades, huge range, zero drift.
    const up = ramp(20, 100, 110);
    const down = ramp(20, 110, 100).map((t, i) => ({ ...t, time: 1_000_100 + i }));
    const d = deriveDirectionDimension({ ...BASE, ticks: [...up, ...down] });
    expect(d.resolution).toBe("PARTIAL");
    expect(d.value).toBeNull();
    expect(d.unknowns[0]).toContain("no direction established");
  });

  it("refuses to resolve when drift does not dominate the observed range", () => {
    // Swing 100 -> 120 -> 102: net +2 on a range of 20 = 10% range share.
    const up = ramp(20, 100, 120);
    const back = ramp(20, 120, 102).map((t, i) => ({ ...t, time: 1_000_100 + i }));
    const d = deriveDirectionDimension({ ...BASE, ticks: [...up, ...back] });
    expect(d.resolution).toBe("PARTIAL");
    expect(d.unknowns[0]).toMatch(/covers only \d+% of the observed range/);
  });

  it("refuses to resolve a dead-flat tape even though range share is technically 1", () => {
    const flat = Array.from({ length: 40 }, (_, i) => trade(100, 1_000_000 + i));
    const d = deriveDirectionDimension({ ...BASE, ticks: flat });
    expect(d.resolution).toBe("PARTIAL");
    expect(d.value).toBeNull();
  });

  it("orders by timestamp — an out-of-order arrival bag cannot flip the verdict", () => {
    const ordered = ramp(24, 100, 110);
    const shuffled = [...ordered].reverse();
    const a = deriveDirectionDimension({ ...BASE, ticks: ordered });
    const b = deriveDirectionDimension({ ...BASE, ticks: shuffled });
    expect(b.value).toBe(a.value);
    expect(b.value).toBe("UP");
  });

  it("VOCABULARY LOCK: a RESOLVED value is always recognizable to the CLC matcher", () => {
    // selectCLC / selectDLAR / selectTradeExpectation match direction by
    // substring against long|up|bull and short|down|bear. A value outside
    // that vocabulary resolves the dimension while producing an unexplained
    // WAIT downstream — that is exactly the class of defect this producer
    // exists to avoid, so it must be impossible by construction.
    for (const [from, to] of [[100, 140], [140, 100], [1, 2], [50_000, 40_000]]) {
      const d = deriveDirectionDimension({ ...BASE, ticks: ramp(30, from!, to!) });
      expect(d.resolution).toBe("RESOLVED");
      const v = String(d.value).toLowerCase();
      const long = /long|up|bull/.test(v);
      const short = /short|down|bear/.test(v);
      expect(long || short).toBe(true);
      // Never both — an ambiguous value would match the first branch by luck.
      expect(long && short).toBe(false);
    }
  });

  it("VOCABULARY LOCK holds at every range share, not just on a clean ramp", () => {
    // Orkin revive DD: a producer that emits a neutral word like "BALANCED"
    // only on the messy-but-directional tapes (share 0.5–0.9) passes a
    // clean-ramp vocabulary test while still poisoning selectCLC in the real
    // world, where tapes are never clean. Sweep the whole admissible band.
    for (const pullback of [0, 0.1, 0.2, 0.3, 0.4, 0.49]) {
      const up = ramp(20, 100, 110);
      const back = ramp(20, 110, 110 - 10 * pullback).map((t, i) => ({
        ...t,
        time: 1_000_100 + i,
      }));
      const d = deriveDirectionDimension({ ...BASE, ticks: [...up, ...back] });
      if (d.resolution !== "RESOLVED") continue;
      expect(d.value, `pullback ${pullback}`).toBe("UP");
    }
  });

  it("confidence is bucketed by sample size, never by the size of the move", () => {
    const small = deriveDirectionDimension({ ...BASE, ticks: ramp(80, 100, 100.5) });
    const huge = deriveDirectionDimension({ ...BASE, ticks: ramp(80, 100, 200) });
    expect(small.resolution).toBe("RESOLVED");
    expect(huge.resolution).toBe("RESOLVED");
    expect(small.confidence).toBe(huge.confidence);
  });

  it("more tape earns more confidence, and confidence is never fabricated above 1", () => {
    const thin = deriveDirectionDimension({ ...BASE, ticks: ramp(12, 100, 110) });
    const thick = deriveDirectionDimension({ ...BASE, ticks: ramp(80, 100, 110) });
    expect(thick.confidence!).toBeGreaterThan(thin.confidence!);
    expect(thick.confidence!).toBeLessThanOrEqual(1);
  });

  it("evidence never claims to be available before the snapshot cutoff", () => {
    const d = deriveDirectionDimension({
      ...BASE,
      ticks: ramp(30, 100, 110),
      latestTickAtMs: 9_999_999_999, // a lying-future tick
    });
    const ref = d.evidence[0]!;
    expect(ref.availableAt).toBe(BASE.capturedAt);
    expect(ref.observedAt).toBeLessThanOrEqual(BASE.capturedAt);
    expect(ref.fidelity).toBe("DERIVED");
    expect(ref.source).toBe("coinbase");
    expect(ref.basis).toContain("Net drift");
    expect(ref.eventId).toContain("direction:drift:");
  });

  it("falls back to chart-runtime provenance rather than an empty source", () => {
    const d = deriveDirectionDimension({ ...BASE, ticks: ramp(30, 100, 110), source: "   " });
    expect(d.evidence[0]!.source).toBe("chart-runtime");
  });

  it("DIRECTION_MIN_RANGE_SHARE stays a real gate — not silently relaxed to zero", () => {
    expect(DIRECTION_MIN_RANGE_SHARE).toBeGreaterThan(0);
    expect(DIRECTION_MIN_RANGE_SHARE).toBeLessThanOrEqual(1);
    expect(DIRECTION_RESOLVE_MIN_TRADES).toBeGreaterThanOrEqual(8);
  });
});
