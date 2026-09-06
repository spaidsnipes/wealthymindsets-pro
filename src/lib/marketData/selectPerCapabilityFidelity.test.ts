import { describe, it, expect } from "vitest";
import { selectPerCapabilityFidelity } from "./selectPerCapabilityFidelity";
import { CANONICAL_FIDELITY_LABELS as L } from "./canonicalFidelityLabels";

/**
 * canon §Provider Status Is Resolved Per Capability (2026-08-29).
 * Every state-matrix branch of the derivation is locked so a future
 * regression can't silently start reporting fake per-capability
 * evidence.
 */
describe("selectPerCapabilityFidelity — canon derivation", () => {
  it("fresh quote receipt certifies quotes without certifying bar freshness", () => {
    const r = selectPerCapabilityFidelity({
      source: "polygon", connected: true, hasCandles: true,
      quoteObservation: {present: true, fresh: true},
    });
    expect(r.bars).toBe(L.ACTIVE_DEGRADED);
    expect(r.quotes).toBe(L.LIVE_CERTIFIED_QUOTE);
    expect(r.ticks).toBeUndefined();
    expect(r.options).toBeUndefined();
    expect(r.greeks).toBeUndefined();
    expect(r.depth).toBeUndefined();
    expect(r.orderFlow).toBeUndefined();
  });

  it("unresolved source + candles → bars HISTORICAL, quotes ungraded, else silent", () => {
    const r = selectPerCapabilityFidelity({
      source: "unavailable", connected: false, hasCandles: true,
    });
    expect(r.bars).toBe(L.HISTORICAL_BARS_VERIFIED);
    expect(r.quotes).toBeUndefined();
    expect(r.ticks).toBeUndefined();
  });

  it("uncertified realtime provider → bars + quotes = ACTIVE_DEGRADED without inventing entitlement", () => {
    const r = selectPerCapabilityFidelity({
      source: "yahoo", connected: true, hasCandles: true,
      quoteObservation: {present: true},
    });
    expect(r.bars).toBe(L.ACTIVE_DEGRADED);
    expect(r.quotes).toBe(L.ACTIVE_DEGRADED);
  });

  it("tapeConnected=true keeps observed ticks visible without certifying them", () => {
    const r = selectPerCapabilityFidelity({
      source: "polygon", connected: true, hasCandles: true,
      tapeConnected: true,
    });
    expect(r.ticks).toBe(L.ACTIVE_DEGRADED);
  });

  it("tapeConnected=false → ticks STALE (caller tried and failed)", () => {
    const r = selectPerCapabilityFidelity({
      source: "polygon", connected: true, hasCandles: true,
      tapeConnected: false,
    });
    expect(r.ticks).toBe(L.STALE_PIPELINE);
  });

  it("tapeConnected undefined → ticks undefined (canon: silence, not fake unavailable)", () => {
    const r = selectPerCapabilityFidelity({
      source: "polygon", connected: true, hasCandles: true,
    });
    expect(r.ticks).toBeUndefined();
  });

  it("does not infer a depth entitlement wall from subscription=false", () => {
    const r = selectPerCapabilityFidelity({
      source: "polygon", connected: true, hasCandles: true,
      depthSubscribed: false,
    });
    expect(r.depth).toBeUndefined();
    const proven = selectPerCapabilityFidelity({
      source: "polygon", connected: true, hasCandles: true,
      depthSubscribed: false,
      depthEntitlementBlocked: true,
    });
    expect(proven.depth).toBe(L.BLOCKED_BY_ENTITLEMENT);
  });

  it("options require either live subscription or explicit provider entitlement proof", () => {
    const t = selectPerCapabilityFidelity({
      source: "polygon", connected: true, hasCandles: true,
      optionsSubscribed: true,
    });
    expect(t.options).toBe(L.LIVE_CERTIFIED_QUOTE);
    const f = selectPerCapabilityFidelity({
      source: "polygon", connected: true, hasCandles: true,
      optionsSubscribed: false,
    });
    expect(f.options).toBeUndefined();
    const proven = selectPerCapabilityFidelity({
      source: "polygon", connected: true, hasCandles: true,
      optionsSubscribed: false,
      optionsEntitlementBlocked: true,
    });
    expect(proven.options).toBe(L.BLOCKED_BY_ENTITLEMENT);
  });

  it("greeks require explicit entitlement proof before rendering blocked", () => {
    const t = selectPerCapabilityFidelity({
      source: "polygon", connected: true, hasCandles: true,
      greeksSubscribed: true,
    });
    expect(t.greeks).toBe(L.LIVE_CERTIFIED_QUOTE);
    const f = selectPerCapabilityFidelity({
      source: "polygon", connected: true, hasCandles: true,
      greeksSubscribed: false,
    });
    expect(f.greeks).toBeUndefined();
    const proven = selectPerCapabilityFidelity({
      source: "polygon", connected: true, hasCandles: true,
      greeksSubscribed: false,
      greeksEntitlementBlocked: true,
    });
    expect(proven.greeks).toBe(L.BLOCKED_BY_ENTITLEMENT);
  });

  it("derived flow cannot certify an uncertified tape boolean", () => {
    const r = selectPerCapabilityFidelity({
      source: "polygon", connected: true, hasCandles: true,
      tapeConnected: true,
      orderFlowDerived: true,
    });
    expect(r.orderFlow).toBe(L.ACTIVE_DEGRADED);
  });

  it.each(["yahoo", "unavailable", "alpaca", "webull"] as const)("does not certify a nonempty tape from %s without provenance", (source) => {
    for (const connected of [true, false]) {
      const r = selectPerCapabilityFidelity({source, connected, hasCandles: true,
        tapeConnected: true, orderFlowDerived: true});
      expect(r.ticks).toBe(L.ACTIVE_DEGRADED);
      expect(r.orderFlow).toBe(L.ACTIVE_DEGRADED);
      expect(r.ticks).not.toBe(L.BLOCKED_BY_ENTITLEMENT);
    }
  });

  it("orderFlowDerived=true but tapeConnected!=true → orderFlow ACTIVE_DEGRADED (canon: name actual condition)", () => {
    const r = selectPerCapabilityFidelity({
      source: "polygon", connected: true, hasCandles: true,
      orderFlowDerived: true,
      // tapeConnected omitted
    });
    expect(r.orderFlow).toBe(L.ACTIVE_DEGRADED);
  });

  it("orderFlowDerived omitted → orderFlow undefined (silent)", () => {
    const r = selectPerCapabilityFidelity({
      source: "polygon", connected: true, hasCandles: true,
      tapeConnected: true,
    });
    expect(r.orderFlow).toBeUndefined();
  });

  it("canon §no-silent-override — legacy source label does NOT leak into options / greeks / depth", () => {
    const r = selectPerCapabilityFidelity({
      source: "yahoo", connected: true, hasCandles: true, // delayed by entitlement
    });
    // options / greeks / depth should NOT inherit DELAYED — caller
    // didn't signal them at all. Canon: no silent override.
    expect(r.options).toBeUndefined();
    expect(r.greeks).toBeUndefined();
    expect(r.depth).toBeUndefined();
  });
});

