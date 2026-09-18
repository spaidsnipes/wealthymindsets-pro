/**
 * DIMENSION VOCABULARY SYMMETRY — the producers' words vs the matchers' ears.
 *
 * Covers every dimension whose VALUE a selectMarketStory chapter guard reads:
 * volatility (where the defect was found) and regime (where the identical break
 * was one careless rewording away). Direction is deliberately absent — the
 * BREAKOUT guard reads `direction.resolution`, never `direction.value`, so
 * direction has no vocabulary contract to keep and a fake one would be theatre.
 *
 * ── THE ABOVE PARAGRAPH WAS FALSE WHEN WRITTEN, AND SAID SO CONFIDENTLY ──────
 *
 * It names direction as the ONE deliberate absence. There were five. The
 * guards also read `structure.value`, `location.value`, `aggression.value` and
 * `profile.value`, and every one of those producers had since shipped an
 * exported verdict vocabulary that NO matcher in DEFAULT_MATCHERS can hear.
 *
 * Measured, not argued — see the final describe block. The consequence is that
 * SWEEP, BREAKOUT, LIQUIDITY_PROBE, ABSORPTION and VALUE_MIGRATION are
 * structurally unreachable: five of the fourteen chapters in `StoryChapter`
 * cannot occur for any market, on any venue, in any session.
 *
 * This is the volatility defect again, four times over, and it survived the
 * file written to prevent it — because that file scoped itself by a sentence
 * rather than by the guard table. A coverage claim that is not itself checked
 * is the same species as a diagnosis that is not itself checked.
 *
 * NOTHING IS REWIRED HERE. Whether "EFFORT ABSORBED" should trip the
 * ABSORPTION chapter, or "ABOVE VALUE" should count as `location.atHigh`, is a
 * question about what those words MEAN in the market — a Founder call, not a
 * refactor. Inventing the mapping to make a chapter light up would be exactly
 * the fabrication this lane exists to refuse. So the dead pairs are locked as
 * dead, the way `rotation` already is, and the tests fail the moment either
 * side moves.
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
// Value imports, deliberately, for the same reason as REGIME_VERDICTS above:
// the lock below must be built FROM each shipping producer's vocabulary, so
// that adding, renaming or removing a verdict is what moves the test — not a
// retyped copy of the words that can drift away from the producer in silence.
import { STRUCTURE_VERDICTS } from "../deriveStructureDimension";
import { LOCATION_VERDICTS } from "../deriveLocationDimension";
import { AGGRESSION_VERDICTS } from "../deriveAggressionDimension";
import { PROFILE_VERDICTS } from "../deriveProfileDimension";
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

/**
 * THE FOUR DIMENSIONS THIS FILE CLAIMED NOT TO NEED.
 *
 * Each block below pairs a producer's OWN exported vocabulary against the
 * matchers that listen for it. The vocabularies are imported as values, never
 * retyped, so adding a verdict to a producer fails the exhaustiveness case here
 * until someone states what the matchers should do with it.
 *
 * Every one of these currently resolves to "no matcher hears anything". That is
 * recorded as the measured fact it is — not softened, and not repaired by
 * guessing what the words ought to mean.
 */
