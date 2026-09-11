/**
 * DIMENSION VOCABULARY SYMMETRY — the producers' words vs the matchers' ears.
 *
 * Covers every dimension whose VALUE a selectMarketStory chapter guard reads:
 * volatility (where the defect was found) and regime (where the identical break
 * was one careless rewording away). Direction is deliberately absent — the
 * BREAKOUT guard reads `direction.resolution`, never `direction.value`, so
 * direction has no vocabulary contract to keep and a fake one would be theatre.
 *
 * ── The defect this file exists to make impossible ──────────────────────────
 *
 * `deriveVolatilityDimension` seals the dimension with the value
 * "LOW VOLATILITY". `selectMarketStory`'s DEFAULT_MATCHERS asked whether the
 * value was "low". `looseMatch` compares WHOLE normalized words — it strips
 * spaces and case but does not substring-match — so "lowvolatility" was never
 * "low", `m.volatility.low.matches(...)` returned false for every snapshot the
 * shipping producer could ever emit, and the BALANCE chapter guard's
 * `supports` was therefore STRUCTURALLY false.
 *
 * Nothing threw. tsc stayed at exit 0 — both sides are `string`. Every existing
 * test stayed green, because they hand the engine hand-written fixtures like
 * `dim("low")` that the real producer never produces. The only symptom was the
 * one the Founder actually sees: /command-deck printing UNKNOWN in its largest
 * type, on every symbol, in every session, with live tape flowing.
 *
 * A matcher that matches nothing is indistinguishable, from the inside, from a
 * market that is never in that state. That is why this cannot be left to a
 * reviewer noticing.
 *
 * ── Why the test is written this way ────────────────────────────────────────
 *
 * It iterates `VOLATILITY_VERDICTS` — the producer's OWN exported vocabulary —
 * rather than a list of strings retyped here. Adding a fourth verdict to the
 * producer makes the exhaustiveness test fail until this file states what the
 * matchers should do with it. That is the same symmetry discipline the
 * DecisionId mint/reader pair uses: what one half produces, the other half is
 * tested against, from one shared constant.
 *
 * It also drives the REAL producer with real ticks rather than asserting on
 * literals, so a verdict that no tick series can actually reach would be caught
 * as vacuous rather than counted as covered.
 */

import { describe, it, expect } from "vitest";
import {
  deriveVolatilityDimension,
  VOLATILITY_VERDICTS,
  VOLATILITY_RESOLVE_MIN_TRADES,
  type VolatilityVerdict,
} from "../deriveVolatilityDimension";
import type { AggressorTick } from "../selectAggressorFlow";
import type { CanonicalMarketState, MarketStateDimension } from "../canonicalMarketState";
import { deriveRegimeDimension, REGIME_VERDICTS } from "../deriveRegimeDimension";
import { DEFAULT_MATCHERS, selectMarketStory } from "./selectMarketStory";

const trade = (price: number): AggressorTick => ({ side: "buy", size: 1, price, trade: true });

/** Seal the dimension through the REAL producer at a chosen relative range. */
function sealedAtRangePct(rangePct: number): MarketStateDimension {
  const base = 100_000;
  const span = (base * rangePct) / 100;
  const n = Math.max(VOLATILITY_RESOLVE_MIN_TRADES, 10);
  const ticks: AggressorTick[] = Array.from({ length: n }, (_, i) =>
    // First tick at the low, last at the high; the rest flat at the low so the
    // mean stays ~base and (max-min)/mean lands on the requested range.
    trade(i === n - 1 ? base + span : base),
  );
  return deriveVolatilityDimension({
    ticks,
    source: "coinbase",
    latestTickAtMs: 1_999_500,
    capturedAt: 2_000_000,
    snapshotIdSeed: `vocab:${rangePct}`,
  });
}

/** Which DEFAULT_MATCHERS volatility buckets claim this dimension. */
function bucketsMatching(dim: MarketStateDimension): string[] {
  const m = DEFAULT_MATCHERS.volatility;
  return (["low", "high", "shock"] as const).filter((k) => m[k]?.matches(dim));
}

