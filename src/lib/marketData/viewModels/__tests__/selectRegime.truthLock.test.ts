/**
 * selectRegime — truth-lock supplement.
 *
 * Existing selectRegime.test.ts covers 9 primary verdict cases. This
 * supplement locks:
 *   - DEFAULT_REGIME_MATCHERS synonym coverage (trending/trendup/trenddown,
 *     ranging, rotation vs meanreversion, compressed/quiet, elevated/expansion,
 *     shock/extreme/spike)
 *   - minHistoryDepth override (custom threshold honored)
 *   - ROTATION → BALANCE verdict path (existing only covers "balance")
 *   - BALANCE with volatility="normal" (existing only covers "low")
 *   - Confidence propagation from source dimension
 *   - Evidence array merged from both regime + volatility dimensions
 *   - narrative naming both dimensions in PARTIAL fallback
 *   - TREND rejected when volatility=low (must be non-low)
 *   - COMPRESSION requires monotonically non-increasing AND ending low
 *
 * Silent drift here silently changes every /command-deck regime tile.
 */

import { describe, it, expect } from "vitest";
import { selectRegime, DEFAULT_REGIME_MATCHERS } from "../selectRegime";
import type { CanonicalMarketState, MarketStateDimension } from "../../canonicalMarketState";

const dim = (value: string | null, resolution: MarketStateDimension["resolution"] = "RESOLVED"): MarketStateDimension => ({
  resolution,
  value,
  confidence: 0.8,
  evidence: [{ eventId: "e", observedAt: 1, availableAt: 2, source: "test", fidelity: "OBSERVED", basis: "test" }],
  contradictions: [],
  unknowns: [],
});
const UNK: MarketStateDimension = { resolution: "UNKNOWN", value: null, confidence: null, evidence: [], contradictions: [], unknowns: [] };

const mkState = (over: Partial<CanonicalMarketState> = {}): CanonicalMarketState => ({
  schemaVersion: "wm.market-state.v1",
  snapshotId: "s1",
  capturedAt: 1_800_000_000_000,
  instrumentId: "TSLA:NASDAQ",
  normalizedSymbol: "TSLA",
  executableIdentity: null,
  assetClass: "equity",
  exchange: "NASDAQ",
  session: "REGULAR",
  timeframeContext: ["15m"],
  price: { last: 100, bid: null, ask: null, eventAt: 1_800_000_000_000 },
  qualityState: "LIVE",
  qualityStateEvidence: [],
  freshnessMs: 100,
  coverage: [],
  direction: UNK, location: UNK, aggression: UNK,
  regime: UNK, structure: UNK, volatility: UNK, profile: UNK, orderFlow: UNK,
  contradictions: [], unknowns: [],
  ...over,
} as unknown as CanonicalMarketState);

describe("DEFAULT_REGIME_MATCHERS — synonym coverage", () => {
  it("regimeTrend accepts trend / trending / trendup / trenddown (all lowercased, stripped)", () => {
    for (const v of ["trend", "trending", "trend-up", "TREND_DOWN", "Trending"]) {
      expect(DEFAULT_REGIME_MATCHERS.regimeTrend.matches(dim(v))).toBe(true);
    }
  });
  it("regimeBalance accepts balance / balanced / range / ranging", () => {
    for (const v of ["balance", "BALANCED", "range", "Ranging"]) {
      expect(DEFAULT_REGIME_MATCHERS.regimeBalance.matches(dim(v))).toBe(true);
    }
  });
  it("regimeRotation accepts rotation / rotating / meanreversion", () => {
    for (const v of ["rotation", "ROTATING", "mean-reversion", "meanreversion"]) {
      expect(DEFAULT_REGIME_MATCHERS.regimeRotation.matches(dim(v))).toBe(true);
    }
  });
  it("volatilityLow accepts low / compressed / quiet", () => {
    for (const v of ["low", "COMPRESSED", "quiet"]) {
      expect(DEFAULT_REGIME_MATCHERS.volatilityLow.matches(dim(v))).toBe(true);
    }
  });
  it("volatilityHigh accepts high / elevated / expansion", () => {
    for (const v of ["high", "ELEVATED", "expansion"]) {
      expect(DEFAULT_REGIME_MATCHERS.volatilityHigh.matches(dim(v))).toBe(true);
    }
  });
  it("volatilityShock accepts shock / extreme / spike", () => {
    for (const v of ["shock", "EXTREME", "spike"]) {
      expect(DEFAULT_REGIME_MATCHERS.volatilityShock.matches(dim(v))).toBe(true);
    }
  });
  it("all matchers reject UNKNOWN dimension resolution", () => {
    expect(DEFAULT_REGIME_MATCHERS.regimeTrend.matches(UNK)).toBe(false);
    expect(DEFAULT_REGIME_MATCHERS.volatilityShock.matches(UNK)).toBe(false);
  });
});

