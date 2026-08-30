/**
 * selectDLAR — M26 truth-lock.
 *
 * Founder doctrine (2026-08-13):
 *   DIRECTION × LOCATION × AGGRESSION × RESPONSE.
 *   "AGGRESSION WITHOUT RESPONSE can be more important than aggression alone."
 *
 * DLAR is WM's most reusable explanatory lens — it feeds Story, Trade
 * Expectation, Decision Memory, Auction Destination, Absorption, and
 * every "Market Reality" surface. Silent drift here silently changes
 * every downstream compiler's response verdict.
 *
 * Locks:
 *   - Response verdict matrix (ABSORBED / RESPONDING / FADING / QUIET / UNKNOWN)
 *   - ATR gating (no ATR → response UNKNOWN)
 *   - History length gating (< 2 snapshots → response UNKNOWN)
 *   - Overall resolution aggregation (RESOLVED/PARTIAL/UNKNOWN)
 *   - Narrative fragments respect resolution state (no fabricated tokens)
 *   - Custom matchers override defaults
 *   - Absorbed threshold override (default 0.2) honored
 */

import { describe, it, expect } from "vitest";
import { selectDLAR, DEFAULT_DLAR_MATCHERS } from "./selectDLAR";
import type { CanonicalMarketState, MarketStateDimension } from "../canonicalMarketState";

function resolved(value: string): MarketStateDimension {
  return {
    resolution: "RESOLVED",
    value,
    confidence: 0.9,
    evidence: [
      { eventId: "e", observedAt: 1, availableAt: 2, source: "test", fidelity: "OBSERVED", basis: "test" },
    ],
    contradictions: [],
    unknowns: [],
  };
}

function unknown(): MarketStateDimension {
  return {
    resolution: "UNKNOWN",
    value: null,
    confidence: null,
    evidence: [],
    contradictions: [],
    unknowns: ["fixture"],
  };
}

function stateAt(lastPrice: number, over: Partial<Record<keyof CanonicalMarketState, MarketStateDimension>> = {}): CanonicalMarketState {
  return {
    schemaVersion: "wm.market-state.v1",
    sealed: true,
    snapshotId: "dlar:fixture",
    capturedAt: 1_800_000_000_000,
    availableAt: 1_800_000_000_000,
    instrumentId: "TSLA",
    normalizedSymbol: "TSLA",
    executableIdentity: "TSLA",
    assetClass: "equity",
    exchange: null,
    session: "RTH",
    timeframeContext: ["5m"],
    qualityState: "LIVE",
    price: { last: lastPrice, bid: null, ask: null, eventAt: 1, availableAt: 2 },
    coverage: [],
    direction: unknown(),
    location: unknown(),
    aggression: unknown(),
    regime: unknown(),
    structure: unknown(),
    volatility: unknown(),
    profile: unknown(),
    orderFlow: unknown(),
    contradictions: [],
    unknowns: [],
    ...over,
  } as CanonicalMarketState;
}