describe("the guard table reads four more dimensions by VALUE", () => {
  const heard = (
    buckets: Record<string, { matches: (d: MarketStateDimension) => boolean } | undefined>,
    value: string,
  ): string[] => {
    const dim: MarketStateDimension = {
      resolution: "RESOLVED", value, confidence: 0.7,
      evidence: [{ eventId: "e", observedAt: 1, availableAt: 2, source: "test", fidelity: "DERIVED", basis: "b" }],
      contradictions: [], unknowns: [],
    };
    return Object.keys(buckets).filter((k) => buckets[k]?.matches(dim));
  };

  it("STRUCTURE: no verdict it can emit is heard by bos or sweep", () => {
    // The producer says HIGHER HIGHS / LOWER LOWS / ROTATING IN RANGE. The
    // matchers listen for "bos" and "sweep". A sequence of higher highs is NOT
    // a break of structure, so the honest answer is that this producer cannot
    // currently speak to either chapter — not that the words need bending.
    expect(Object.values(STRUCTURE_VERDICTS)).toEqual([
      "HIGHER HIGHS", "LOWER LOWS", "ROTATING IN RANGE",
    ]);
    for (const v of Object.values(STRUCTURE_VERDICTS)) {
      expect(heard(DEFAULT_MATCHERS.structure, v), `structure "${v}" is now heard`).toEqual([]);
    }
  });

  it("LOCATION: no verdict it can emit is heard by atHigh or atLow", () => {
    // ABOVE VALUE is not AT resistance — price beyond the value area and price
    // sitting on a level are different facts, and LIQUIDITY_PROBE is about the
    // second one.
    expect(Object.values(LOCATION_VERDICTS)).toEqual([
      "ABOVE VALUE", "INSIDE VALUE", "BELOW VALUE",
    ]);
    for (const v of Object.values(LOCATION_VERDICTS)) {
      expect(heard(DEFAULT_MATCHERS.location, v), `location "${v}" is now heard`).toEqual([]);
    }
  });

  it("AGGRESSION: no verdict it can emit is heard by high or low", () => {
    // The closest thing to a real mapping in this whole block: EFFORT ABSORBED
    // is, almost by definition, what the ABSORPTION chapter is looking for. It
    // is still not wired, because "almost by definition" is the voice a
    // fabrication uses. Founder call.
    expect(Object.values(AGGRESSION_VERDICTS)).toEqual([
      "EFFORT ABSORBED", "EFFORT MATCHED", "EFFORT REWARDED",
      "BUYERS PRESSING", "SELLERS PRESSING", "TWO-SIDED",
    ]);
    for (const v of Object.values(AGGRESSION_VERDICTS)) {
      expect(heard(DEFAULT_MATCHERS.aggression, v), `aggression "${v}" is now heard`).toEqual([]);
    }
  });

  it("PROFILE: no verdict it can emit is heard by migrating", () => {
    // TIGHT / DEFINED / BROAD describe the SHAPE of value at one instant.
    // Migration is a claim about value MOVING, which needs two snapshots. The
    // matcher is not merely mis-worded here — it is asking a question this
    // producer's single-snapshot vocabulary cannot answer at all.
    expect(Object.values(PROFILE_VERDICTS)).toEqual([
      "TIGHT VALUE", "DEFINED VALUE", "BROAD VALUE",
    ]);
    for (const v of Object.values(PROFILE_VERDICTS)) {
      expect(heard(DEFAULT_MATCHERS.profile, v), `profile "${v}" is now heard`).toEqual([]);
    }
  });

  it("names the five chapters that therefore cannot occur", () => {
    // ANTI-DRIFT. If someone wires one of the matchers above, this list must
    // shrink in the same commit — so the repair and the record move together
    // and the file can never again describe a coverage it does not have.
    const unreachable = ["SWEEP", "BREAKOUT", "LIQUIDITY_PROBE", "ABSORPTION", "VALUE_MIGRATION"];
    const deadMatchers = [
      ...Object.values(STRUCTURE_VERDICTS).flatMap((v) => heard(DEFAULT_MATCHERS.structure, v)),
      ...Object.values(LOCATION_VERDICTS).flatMap((v) => heard(DEFAULT_MATCHERS.location, v)),
      ...Object.values(AGGRESSION_VERDICTS).flatMap((v) => heard(DEFAULT_MATCHERS.aggression, v)),
      ...Object.values(PROFILE_VERDICTS).flatMap((v) => heard(DEFAULT_MATCHERS.profile, v)),
    ];
    expect(
      deadMatchers,
      `a matcher came alive — ${unreachable.join(", ")} may now be reachable and this test must be updated`,
    ).toEqual([]);
  });
});