describe("volatility vocabulary — producer ↔ DEFAULT_MATCHERS symmetry", () => {
  it("names exactly three verdicts, so the cases below are exhaustive", () => {
    // Guards the LIST. A fourth verdict added to the producer without a
    // decision recorded here fails immediately rather than silently shipping an
    // unmatchable word.
    expect(Object.values(VOLATILITY_VERDICTS)).toEqual([
      "LOW VOLATILITY",
      "NORMAL VOLATILITY",
      "HIGH VOLATILITY",
    ]);
  });

  it("the REAL producer can reach every verdict (anti-vacuity)", () => {
    // Without this, a matcher list could 'cover' a verdict that no tick series
    // on earth produces, and the coverage would be theatre.
    const reached = new Set<VolatilityVerdict | null>([
      sealedAtRangePct(0.01).value as VolatilityVerdict | null,
      sealedAtRangePct(0.15).value as VolatilityVerdict | null,
      sealedAtRangePct(1.0).value as VolatilityVerdict | null,
    ]);
    for (const v of Object.values(VOLATILITY_VERDICTS)) {
      expect(reached.has(v), `no tick series reaches ${v}`).toBe(true);
    }
  });

  it("LOW is heard by the low matcher — the exact pair that was broken", () => {
    const dim = sealedAtRangePct(0.01);
    expect(dim.resolution).toBe("RESOLVED");
    expect(dim.value).toBe(VOLATILITY_VERDICTS.LOW);
    expect(bucketsMatching(dim)).toEqual(["low"]);
  });

  it("HIGH is heard by the high matcher, and only by it", () => {
    const dim = sealedAtRangePct(1.0);
    expect(dim.value).toBe(VOLATILITY_VERDICTS.HIGH);
    expect(bucketsMatching(dim)).toEqual(["high"]);
  });

  it("NORMAL is deliberately heard by NO bucket — normal is not a story", () => {
    // This is a positive decision, not an omission: 'neither low nor high' must
    // not be smuggled into a chapter guard.
    const dim = sealedAtRangePct(0.15);
    expect(dim.value).toBe(VOLATILITY_VERDICTS.NORMAL);
    expect(bucketsMatching(dim)).toEqual([]);
  });

  it("an UNSEALED dimension is heard by no bucket, whatever its range", () => {
    // Thin tape returns PARTIAL with value null; looseMatch must refuse it, or
    // a chapter would be told a story by a dimension that declined to tell one.
    const thin = deriveVolatilityDimension({
      ticks: [trade(100_000), trade(100_001)],
      source: "coinbase",
      latestTickAtMs: 1_999_500,
      capturedAt: 2_000_000,
      snapshotIdSeed: "vocab:thin",
    });
    expect(thin.resolution).not.toBe("RESOLVED");
    expect(bucketsMatching(thin)).toEqual([]);
  });
});

const UNK: MarketStateDimension = {
  resolution: "UNKNOWN", value: null, confidence: null,
  evidence: [], contradictions: [], unknowns: [],
};

function stateWith(over: Partial<CanonicalMarketState>): CanonicalMarketState {
  return {
    schemaVersion: "wm.market-state.v1",
    snapshotId: "s1",
    capturedAt: 2_000_000,
    instrumentId: "BTC-USD",
    normalizedSymbol: "BTC",
    executableIdentity: "BTC-USD",
    assetClass: "crypto",
    exchange: "COINBASE",
    session: "24X7",
    timeframeContext: ["15m"],
    price: { last: 100_000, bid: null, ask: null, eventAt: 2_000_000 },
    qualityState: "LIVE",
    qualityStateEvidence: [],
    freshnessMs: 100,
    coverage: [],
    direction: UNK, location: UNK, aggression: UNK,
    regime: UNK, structure: UNK, volatility: UNK, profile: UNK, orderFlow: UNK,
    contradictions: [], unknowns: [],
    ...over,
  } as unknown as CanonicalMarketState;
}

