/**
 * selectChartCompanion — FL-04 News Chart Companion regression contract.
 *
 * What each test exists to prevent:
 *
 *  1. NO FABRICATION. With no compiled snapshot the panel names the
 *     absence AND its cause, and prints no number at all. A blank, a dash
 *     or a stale carry-over would each be a beautiful lie.
 *
 *  2. THE READING IS THE CHART'S. When a snapshot exists the price text
 *     comes from chartHeaderPriceFact verbatim — the Companion is a second
 *     CONSUMER of that owner, never a second opinion.
 *
 *  3. NO GUESSED CAMERA. timeframe === null suspends the panel. A
 *     hardcoded fallback would subscribe to a store key nothing writes and
 *     render a permanent, plausible, entirely false "no market state".
 *
 *  4. FRESHNESS IS EVIDENCE. `fresh` requires a timestamped trade inside
 *     the 30s window; observed-but-old and untimestamped both read false.
 *
 *  5. §7 MARKET CAMERA IMMORTALITY. The only way out is a href carrying
 *     symbol + timeframe. Nothing here mints a Decision_ID.
 */
import { describe, it, expect } from "vitest";
import {
  sealCanonicalMarketState,
  type CanonicalMarketState,
  type CanonicalMarketStateInput,
  type MarketStateDimension,
} from "../marketData/canonicalMarketState";
import {
  selectChartCompanion,
  companionMissingStateReason,
  COMPANION_FRESH_WINDOW_MS,
  type ChartCompanionInput,
} from "./selectChartCompanion";

const CAPTURED = 10_000;
const NOW = 1_000_000;

const unknown = (reason: string): MarketStateDimension => ({
  resolution: "UNKNOWN",
  value: null,
  confidence: null,
  evidence: [],
  contradictions: [],
  unknowns: [reason],
});

function state(overrides: Partial<CanonicalMarketStateInput> = {}): CanonicalMarketState {
  return sealCanonicalMarketState({
    snapshotId: "companion-snap-1",
    capturedAt: CAPTURED,
    availableAt: CAPTURED + 5,
    instrumentId: "BTC-USD",
    normalizedSymbol: "BTC",
    executableIdentity: "BTC-USD",
    assetClass: "crypto",
    exchange: "COINBASE",
    session: "24X7",
    timeframeContext: ["1h"],
    qualityState: "PARTIAL",
    price: {
      last: 81_927.5,
      bid: null,
      ask: null,
      eventAt: CAPTURED - 10,
      availableAt: CAPTURED - 5,
    },
    coverage: [],
    direction: unknown("Direction unresolved."),
    location: unknown("Location unresolved."),
    aggression: unknown("Aggression unresolved."),
    regime: unknown("Regime unresolved."),
    structure: unknown("Structure unresolved."),
    volatility: unknown("Volatility unresolved."),
    profile: unknown("Profile unresolved."),
    orderFlow: unknown("Order flow unresolved."),
    contradictions: [],
    unknowns: [],
    ...overrides,
  });
}

function input(overrides: Partial<ChartCompanionInput> = {}): ChartCompanionInput {
  return {
    symbol: "BTC",
    timeframe: "1h",
    state: null,
    tape: { trades: 0, lastTradeMs: null, cvdSpark: [] },
    nowMs: NOW,
    at: new Date("2026-09-19T18:00:00Z"),
    ...overrides,
  };
}

