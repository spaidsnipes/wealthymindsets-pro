import { describe, it, expect } from "vitest";
import {
  CANONICAL_CAPABILITIES,
  PRICE_BEARING_CAPABILITIES,
  NON_PRICE_CAPABILITIES,
  emptyCapabilityReport,
  strongestCapability,
  weakestCapability,
  degradedNonPriceCapabilities,
  fromLegacyBadgeLabel,
  unevaluatedCapabilities,
  evaluatedCapabilityCount,
  type PerCapabilityFidelityReport,
} from "./perCapabilityFidelity";
import { CANONICAL_FIDELITY_LABELS as L } from "./canonicalFidelityLabels";

/**
 * canon §PROVIDER STATUS IS RESOLVED PER CAPABILITY (Founding
 * Contract 2026-08-29). The seven capabilities are locked here in
 * canon order.
 */
describe("perCapabilityFidelity — canon §Per-Capability Fidelity", () => {
  it("exports exactly the seven canon capabilities in canon order", () => {
    expect([...CANONICAL_CAPABILITIES]).toEqual([
      "bars",
      "quotes",
      "ticks",
      "options",
      "greeks",
      "depth",
      "orderFlow",
    ]);
  });

  it("emptyCapabilityReport returns an empty object (canon: silence-is-a-feature)", () => {
    expect(emptyCapabilityReport()).toEqual({});
  });
});

describe("strongestCapability", () => {
  it("returns null on an empty report (silent — no fake status)", () => {
    expect(strongestCapability({})).toBeNull();
  });

  it("picks LIVE_CERTIFIED_QUOTE over HISTORICAL_BARS_VERIFIED", () => {
    const r: PerCapabilityFidelityReport = {
      bars: L.HISTORICAL_BARS_VERIFIED,
      quotes: L.LIVE_CERTIFIED_QUOTE,
    };
    expect(strongestCapability(r)).toEqual({
      capability: "quotes",
      label: L.LIVE_CERTIFIED_QUOTE,
    });
  });

  it("picks SESSION_CLOSED (5) over HISTORICAL_BARS_VERIFIED (4) — canon: closed dominates a stale-adjacent read", () => {
    const r: PerCapabilityFidelityReport = {
      bars: L.HISTORICAL_BARS_VERIFIED,
      quotes: L.SESSION_CLOSED_LAST_VERIFIED,
    };
    expect(strongestCapability(r)?.label).toBe(L.SESSION_CLOSED_LAST_VERIFIED);
  });

  it("ignores unevaluated capabilities (undefined slots)", () => {
    const r: PerCapabilityFidelityReport = {
      bars: L.HISTORICAL_BARS_VERIFIED,
      // everything else undefined
    };
    expect(strongestCapability(r)?.capability).toBe("bars");
  });
});

describe("weakestCapability — Sentinel-style degraded surface", () => {
  it("returns null on an empty report", () => {
    expect(weakestCapability({})).toBeNull();
  });

  it("picks BLOCKED_BY_ENTITLEMENT (0) as the weakest", () => {
    const r: PerCapabilityFidelityReport = {
      bars: L.LIVE_CERTIFIED_QUOTE,
      depth: L.BLOCKED_BY_ENTITLEMENT,
      greeks: L.DELAYED_BY_ENTITLEMENT,
    };
    expect(weakestCapability(r)).toEqual({
      capability: "depth",
      label: L.BLOCKED_BY_ENTITLEMENT,
    });
  });

  it("STALE_PIPELINE (1) is weaker than ACTIVE_DEGRADED (2)", () => {
    const r: PerCapabilityFidelityReport = {
      bars: L.STALE_PIPELINE,
      quotes: L.ACTIVE_DEGRADED,
    };
    expect(weakestCapability(r)?.label).toBe(L.STALE_PIPELINE);
  });
});

/**
 * BUILD ORDER §14.7 — "missing Greeks cannot dirty a verified last price."
 *
 * The defect this locks: a price chip asked `weakestCapability` across all
 * seven capabilities and printed the answer next to a LIVE quote. A blocked
 * Greek entitlement — which no price depends on — was therefore announced as
 * the weakness of a price verified one second earlier. Technically named, and
 * still the wrong impression at a glance.
 */