describe("selectDLAR — response verdict UNKNOWN gates", () => {
  it("no atrExtractor → response UNKNOWN with 'ATR unresolved' reason", () => {
    const vm = selectDLAR({ state: stateAt(100) });
    expect(vm.response.verdict).toBe("UNKNOWN");
    expect(vm.response.reason).toMatch(/ATR unresolved/i);
    expect(vm.response.contradictions).toContain("No ATR basis for response measurement");
  });

  it("atrExtractor returning null → same UNKNOWN + ATR-unresolved path", () => {
    const vm = selectDLAR({ state: stateAt(100), atrExtractor: () => null });
    expect(vm.response.verdict).toBe("UNKNOWN");
    expect(vm.response.reason).toMatch(/ATR unresolved/i);
  });

  it("atrExtractor returning 0 or negative → UNKNOWN (guard against zero-normalized division)", () => {
    expect(selectDLAR({ state: stateAt(100), atrExtractor: () => 0 }).response.verdict).toBe("UNKNOWN");
    expect(selectDLAR({ state: stateAt(100), atrExtractor: () => -1 }).response.verdict).toBe("UNKNOWN");
  });

  it("empty history → 'Insufficient price history' reason", () => {
    const vm = selectDLAR({ state: stateAt(100), atrExtractor: () => 1 });
    expect(vm.response.verdict).toBe("UNKNOWN");
    expect(vm.response.reason).toMatch(/Insufficient price history \(0 of 3/i);
  });

  it("1-snapshot history → still insufficient (need at least 2)", () => {
    const vm = selectDLAR({
      state: stateAt(100),
      history: [stateAt(99)],
      atrExtractor: () => 1,
    });
    expect(vm.response.verdict).toBe("UNKNOWN");
    expect(vm.response.reason).toMatch(/Insufficient price history \(1 of 3/i);
  });

  it("aggression UNRESOLVED but ATR + history OK → UNKNOWN with 'Aggression unresolved' reason", () => {
    const vm = selectDLAR({
      state: stateAt(105, { direction: resolved("LONG") }),
      history: [stateAt(100), stateAt(102)],
      atrExtractor: () => 1,
    });
    expect(vm.response.verdict).toBe("UNKNOWN");
    expect(vm.response.reason).toMatch(/Aggression unresolved/i);
  });
});

describe("selectDLAR — response = ABSORBED (high aggression, low displacement)", () => {
  it("high aggression + displacement < absorbedThreshold → ABSORBED", () => {
    // start=100, end=100.1 → displacement 0.1; atr=1 → ratio 0.1 < 0.2
    const vm = selectDLAR({
      state: stateAt(100.1, {
        aggression: resolved("HIGH"),
        direction: resolved("LONG"),
      }),
      history: [stateAt(100), stateAt(100.05), stateAt(100.1)],
      atrExtractor: () => 1,
    });
    expect(vm.response.verdict).toBe("ABSORBED");
    expect(vm.response.resolution).toBe("RESOLVED");
    expect(vm.response.reason).toMatch(/pressure is not producing progress/i);
    expect(vm.response.displacementRatio).toBeCloseTo(0.1, 4);
  });

  it("absorbedThreshold override raises the bar", () => {
    // displacement 0.3, threshold 0.5 → 0.3 < 0.5 → ABSORBED (would be RESPONDING at default 0.2)
    const vm = selectDLAR({
      state: stateAt(100.3, {
        aggression: resolved("HIGH"),
        direction: resolved("LONG"),
      }),
      history: [stateAt(100), stateAt(100.3)],
      atrExtractor: () => 1,
      absorbedThreshold: 0.5,
    });
    expect(vm.response.verdict).toBe("ABSORBED");
  });
});

describe("selectDLAR — response = RESPONDING (high aggression, matching direction)", () => {
  it("high aggression + upward displacement + LONG direction → RESPONDING", () => {
    const vm = selectDLAR({
      state: stateAt(103, {
        aggression: resolved("HIGH"),
        direction: resolved("LONG"),
      }),
      history: [stateAt(100), stateAt(102)],
      atrExtractor: () => 1,
    });
    expect(vm.response.verdict).toBe("RESPONDING");
    expect(vm.response.resolution).toBe("RESOLVED");
    expect(vm.response.reason).toMatch(/producing.*ATR displacement/i);
  });

  it("high aggression + downward displacement + SHORT direction → RESPONDING", () => {
    const vm = selectDLAR({
      state: stateAt(97, {
        aggression: resolved("HIGH"),
        direction: resolved("BEAR_TREND"),
      }),
      history: [stateAt(100), stateAt(98)],
      atrExtractor: () => 1,
    });
    expect(vm.response.verdict).toBe("RESPONDING");
  });
});

describe("selectDLAR — response = FADING (high aggression, direction contradicts)", () => {
  it("high aggression + upward displacement + SHORT direction → FADING", () => {
    const vm = selectDLAR({
      state: stateAt(103, {
        aggression: resolved("HIGH"),
        direction: resolved("SHORT"),
      }),
      history: [stateAt(100), stateAt(102)],
      atrExtractor: () => 1,
    });
    expect(vm.response.verdict).toBe("FADING");
    expect(vm.response.resolution).toBe("RESOLVED");
    expect(vm.response.reason).toMatch(/moving against the stated direction/i);
    expect(vm.response.contradictions).toContain("Price direction contradicts auction direction");
  });
});

describe("selectDLAR — response = RESPONDING (partial: direction unresolved)", () => {
  it("high aggression + displacement present + direction UNRESOLVED → RESPONDING but PARTIAL", () => {
    const vm = selectDLAR({
      state: stateAt(103, {
        aggression: resolved("HIGH"),
        // direction: default unknown
      }),
      history: [stateAt(100), stateAt(102)],
      atrExtractor: () => 1,
    });
    expect(vm.response.verdict).toBe("RESPONDING");
    expect(vm.response.resolution).toBe("PARTIAL");
    expect(vm.response.reason).toMatch(/direction unresolved so its sign cannot be judged/i);
  });
});

describe("selectDLAR — response = QUIET (low aggression, low displacement)", () => {
  it("low aggression + displacement < threshold → QUIET", () => {
    const vm = selectDLAR({
      state: stateAt(100.05, {
        aggression: resolved("LOW"),
        direction: resolved("LONG"),
      }),
      history: [stateAt(100), stateAt(100.05)],
      atrExtractor: () => 1,
    });
    expect(vm.response.verdict).toBe("QUIET");
    expect(vm.response.resolution).toBe("RESOLVED");
    expect(vm.response.reason).toMatch(/no participation to read/i);
  });
});

describe("selectDLAR — resolution aggregation (all 4 dimensions)", () => {
  it("all 4 RESOLVED → overall RESOLVED", () => {
    const vm = selectDLAR({
      state: stateAt(103, {
        direction: resolved("LONG"),
        location: resolved("VAL"),
        aggression: resolved("HIGH"),
      }),
      history: [stateAt(100), stateAt(102)],
      atrExtractor: () => 1,
    });
    expect(vm.resolution).toBe("RESOLVED");
  });

  it("zero RESOLVED → overall UNKNOWN", () => {
    const vm = selectDLAR({ state: stateAt(100) });
    expect(vm.resolution).toBe("UNKNOWN");
  });

  it("some RESOLVED → overall PARTIAL", () => {
    const vm = selectDLAR({
      state: stateAt(100, { direction: resolved("LONG") }),
    });
    expect(vm.resolution).toBe("PARTIAL");
  });
});

describe("selectDLAR — narrative", () => {
  it("all-unresolved narrative names the empty state (no fabricated tokens)", () => {
    const vm = selectDLAR({ state: stateAt(100) });
    expect(vm.narrative).toMatch(/Market state cannot be resolved/i);
  });

  it("resolved dimensions appear verbatim; unresolved dimensions say 'unresolved'", () => {
    const vm = selectDLAR({
      state: stateAt(103, {
        direction: resolved("LONG"),
        aggression: resolved("HIGH"),
        // location default unknown
      }),
      history: [stateAt(100), stateAt(102)],
      atrExtractor: () => 1,
    });
    expect(vm.narrative).toContain("Auction leaning LONG");
    expect(vm.narrative).toContain("location unresolved");
    expect(vm.narrative).toContain("HIGH aggression");
    expect(vm.narrative).toContain("responding");
  });
});

describe("selectDLAR — custom matchers", () => {
  it("caller can override the aggressionHigh matcher (custom vocabulary)", () => {
    // Default matcher accepts "high"; a custom matcher forces our word choice.
    const vm = selectDLAR({
      state: stateAt(103, {
        aggression: resolved("HIGH"), // default matcher would accept
      }),
      history: [stateAt(100), stateAt(102)],
      atrExtractor: () => 1,
      matchers: { aggressionHigh: { matches: () => false } }, // force no-high
    });
    // With aggression neither high nor low, falls into the "no clear pattern" bucket
    expect(vm.response.verdict).toBe("UNKNOWN");
    expect(vm.response.resolution).toBe("PARTIAL");
  });

  it("DEFAULT_DLAR_MATCHERS accepts common synonyms case-insensitively", () => {
    expect(DEFAULT_DLAR_MATCHERS.aggressionHigh.matches(resolved("elevated"))).toBe(true);
    expect(DEFAULT_DLAR_MATCHERS.aggressionHigh.matches(resolved("STRONG"))).toBe(true);
    expect(DEFAULT_DLAR_MATCHERS.aggressionLow.matches(resolved("weak"))).toBe(true);
    expect(DEFAULT_DLAR_MATCHERS.locationAtValueEdge.matches(resolved("VAH"))).toBe(true);
    expect(DEFAULT_DLAR_MATCHERS.locationInsideValue.matches(resolved("POC"))).toBe(true);
  });

  it("DEFAULT matchers reject unresolved dimensions", () => {
    expect(DEFAULT_DLAR_MATCHERS.aggressionHigh.matches(unknown())).toBe(false);
  });
});

describe("selectDLAR — capturedAt propagation (deterministic replay)", () => {
  it("capturedAt on the VM equals state.capturedAt", () => {
    const s = stateAt(100);
    const vm = selectDLAR({ state: s });
    expect(vm.capturedAt).toBe(s.capturedAt);
  });
});