describe("selectChartCompanion (FL-04)", () => {
  it("names the absence, and its cause, instead of inventing a price", () => {
    const vm = selectChartCompanion(input());
    if (!vm.visible) throw new Error("expected a visible companion");

    expect(vm.price.kind).toBe("MISSING");
    if (vm.price.kind !== "MISSING") return;
    expect(vm.price.reason).toBe(companionMissingStateReason("BTC"));
    // The cause named is OUR STORE's lifetime, not the instrument's state.
    expect(vm.price.reason).toMatch(/compiler runs on the chart/i);
    // No number anywhere — an absence is not a reading.
    expect(vm.price.reason).not.toMatch(/\d+\.\d{2}/);
    expect(vm.spoken).not.toMatch(/\d+\.\d{2}/);
  });

  it("quotes the canonical price owner verbatim when a snapshot exists", () => {
    const vm = selectChartCompanion(input({ state: state() }));
    if (!vm.visible) throw new Error("expected a visible companion");

    expect(vm.price.kind).toBe("READING");
    if (vm.price.kind !== "READING") return;
    // chartHeaderPriceFact's own formatting — proof of delegation.
    expect(vm.price.fact.text).toContain("81927.50");
    expect(vm.price.fact.measured).toBe(true);
    expect(vm.spoken).toContain(vm.price.fact.text);
  });

  it("suspends entirely rather than guess a camera it has not read", () => {
    expect(selectChartCompanion(input({ timeframe: null })).visible).toBe(false);
    expect(selectChartCompanion(input({ timeframe: "  " })).visible).toBe(false);
    expect(selectChartCompanion(input({ symbol: "   " })).visible).toBe(false);
  });

  it("requires a timestamped trade inside the window to claim fresh", () => {
    const observedOld = selectChartCompanion(
      input({
        tape: { trades: 12, lastTradeMs: NOW - COMPANION_FRESH_WINDOW_MS - 1, cvdSpark: [] },
      }),
    );
    if (!observedOld.visible) throw new Error("expected visible");
    expect(observedOld.tapeObserved).toBe(true);
    expect(observedOld.fresh).toBe(false);
    expect(observedOld.spoken).toMatch(/none in the last 30 seconds/i);

    const untimestamped = selectChartCompanion(
      input({ tape: { trades: 12, lastTradeMs: null, cvdSpark: [] } }),
    );
    if (!untimestamped.visible) throw new Error("expected visible");
    expect(untimestamped.fresh).toBe(false);

    const live = selectChartCompanion(
      input({ tape: { trades: 12, lastTradeMs: NOW - 1_000, cvdSpark: [] } }),
    );
    if (!live.visible) throw new Error("expected visible");
    expect(live.fresh).toBe(true);
  });

  it("never reports observed tape when no trade has been seen", () => {
    const vm = selectChartCompanion(input());
    if (!vm.visible) throw new Error("expected visible");
    expect(vm.tapeObserved).toBe(false);
    expect(vm.tradeCount).toBe(0);
    expect(vm.fresh).toBe(false);
    expect(vm.spoken).toMatch(/no trades observed/i);
  });

  it("refuses to hand a single sample to a line renderer", () => {
    const one = selectChartCompanion(input({ tape: { trades: 1, lastTradeMs: NOW, cvdSpark: [4] } }));
    if (!one.visible) throw new Error("expected visible");
    expect(one.cvdSpark).toEqual([]);

    const two = selectChartCompanion(
      input({ tape: { trades: 2, lastTradeMs: NOW, cvdSpark: [4, 9] } }),
    );
    if (!two.visible) throw new Error("expected visible");
    expect(two.cvdSpark).toEqual([4, 9]);
  });

  it("carries the camera back to the chart and mints nothing (§7)", () => {
    const vm = selectChartCompanion(input({ symbol: "tsla", timeframe: "15m" }));
    if (!vm.visible) throw new Error("expected visible");
    expect(vm.symbol).toBe("TSLA");
    expect(vm.chartHref).toBe("/charts?symbol=TSLA&tf=15m");
    // No decision identifier may appear anywhere in the view model.
    expect(JSON.stringify(vm)).not.toMatch(/decision_id/i);
  });

  it("delegates the session token instead of deciding it", () => {
    const vm = selectChartCompanion(input());
    if (!vm.visible) throw new Error("expected visible");
    expect(vm.sessionToken.length).toBeGreaterThan(0);
    expect(vm.sessionDetail.length).toBeGreaterThan(0);
    expect(vm.spoken).toContain(`session ${vm.sessionToken}`);
  });
});