describe("volatility vocabulary — the hero word can now leave UNKNOWN", () => {
  const regimeBalance: MarketStateDimension = {
    resolution: "RESOLVED", value: "BALANCE", confidence: 0.55,
    evidence: [{ eventId: "r", observedAt: 1, availableAt: 2, source: "test", fidelity: "DERIVED", basis: "b" }],
    contradictions: [], unknowns: [],
  };

  it("BALANCE resolves from PRODUCER-SHAPED dimensions, end to end", () => {
    // The whole point. Both dimensions here are the shapes the shipping
    // producers emit — not hand-written matcher-friendly fixtures. Before the
    // vocabulary fix this returned UNKNOWN with 'Insufficient dimensions
    // resolved', which is the literal sentence the Founder read on the deck.
    const vm = selectMarketStory(
      stateWith({ regime: regimeBalance, volatility: sealedAtRangePct(0.01) }),
    );
    expect(vm.resolution).toBe("RESOLVED");
    expect(vm.current?.chapter).toBe("BALANCE");
  });

  it("still returns UNKNOWN on NORMAL volatility — the fix is not a blanket yes", () => {
    // ANTI-VACUITY: a matcher list that said yes to everything would pass the
    // test above while fabricating a chapter for a market that has none.
    const vm = selectMarketStory(
      stateWith({ regime: regimeBalance, volatility: sealedAtRangePct(0.15) }),
    );
    expect(vm.current).toBeNull();
    expect(vm.resolution).toBe("UNKNOWN");
  });
});

describe("regime vocabulary — producer ↔ DEFAULT_MATCHERS symmetry", () => {
  const sealedVol = sealedAtRangePct(0.01);
  const dirAt = (resolution: "RESOLVED" | "PARTIAL"): MarketStateDimension => ({
    resolution, value: resolution === "RESOLVED" ? "UP" : null, confidence: 0.55,
    evidence: [{ eventId: "d", observedAt: 1, availableAt: 2, source: "test", fidelity: "DERIVED", basis: "b" }],
    contradictions: [], unknowns: [],
  });
  const regimeFrom = (resolution: "RESOLVED" | "PARTIAL") =>
    deriveRegimeDimension({ direction: dirAt(resolution), volatility: sealedVol, tradeCount: 40 });

  const regimeBuckets = (dim: MarketStateDimension): string[] => {
    const m = DEFAULT_MATCHERS.regime;
    return (["balance", "trend", "rotation"] as const).filter((k) => m[k]?.matches(dim));
  };

  it("names exactly two verdicts, so the cases below are exhaustive", () => {
    expect(Object.values(REGIME_VERDICTS)).toEqual(["TREND", "BALANCE"]);
  });

  it("the REAL producer reaches both verdicts (anti-vacuity)", () => {
    expect(regimeFrom("RESOLVED").value).toBe(REGIME_VERDICTS.TREND);
    expect(regimeFrom("PARTIAL").value).toBe(REGIME_VERDICTS.BALANCE);
  });

  it("TREND is heard by the trend matcher, and only by it", () => {
    expect(regimeBuckets(regimeFrom("RESOLVED"))).toEqual(["trend"]);
  });

  it("BALANCE is heard by the balance matcher, and only by it", () => {
    expect(regimeBuckets(regimeFrom("PARTIAL"))).toEqual(["balance"]);
  });

  it("ROTATION has no producer — the matcher exists but nothing in this repo can trip it", () => {
    // Recorded, not fixed. The rotation matcher is dead weight today; naming
    // that here stops a future reader assuming ROTATION is wired and reasoning
    // from a chapter that cannot occur.
    for (const r of ["RESOLVED", "PARTIAL"] as const) {
      expect(regimeBuckets(regimeFrom(r))).not.toContain("rotation");
    }
  });

  it("an UNSEALED regime is heard by no bucket", () => {
    const thin = deriveRegimeDimension({
      direction: dirAt("PARTIAL"), volatility: sealedVol, tradeCount: 1,
    });
    expect(thin.resolution).not.toBe("RESOLVED");
    expect(regimeBuckets(thin)).toEqual([]);
  });
});