describe("§14.7 — a capability the price does not rest on cannot describe the price", () => {
  it("scopes the price's evidence chain to bars / quotes / ticks", () => {
    expect([...PRICE_BEARING_CAPABILITIES]).toEqual(["bars", "quotes", "ticks"]);
  });

  it("leaves the other four as real capabilities, just not price-bearing", () => {
    expect([...NON_PRICE_CAPABILITIES]).toEqual([
      "options", "greeks", "depth", "orderFlow",
    ]);
    // The two sets must partition the canon seven — no capability may be
    // dropped from the model by being absent from both.
    expect(
      [...PRICE_BEARING_CAPABILITIES, ...NON_PRICE_CAPABILITIES].sort(),
    ).toEqual([...CANONICAL_CAPABILITIES].sort());
  });

  it("does not let a blocked Greek be the weakest thing about a live quote", () => {
    const r: PerCapabilityFidelityReport = {
      bars:   L.LIVE_CERTIFIED_QUOTE,
      quotes: L.LIVE_CERTIFIED_QUOTE,
      greeks: L.BLOCKED_BY_ENTITLEMENT,
    };

    // Unscoped, the old behaviour — still available for surfaces that
    // genuinely mean all seven.
    expect(weakestCapability(r)?.capability).toBe("greeks");

    // Scoped to the price's own chain, the answer is the price's own truth.
    expect(weakestCapability(r, PRICE_BEARING_CAPABILITIES)).toEqual({
      capability: "bars",
      label: L.LIVE_CERTIFIED_QUOTE,
    });
  });

  it("still reports a genuinely weak price capability under the scope", () => {
    const r: PerCapabilityFidelityReport = {
      bars:   L.LIVE_CERTIFIED_QUOTE,
      ticks:  L.STALE_PIPELINE,
      greeks: L.BLOCKED_BY_ENTITLEMENT,
    };
    // The scope is not a mute button. A stale tick feed IS the price's problem.
    expect(weakestCapability(r, PRICE_BEARING_CAPABILITIES)?.capability).toBe("ticks");
  });

  it("returns null when the report evaluated only non-price capabilities", () => {
    const r: PerCapabilityFidelityReport = { greeks: L.BLOCKED_BY_ENTITLEMENT };
    expect(weakestCapability(r, PRICE_BEARING_CAPABILITIES)).toBeNull();
  });

  it("discloses the degraded non-price capabilities rather than hiding them", () => {
    // §14.7 forbids CONFLATING, not disclosing. The Greek is still named —
    // on its own line, where it speaks only for itself.
    const r: PerCapabilityFidelityReport = {
      bars:      L.LIVE_CERTIFIED_QUOTE,
      greeks:    L.BLOCKED_BY_ENTITLEMENT,
      depth:     L.STALE_PIPELINE,
      orderFlow: L.LIVE_CERTIFIED_QUOTE,
    };
    expect(degradedNonPriceCapabilities(r)).toEqual([
      { capability: "greeks", label: L.BLOCKED_BY_ENTITLEMENT },
      { capability: "depth",  label: L.STALE_PIPELINE },
    ]);
  });

  it("counts a closed session as normal, not as degradation", () => {
    const r: PerCapabilityFidelityReport = {
      options: L.SESSION_CLOSED_LAST_VERIFIED,
      greeks:  L.SESSION_CLOSED_LAST_VERIFIED,
    };
    // Market closed is not a failure. Canon §Normal inactivity is not failure.
    expect(degradedNonPriceCapabilities(r)).toEqual([]);
  });

  it("never reports a price capability as a non-price one", () => {
    const r: PerCapabilityFidelityReport = {
      bars:   L.BLOCKED_BY_ENTITLEMENT,
      quotes: L.STALE_PIPELINE,
      ticks:  L.ACTIVE_DEGRADED,
    };
    expect(degradedNonPriceCapabilities(r)).toEqual([]);
  });

  it("says nothing about capabilities that were never evaluated", () => {
    expect(degradedNonPriceCapabilities({})).toEqual([]);
  });
});

describe("fromLegacyBadgeLabel — legacy → per-capability migration bridge", () => {
  it("propagates a LIVE label to bars + quotes only (canon: do not silently override)", () => {
    const r = fromLegacyBadgeLabel(L.LIVE_CERTIFIED_QUOTE);
    expect(r.bars).toBe(L.LIVE_CERTIFIED_QUOTE);
    expect(r.quotes).toBe(L.LIVE_CERTIFIED_QUOTE);
    expect(r.ticks).toBeUndefined();
    expect(r.options).toBeUndefined();
    expect(r.greeks).toBeUndefined();
    expect(r.depth).toBeUndefined();
    expect(r.orderFlow).toBeUndefined();
  });

  it("DELAYED_BY_ENTITLEMENT applies only to bars + quotes, NOT to Greeks / depth / options", () => {
    const r = fromLegacyBadgeLabel(L.DELAYED_BY_ENTITLEMENT);
    expect(r.bars).toBe(L.DELAYED_BY_ENTITLEMENT);
    expect(r.quotes).toBe(L.DELAYED_BY_ENTITLEMENT);
    // Canon: certified newer provider capability may not be silently
    // overridden by legacy fallback. Options + Greeks stay
    // undefined until an options provider actually reports.
    expect(r.options).toBeUndefined();
    expect(r.greeks).toBeUndefined();
  });
});

describe("unevaluatedCapabilities + evaluatedCapabilityCount", () => {
  it("empty report → all seven unevaluated + count 0", () => {
    const r: PerCapabilityFidelityReport = {};
    expect(unevaluatedCapabilities(r)).toEqual([
      "bars", "quotes", "ticks", "options", "greeks", "depth", "orderFlow",
    ]);
    expect(evaluatedCapabilityCount(r)).toBe(0);
  });

  it("bars + quotes evaluated → five unevaluated + count 2", () => {
    const r: PerCapabilityFidelityReport = {
      bars: L.LIVE_CERTIFIED_QUOTE,
      quotes: L.LIVE_CERTIFIED_QUOTE,
    };
    expect(unevaluatedCapabilities(r)).toEqual([
      "ticks", "options", "greeks", "depth", "orderFlow",
    ]);
    expect(evaluatedCapabilityCount(r)).toBe(2);
  });

  it("all seven evaluated → zero unevaluated + count 7", () => {
    const r: PerCapabilityFidelityReport = {
      bars:      L.LIVE_CERTIFIED_QUOTE,
      quotes:    L.LIVE_CERTIFIED_QUOTE,
      ticks:     L.STALE_PIPELINE,
      options:   L.DELAYED_BY_ENTITLEMENT,
      greeks:    L.DELAYED_BY_ENTITLEMENT,
      depth:     L.BLOCKED_BY_ENTITLEMENT,
      orderFlow: L.ACTIVE_DEGRADED,
    };
    expect(unevaluatedCapabilities(r).length).toBe(0);
    expect(evaluatedCapabilityCount(r)).toBe(7);
  });
});
