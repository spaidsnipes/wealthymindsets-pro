/**
 * Focused regression tests for the F1+F2+F3 correction described in
 * docs/operations/P0_PROVIDER_LIVE_TRACE_2026-08-12.md §"Exact bounded corrections".
 *
 * F1 — seed `lastPx` from REST at proxy connect so the first trade can be
 *      tick-inferred instead of always UNKNOWN.
 * F2 — ingest UNKNOWN-aggressor trades as OBSERVED (with confidence 0)
 *      instead of dropping them at the ingest gate.
 * F3 — separate transport CONNECTED (WebSocket open OR first bytes) from
 *      symbol OBSERVING (an actual trade for that symbol was received).
 *
 * These tests target the observed contract, not any specific implementation
 * shape. They will require the `useWebSocket` implementation to expose small
 * hooks/adapters that the tests can drive without a real network. When the
 * F1+F2+F3 patch lands, this file becomes runnable; today it's a spec.
 */
import { describe, it, expect } from "vitest";
import { normalizeAlpacaRelayTrade } from "@/lib/marketData/adapters/alpacaRelay";
import { ingestSessionNectarEvent, getSessionNectarSnapshot } from "@/lib/marketData/sessionNectar";

// Helpers — construct raw Alpaca IEX relay payloads matching the live proxy shape
const makeTrade = (opts: { symbol: string; price: number; size?: number; sequenceId?: number; ts?: string }) => ({
  T: "t",
  S: opts.symbol,
  i: opts.sequenceId ?? Math.floor(Math.random() * 1e9),
  x: "V",
  p: opts.price,
  s: opts.size ?? 100,
  c: ["@"],
  z: "C",
  t: opts.ts ?? new Date().toISOString(),
});

const RECEIVED_AT = 1_800_000_000_000;

describe("F1 — lastPx seeded from REST at proxy connect", () => {
  it("first trade after REST seed produces valid BUY or SELL, never UNKNOWN when tick differs from seed", () => {
    const restSeedPx = 100.0;
    const trade = makeTrade({ symbol: "TSLA", price: 100.05 });
    const event = normalizeAlpacaRelayTrade(trade, "TSLA", restSeedPx, RECEIVED_AT);
    expect(event).not.toBeNull();
    expect(event!.aggressorSide).toBe("BUY"); // 100.05 > 100.00
  });

  it("first trade at seed price is UNKNOWN (correct — no tick differential)", () => {
    const restSeedPx = 100.0;
    const trade = makeTrade({ symbol: "TSLA", price: 100.0 });
    const event = normalizeAlpacaRelayTrade(trade, "TSLA", restSeedPx, RECEIVED_AT);
    expect(event).not.toBeNull();
    expect(event!.aggressorSide).toBe("UNKNOWN");
    expect(event!.aggressorConfidence).toBe(0);
  });
});

describe("F2 — UNKNOWN-aggressor trades are INGESTED into Nectar (not dropped)", () => {
  it("a valid trade with UNKNOWN aggressor still reaches Nectar's observed count", () => {
    const before = getSessionNectarSnapshot("TSLA");
    const trade = makeTrade({ symbol: "TSLA", price: 100.0 });
    const event = normalizeAlpacaRelayTrade(trade, "TSLA", 100.0, RECEIVED_AT);
    // F2 doctrine: ingest regardless of UNKNOWN aggressor
    expect(event).not.toBeNull();
    ingestSessionNectarEvent(event!);
    const after = getSessionNectarSnapshot("TSLA");
    expect(after.observedEventCount).toBeGreaterThan(before?.observedEventCount ?? 0);
  });

  it("a run of same-price trades ingests each one (never silences the observation stream)", () => {
    const seed = 100.0;
    const before = getSessionNectarSnapshot("TSLA");
    for (let i = 0; i < 5; i++) {
      const trade = makeTrade({ symbol: "TSLA", price: seed, sequenceId: 1000 + i });
      const event = normalizeAlpacaRelayTrade(trade, "TSLA", seed, RECEIVED_AT + i * 10);
      expect(event).not.toBeNull();
      ingestSessionNectarEvent(event!);
    }
    const after = getSessionNectarSnapshot("TSLA");
    const delta = (after.observedEventCount ?? 0) - (before?.observedEventCount ?? 0);
    expect(delta).toBe(5);
  });

  it("Delta/CVD derivation MUST STILL exclude UNKNOWN — F2 does not corrupt signed indicators", () => {
    // Delta only accumulates signed trades. UNKNOWN aggressor is not a valid
    // side and must not silently contribute. This is the exact companion
    // rule enforced by the Cycle 11 doctrine matrix in
    // docs/operations/P0_PROVIDER_LIVE_TRACE_2026-08-12.md §Lane 3.
    const trade = makeTrade({ symbol: "TSLA", price: 100.0 });
    const event = normalizeAlpacaRelayTrade(trade, "TSLA", 100.0, RECEIVED_AT);
    expect(event!.aggressorSide).toBe("UNKNOWN");
    // Whatever computeDelta(events) implementation exists must drop this event
    // from the signed accumulator. Spec placeholder — wire to real impl when landed.
    // computeDelta([event]) === { buy: 0, sell: 0, unclassified: 1 }
  });
});

describe("F3 — TRANSPORT ≠ SYMBOL OBSERVATION ≠ CLASSIFICATION", () => {
  // These tests target the MarketFeedHub contract (Cycle 11 Lane 1). When the
  // hub lands, uncomment the imports and drive the observed states.
  it.skip("transport.state === CONNECTED fires on WebSocket open or subscription echo", () => {
    // pending MarketFeedHub v2 implementation
  });

  it.skip("symbolState[TSLA].status === OBSERVING requires an actual T:t trade, NOT the subscription echo", () => {
    // pending MarketFeedHub v2 implementation
  });

  it.skip("SPY trades flowing do NOT elevate TSLA symbolState from NO_EVENTS_YET", () => {
    // pending MarketFeedHub v2 implementation
    // Setup: subscribe to both, deliver only SPY events, assert TSLA stays NO_EVENTS_YET
  });

  it.skip("channelState[TSLA].signedEventCount only increments on non-UNKNOWN aggressor", () => {
    // pending MarketFeedHub v2 implementation
    // Setup: deliver 5 TSLA trades — 3 tick-differentiated, 2 same-price. Assert:
    //   symbolState.observedEventCount === 5
    //   channelState.signedEventCount === 3
  });
});
