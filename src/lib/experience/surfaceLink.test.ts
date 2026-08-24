import { describe, it, expect } from "vitest";
import {
  sealCanonicalMarketState,
  type CanonicalMarketState,
  type CanonicalMarketStateInput,
  type MarketStateDimension,
} from "../marketData/canonicalMarketState";
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

describe("SurfaceLink — buildExperiencePacket (engine owns truth, SurfaceLink owns presentation)", () => {
  it("null state yields a fully UNKNOWN packet — never a fabricated story", () => {
    const p = buildExperiencePacket(null);
    expect(p.schemaVersion).toBe(SURFACE_LINK_SCHEMA_VERSION);
    expect(p.primaryStory).toBe("No market evidence yet.");
    expect(p.rightOfWay).toBe("UNKNOWN");
    expect(p.qualityState).toBe("UNKNOWN");
    expect(p.sourceSnapshotId).toBeNull();
    expect(p.visibleDepth).toBe(0);
    expect(p.relevantObjects).toEqual([]);
  });

  it("reads the PRIMARY STORY verbatim from the resolved Direction dimension", () => {
    const p = buildExperiencePacket(state({ direction: resolved("Bullish continuation intact.") }));
    expect(p.primaryStory).toBe("Bullish continuation intact.");
    expect(p.sourceSnapshotId).toBe("ms-1");
  });

  it("unresolved direction is stated honestly, not invented", () => {
    const p = buildExperiencePacket(state());
    expect(p.primaryStory).toBe("Market direction not yet resolved.");
  });

  it("MISSING names every unresolved evidence family (the Evidence Debt)", () => {
    const p = buildExperiencePacket(state({ direction: resolved("Bullish.") }));
    // direction resolved → not missing; the other 7 families remain missing.
    expect(p.missing).toContain("Location");
    expect(p.missing).toContain("Aggression");
    expect(p.missing).not.toContain("Direction");
  });

  it("relevantObjects + visibleDepth reflect only RESOLVED families", () => {
    const p = buildExperiencePacket(
      state({ direction: resolved("Bullish."), location: resolved("HTF support.") }),
    );
    expect(p.relevantObjects).toEqual(["Direction", "Location"]);
    expect(p.visibleDepth).toBe(2);
  });

  it("surfaces the strongest contradiction (top-level preferred over dimension)", () => {
    const p = buildExperiencePacket(
      state({
        direction: resolved("Bullish continuation.", ["Buyer efficiency weakening."]),
        contradictions: ["Price rejecting external resistance."],
      }),
    );
    expect(p.contradiction).toBe("Price rejecting external resistance.");
  });

  it("falls back to a dimension contradiction when there is no top-level one", () => {
    const p = buildExperiencePacket(
      state({ direction: resolved("Bullish.", ["Buyer efficiency weakening."]) }),
    );
    expect(p.contradiction).toBe("Buyer efficiency weakening.");
  });

  it("NEVER promotes to ACTION from raw market state — WAIT is the strongest self-derived verdict", () => {
    // Fully resolved, zero contradiction, zero missing — still only WAIT,
    // because ACTION belongs to the Decision Permission Compiler, not SurfaceLink.
    const allResolved = state({
      direction: resolved("Bullish."),
      location: resolved("HTF support."),
      structure: resolved("Higher low."),
      aggression: resolved("Buyers aggressive."),
      orderFlow: resolved("Positive delta."),
      regime: resolved("Trend."),
      profile: resolved("Value rising."),
      volatility: resolved("Expanding."),
    });
    const p = buildExperiencePacket(allResolved);
    expect(p.missing).toEqual([]);
    expect(p.rightOfWay).toBe("WAIT");
  });

  it("ACTION appears ONLY when an explicit permission verdict is supplied", () => {
    const p = buildExperiencePacket(state({ direction: resolved("Bullish.") }), {
      permission: "ACTION",
    });
    expect(p.rightOfWay).toBe("ACTION");
  });

  it("carries the canonical qualityState through honestly and uses the supplied lens question", () => {
    const p = buildExperiencePacket(state({ qualityState: "DELAYED" }), {
      question: "Is continuation healthy?",
    });
    expect(p.qualityState).toBe("DELAYED");
    expect(p.question).toBe("Is continuation healthy?");
  });
});
