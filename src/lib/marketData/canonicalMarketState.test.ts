import { describe, expect, it } from "vitest";
import {
  sealCanonicalMarketState,
  validateCanonicalMarketState,
  type CanonicalMarketStateInput,
  type MarketStateDimension,
} from "./canonicalMarketState";

const unknown = (reason: string): MarketStateDimension => ({
  resolution: "UNKNOWN",
  value: null,
  confidence: null,
  evidence: [],
  contradictions: [],
  unknowns: [reason],
});

const input = (overrides: Partial<CanonicalMarketStateInput> = {}): CanonicalMarketStateInput => ({
  snapshotId: "ms-btc-001",
  capturedAt: 10_000,
  availableAt: 10_005,
  instrumentId: "BTC-USD",
  normalizedSymbol: "BTC",
  executableIdentity: "BTC-USD",
  assetClass: "crypto",
  exchange: "COINBASE",
  session: "24X7",
  timeframeContext: ["5m", "1h"],
  qualityState: "PARTIAL",
  price: { last: 65_000, bid: null, ask: null, eventAt: 9_990, availableAt: 9_995 },
  coverage: [],
  direction: unknown("Direction engine not resolved."),
  location: unknown("Location engine not resolved."),
  aggression: unknown("Aggression engine not resolved."),
  regime: unknown("Regime engine not resolved."),
  structure: unknown("Structure engine not resolved."),
  volatility: unknown("Volatility engine not resolved."),
  profile: unknown("Profile engine not resolved."),
  orderFlow: unknown("Order-flow evidence unavailable."),
  contradictions: [],
  unknowns: ["Direction", "Location", "Aggression"],
  ...overrides,
});

describe("Canonical Market State", () => {
  it("seals a truthful partial snapshot without filling unknown dimensions", () => {
    const state = sealCanonicalMarketState(input());
    expect(state).toMatchObject({ schemaVersion: "wm.market-state.v1", sealed: true, qualityState: "PARTIAL" });
    expect(state.direction.value).toBeNull();
    expect(Object.isFrozen(state.direction)).toBe(true);
  });

  it("rejects resolved dimensions without evidence", () => {
    expect(validateCanonicalMarketState(input({
      direction: { resolution: "RESOLVED", value: "UP", confidence: 0.8, evidence: [], contradictions: [], unknowns: [] },
    })).join(" ")).toMatch(/requires a value and evidence/i);
  });

  it("rejects evidence that arrived after the snapshot cutoff", () => {
    expect(validateCanonicalMarketState(input({
      direction: {
        resolution: "RESOLVED",
        value: "UP",
        confidence: 0.8,
        evidence: [{
          eventId: "future-event",
          observedAt: 9_990,
          availableAt: 10_001,
          source: "canonical-event",
          fidelity: "OBSERVED",
          basis: "Arrived too late.",
        }],
        contradictions: [],
        unknowns: [],
      },
    })).join(" ")).toMatch(/unavailable at snapshot time/i);
  });

  it("rejects unknown dimensions that silently carry a persuasive value", () => {
    expect(validateCanonicalMarketState(input({
      direction: {
        resolution: "UNKNOWN",
        value: "UP",
        confidence: null,
        evidence: [],
        contradictions: [],
        unknowns: ["Direction evidence is incomplete."],
      },
    })).join(" ")).toMatch(/unknown requires no value/i);
  });

  it("does not allow a LIVE state without price evidence", () => {
    expect(validateCanonicalMarketState(input({
      qualityState: "LIVE",
      price: { last: null, bid: null, ask: null, eventAt: null, availableAt: null },
    }))).toContain("LIVE Market State requires price evidence.");
  });
});