// Founder-observed 2026-09-05 (Saturday): /charts printed ACTIVE DEGRADED
// across the chrome while the market was closed. Closure now outranks the
// provider verdict for the market-data capabilities.
describe("selectPerCapabilityFidelity — closed-session precedence", () => {
  it("sessionOpen=false makes bars AND quotes read SESSION CLOSED — LAST VERIFIED", () => {
    const r = selectPerCapabilityFidelity({
      source: "yahoo", connected: true, hasCandles: true, sessionOpen: false,
      quoteObservation: {present: true},
    });
    expect(r.bars).toBe(L.SESSION_CLOSED_LAST_VERIFIED);
    expect(r.quotes).toBe(L.SESSION_CLOSED_LAST_VERIFIED);
  });

  it("closure outranks a certified realtime provider — no LIVE on a closed session (§8)", () => {
    const r = selectPerCapabilityFidelity({
      source: "polygon", connected: true, hasCandles: true, sessionOpen: false,
      quoteObservation: {present: true, fresh: true},
    });
    expect(r.bars).toBe(L.SESSION_CLOSED_LAST_VERIFIED);
    expect(r.quotes).toBe(L.SESSION_CLOSED_LAST_VERIFIED);
  });

  it("never prints SESSION CLOSED over a continuous crypto tape (mirror-image bug)", () => {
    for (const source of ["binance", "coinbase"] as const) {
      const r = selectPerCapabilityFidelity({
        source, connected: true, hasCandles: true, sessionOpen: false,
        quoteObservation: {present: true, fresh: true},
      });
      expect(r.bars).toBe(L.ACTIVE_DEGRADED);
      expect(r.quotes).toBe(L.LIVE_CERTIFIED_QUOTE);
    }
  });

  it("undefined / null / true sessionOpen leave the provider verdict untouched", () => {
    const base = { source: "yahoo" as const, connected: true, hasCandles: true };
    const reference = selectPerCapabilityFidelity(base);
    for (const sessionOpen of [undefined, null, true]) {
      expect(selectPerCapabilityFidelity({ ...base, sessionOpen })).toEqual(reference);
    }
  });

  it("closure does NOT bleed into ticks / depth / options / greeks — they keep their own owners", () => {
    const r = selectPerCapabilityFidelity({
      source: "yahoo", connected: true, hasCandles: true, sessionOpen: false,
      tapeConnected: true, depthSubscribed: true,
    });
    expect(r.ticks).toBe(L.ACTIVE_DEGRADED);
    expect(r.depth).toBe(L.LIVE_CERTIFIED_QUOTE);
    expect(r.options).toBeUndefined();
    expect(r.greeks).toBeUndefined();
  });
});
