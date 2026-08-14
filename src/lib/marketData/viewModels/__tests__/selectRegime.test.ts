import { describe, it, expect } from "vitest";
import { selectRegime, DEFAULT_REGIME_MATCHERS } from "../selectRegime";
import type { CanonicalMarketState, MarketStateDimension } from "../../canonicalMarketState";

const dim = (value: string | null, resolution: MarketStateDimension["resolution"] = "RESOLVED"): MarketStateDimension => ({
  resolution,
  value,
  confidence: 0.8,
  evidence: [],
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

describe("selectRegime", () => {
  it("UNKNOWN when both regime + volatility unresolved", () => {
    const r = selectRegime({ state: mkState() });
    expect(r.verdict).toBe("UNKNOWN");
    expect(r.resolution).toBe("UNKNOWN");
    expect(r.reason).toMatch(/verified evidence/i);
  });

  it("EXPANSION on volatility shock (dominates)", () => {
    const r = selectRegime({ state: mkState({ volatility: dim("shock"), regime: dim("balance") }) });
    expect(r.verdict).toBe("EXPANSION");
  });

  it("TREND when regime=trend + volatility non-low", () => {
    const r = selectRegime({ state: mkState({ regime: dim("trend"), volatility: dim("high") }) });
    expect(r.verdict).toBe("TREND");
  });

  it("BALANCE when regime=balance + volatility low", () => {
    const r = selectRegime({ state: mkState({ regime: dim("balance"), volatility: dim("low") }) });
    expect(r.verdict).toBe("BALANCE");
  });

  it("TRANSITION when regime value differs across recent history", () => {
    const now = mkState({ regime: dim("trend"), volatility: dim("high") });
    const hist = [
      mkState({ regime: dim("balance"), capturedAt: 1_800_000_000_000 - 3000 }),
      mkState({ regime: dim("balance"), capturedAt: 1_800_000_000_000 - 2000 }),
      mkState({ regime: dim("trend"),   capturedAt: 1_800_000_000_000 - 1000 }),
    ];
    const r = selectRegime({ state: now, history: hist });
    expect(r.verdict).toBe("TRANSITION");
    expect(r.contradictions.some(c => /not stable/i.test(c))).toBe(true);
  });

  it("COMPRESSION when volatility trends DOWN over history", () => {
    const now = mkState({ regime: dim("balance"), volatility: dim("low") });
    const hist = [
      mkState({ volatility: dim("high"), capturedAt: 1_800_000_000_000 - 3000 }),
      mkState({ volatility: dim("normal"), capturedAt: 1_800_000_000_000 - 2000 }),
      mkState({ volatility: dim("low"), capturedAt: 1_800_000_000_000 - 1000 }),
    ];
    const r = selectRegime({ state: now, history: hist });
    expect(r.verdict).toBe("COMPRESSION");
  });

  it("UNKNOWN PARTIAL when one dim resolved but no verdict pattern", () => {
    const r = selectRegime({ state: mkState({ regime: dim("uncategorized") }) });
    expect(r.verdict).toBe("UNKNOWN");
    expect(r.resolution).toBe("PARTIAL");
  });

  it("matchers are overridable — custom vocabulary works", () => {
    const r = selectRegime({
      state: mkState({ regime: dim("mode-a"), volatility: dim("mode-x") }),
      matchers: {
        regimeTrend: { matches: (d) => d.value === "mode-a" },
        volatilityHigh: { matches: (d) => d.value === "mode-x" },
      },
    });
    expect(r.verdict).toBe("TREND");
  });

  it("deterministic — capturedAt in output equals input capturedAt", () => {
    const s = mkState({ regime: dim("trend"), volatility: dim("high"), capturedAt: 12345 });
    const r = selectRegime({ state: s });
    expect(r.capturedAt).toBe(12345);
  });
});
