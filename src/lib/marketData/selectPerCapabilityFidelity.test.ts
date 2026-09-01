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
  it("live source + candles → bars LIVE, quotes LIVE, everything else undefined (silent)", () => {
    const r = selectPerCapabilityFidelity({
      source: "polygon", connected: true, hasCandles: true,
    });
    expect(r.bars).toBe(L.LIVE_CERTIFIED_QUOTE);
    expect(r.quotes).toBe(L.LIVE_CERTIFIED_QUOTE);
    expect(r.ticks).toBeUndefined();
    expect(r.options).toBeUndefined();
    expect(r.greeks).toBeUndefined();
    expect(r.depth).toBeUndefined();
    expect(r.orderFlow).toBeUndefined();
  });

  it("unresolved source + candles → bars HISTORICAL, quotes STALE, else silent", () => {
    const r = selectPerCapabilityFidelity({
      source: "unavailable", connected: false, hasCandles: true,
    });
    expect(r.bars).toBe(L.HISTORICAL_BARS_VERIFIED);
    expect(r.quotes).toBe(L.STALE_PIPELINE);
    expect(r.ticks).toBeUndefined();
  });

  it("uncertified realtime provider → bars + quotes = ACTIVE_DEGRADED without inventing entitlement", () => {
    const r = selectPerCapabilityFidelity({
      source: "yahoo", connected: true, hasCandles: true,
    });
    expect(r.bars).toBe(L.ACTIVE_DEGRADED);
    expect(r.quotes).toBe(L.ACTIVE_DEGRADED);
  });

  it("tapeConnected=true → ticks LIVE", () => {
    const r = selectPerCapabilityFidelity({
      source: "polygon", connected: true, hasCandles: true,
      tapeConnected: true,
    });
    expect(r.ticks).toBe(L.LIVE_CERTIFIED_QUOTE);
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

  it("orderFlowDerived=true + tapeConnected=true → orderFlow LIVE", () => {
    const r = selectPerCapabilityFidelity({
      source: "polygon", connected: true, hasCandles: true,
      tapeConnected: true,
      orderFlowDerived: true,
    });
    expect(r.orderFlow).toBe(L.LIVE_CERTIFIED_QUOTE);
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
