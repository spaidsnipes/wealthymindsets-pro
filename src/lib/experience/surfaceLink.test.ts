import { describe, it, expect } from "vitest";
import {
  sealCanonicalMarketState,
  type CanonicalMarketState,
  type CanonicalMarketStateInput,
  type MarketStateDimension,
} from "../marketData/canonicalMarketState";
import type { OneStoryVM } from "../marketData/viewModels/selectOneStory";
import type {
  RightOfWay as CanonRightOfWay,
  RightOfWayReading,
  EvidenceDebt,
} from "../marketData/viewModels/decisionPermissionCompiler";
import { buildExperiencePacket, SURFACE_LINK_SCHEMA_VERSION } from "./surfaceLink";

const CAPTURED = 10_000;

const unknown = (reason: string): MarketStateDimension => ({
  resolution: "UNKNOWN",
  value: null,
  confidence: null,
  evidence: [],
  contradictions: [],
  unknowns: [reason],
});

const resolved = (value: string, contradictions: string[] = []): MarketStateDimension => ({
  resolution: "RESOLVED",
  value,
  confidence: 0.8,
  evidence: [
    {
      eventId: "ev-1",
      observedAt: CAPTURED - 20,
      availableAt: CAPTURED - 10,
      source: "coinbase",
      fidelity: "OBSERVED",
      basis: "executed trades",
    },
  ],
  contradictions,
  unknowns: [],
});

function state(overrides: Partial<CanonicalMarketStateInput> = {}): CanonicalMarketState {
  return sealCanonicalMarketState({
    snapshotId: "ms-1",
    capturedAt: CAPTURED,
    availableAt: CAPTURED + 5,
    instrumentId: "BTC-USD",
    normalizedSymbol: "BTC",
    executableIdentity: "BTC-USD",
    assetClass: "crypto",
    exchange: "COINBASE",
    session: "24X7",
    timeframeContext: ["5m", "1h"],
    qualityState: "PARTIAL",
    price: { last: 65_000, bid: null, ask: null, eventAt: CAPTURED - 10, availableAt: CAPTURED - 5 },
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

const reading = (value: CanonRightOfWay): RightOfWayReading => ({
  value,
  detail: "test",
  tone: value === "ACTION" ? "resolved" : value === "UNKNOWN" ? "unknown" : "pending",
});

function oneStory(overrides: Partial<OneStoryVM> = {}): OneStoryVM {
  return {
    primary: "Market is in balance around a fair-value zone.",
    contradiction: null,
    missing: null,
    decision: reading("WAIT"),
    debt: null,
    ...overrides,
  };
}

const debt = (missingLabels: string[]): EvidenceDebt => ({
  total: 8,
  resolved: 8 - missingLabels.length,
  missing: missingLabels.length,
  warn: 0,
  missingLabels,
  warnLabels: [],
});

describe("SurfaceLink — buildExperiencePacket (engine owns truth, SurfaceLink owns presentation)", () => {
  it("null story yields a fully UNKNOWN packet — never a fabricated story", () => {
    const p = buildExperiencePacket(null, null);
    expect(p.schemaVersion).toBe(SURFACE_LINK_SCHEMA_VERSION);
    expect(p.primaryStory).toBe("No market evidence yet.");
    expect(p.rightOfWay).toBe("UNKNOWN");
    expect(p.qualityState).toBe("UNKNOWN");
    expect(p.sourceSnapshotId).toBeNull();
    expect(p.visibleDepth).toBe(0);
    expect(p.relevantObjects).toEqual([]);
  });

  it("forwards the PRIMARY STORY verbatim from the canonical compiler — no re-derivation", () => {
    const p = buildExperiencePacket(
      oneStory({ primary: "Bullish continuation intact." }),
      state({ direction: resolved("ignored — SurfaceLink must not read this for truth") }),
    );
    expect(p.primaryStory).toBe("Bullish continuation intact.");
    expect(p.sourceSnapshotId).toBe("ms-1");
  });

  it("forwards the contradiction verbatim from the compiler", () => {
    const p = buildExperiencePacket(
      oneStory({ contradiction: "Price rejecting external resistance." }),
      state(),
    );
    expect(p.contradiction).toBe("Price rejecting external resistance.");
  });

  it("MISSING prefers the rich Evidence-Debt labels from the compiler", () => {
    const p = buildExperiencePacket(
      oneStory({ missing: "Location", debt: debt(["Location", "Aggression", "Order Flow"]) }),
      state(),
    );
    expect(p.missing).toEqual(["Location", "Aggression", "Order Flow"]);
  });

  it("MISSING falls back to the single compact phrase when no debt labels exist", () => {
    const p = buildExperiencePacket(oneStory({ missing: "Location", debt: null }), state());
    expect(p.missing).toEqual(["Location"]);
  });

  it("MISSING is empty when the compiler reports nothing missing", () => {
    const p = buildExperiencePacket(oneStory({ missing: null, debt: null }), state());
    expect(p.missing).toEqual([]);
  });

  it("right-of-way is forwarded faithfully — ACTION only when the compiler says ACTION", () => {
    expect(buildExperiencePacket(oneStory({ decision: reading("ACTION") }), state()).rightOfWay).toBe("ACTION");
    expect(buildExperiencePacket(oneStory({ decision: reading("WAIT") }), state()).rightOfWay).toBe("WAIT");
    expect(buildExperiencePacket(oneStory({ decision: reading("CAUTION") }), state()).rightOfWay).toBe("CAUTION");
    expect(buildExperiencePacket(oneStory({ decision: reading("UNKNOWN") }), state()).rightOfWay).toBe("UNKNOWN");
  });

  it("normalises 'NO TRADE' to the wire-friendly NO_TRADE without losing meaning", () => {
    const p = buildExperiencePacket(oneStory({ decision: reading("NO TRADE") }), state());
    expect(p.rightOfWay).toBe("NO_TRADE");
  });

  it("relevantObjects + visibleDepth are pure provenance reads of RESOLVED families", () => {
    const p = buildExperiencePacket(
      oneStory(),
      state({ direction: resolved("Bullish."), location: resolved("HTF support.") }),
    );
    expect(p.relevantObjects).toEqual(["Direction", "Location"]);
    expect(p.visibleDepth).toBe(2);
  });

  it("carries the canonical qualityState through honestly and uses the supplied lens question", () => {
    const p = buildExperiencePacket(oneStory(), state({ qualityState: "DELAYED" }), {
      question: "Is continuation healthy?",
    });
    expect(p.qualityState).toBe("DELAYED");
    expect(p.question).toBe("Is continuation healthy?");
  });

  it("a compiled story with a null sealed state still renders truthfully (quality UNKNOWN)", () => {
    const p = buildExperiencePacket(oneStory({ primary: "Balance." }), null);
    expect(p.primaryStory).toBe("Balance.");
    expect(p.qualityState).toBe("UNKNOWN");
    expect(p.relevantObjects).toEqual([]);
    expect(p.sourceSnapshotId).toBeNull();
  });
});