describe("selectRegime — verdict paths (supplemental)", () => {
  it("BALANCE via ROTATION regime + normal volatility", () => {
    const r = selectRegime({ state: mkState({ regime: dim("rotation"), volatility: dim("normal") }) });
    expect(r.verdict).toBe("BALANCE");
  });

  it("BALANCE via BALANCE regime + NORMAL volatility (existing only covers low)", () => {
    const r = selectRegime({ state: mkState({ regime: dim("balance"), volatility: dim("normal") }) });
    expect(r.verdict).toBe("BALANCE");
  });

  it("TREND rejected when volatility explicitly LOW (must be non-low)", () => {
    // regime=trend, volatility=low → BALANCE rule doesn't match (regime not balance)
    // TREND rule fails on low check → falls to PARTIAL
    const r = selectRegime({ state: mkState({ regime: dim("trend"), volatility: dim("low") }) });
    expect(r.verdict).not.toBe("TREND");
    expect(r.resolution).toBe("PARTIAL");
  });

  it("EXPANSION dominates even over history-driven TRANSITION", () => {
    // volatility=shock AND regime flipped in history → shock wins
    const now = mkState({ regime: dim("balance"), volatility: dim("shock") });
    const hist = [
      mkState({ regime: dim("trend"), capturedAt: 1_800_000_000_000 - 3000 }),
      mkState({ regime: dim("balance"), capturedAt: 1_800_000_000_000 - 1000 }),
    ];
    const r = selectRegime({ state: now, history: hist });
    expect(r.verdict).toBe("EXPANSION");
  });

  it("PARTIAL when regime resolved to unknown vocabulary + volatility unresolved", () => {
    const r = selectRegime({ state: mkState({ regime: dim("mysterious") }) });
    expect(r.verdict).toBe("UNKNOWN");
    expect(r.resolution).toBe("PARTIAL");
    expect(r.narrative).toContain("mysterious");
    expect(r.narrative).toContain("unresolved");
  });
});

describe("selectRegime — minHistoryDepth override", () => {
  it("with minHistoryDepth=2, TRANSITION triggers on 2 differing snapshots", () => {
    const now = mkState({ regime: dim("trend"), volatility: dim("high") });
    const hist = [
      mkState({ regime: dim("balance"), capturedAt: 1_800_000_000_000 - 2000 }),
      mkState({ regime: dim("trend"),   capturedAt: 1_800_000_000_000 - 1000 }),
    ];
    const r = selectRegime({ state: now, history: hist, minHistoryDepth: 2 });
    expect(r.verdict).toBe("TRANSITION");
  });

  it("with minHistoryDepth=5, 3-snapshot history is insufficient for TRANSITION", () => {
    const now = mkState({ regime: dim("trend"), volatility: dim("high") });
    const hist = [
      mkState({ regime: dim("balance"), capturedAt: 1_800_000_000_000 - 3000 }),
      mkState({ regime: dim("trend"),   capturedAt: 1_800_000_000_000 - 2000 }),
      mkState({ regime: dim("balance"), capturedAt: 1_800_000_000_000 - 1000 }),
    ];
    const r = selectRegime({ state: now, history: hist, minHistoryDepth: 5 });
    // Falls through to TREND (regime=trend + volatility=high)
    expect(r.verdict).toBe("TREND");
  });
});

describe("selectRegime — evidence + confidence propagation", () => {
  it("evidence merges from BOTH regime + volatility source dimensions", () => {
    const r = selectRegime({ state: mkState({ regime: dim("trend"), volatility: dim("high") }) });
    expect(r.evidence).toHaveLength(2); // one from each dim
  });

  it("TREND verdict propagates regime.confidence", () => {
    const regime = { ...dim("trend"), confidence: 0.73 };
    const r = selectRegime({ state: mkState({ regime, volatility: dim("high") }) });
    expect(r.confidence).toBe(0.73);
  });

  it("EXPANSION verdict propagates volatility.confidence (not regime)", () => {
    const volatility = { ...dim("shock"), confidence: 0.91 };
    const r = selectRegime({ state: mkState({ regime: dim("balance"), volatility }) });
    expect(r.confidence).toBe(0.91);
  });

  it("UNKNOWN (all-unresolved) has null confidence", () => {
    const r = selectRegime({ state: mkState() });
    expect(r.confidence).toBeNull();
  });
});

describe("selectRegime — COMPRESSION edge cases", () => {
  it("COMPRESSION requires final volatility to be LOW (not just decreasing)", () => {
    // Trend is high→normal→normal — ends normal (rank 2), needs to end low (rank 1)
    const now = mkState({ regime: dim("balance"), volatility: dim("normal") });
    const hist = [
      mkState({ volatility: dim("high"),   capturedAt: 1_800_000_000_000 - 3000 }),
      mkState({ volatility: dim("normal"), capturedAt: 1_800_000_000_000 - 2000 }),
      mkState({ volatility: dim("normal"), capturedAt: 1_800_000_000_000 - 1000 }),
    ];
    const r = selectRegime({ state: now, history: hist });
    expect(r.verdict).not.toBe("COMPRESSION");
    // Should fall to BALANCE (regime=balance + volatility=normal)
    expect(r.verdict).toBe("BALANCE");
  });

  it("COMPRESSION rejected when volatility RISES in the middle (not monotonic)", () => {
    // low→high→low is non-monotonic
    const now = mkState({ regime: dim("balance"), volatility: dim("low") });
    const hist = [
      mkState({ volatility: dim("low"),  capturedAt: 1_800_000_000_000 - 3000 }),
      mkState({ volatility: dim("high"), capturedAt: 1_800_000_000_000 - 2000 }),
      mkState({ volatility: dim("low"),  capturedAt: 1_800_000_000_000 - 1000 }),
    ];
    const r = selectRegime({ state: now, history: hist });
    expect(r.verdict).not.toBe("COMPRESSION");
  });
});
