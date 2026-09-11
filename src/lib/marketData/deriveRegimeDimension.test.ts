/**
 * deriveRegimeDimension — LIVING-PIXEL LAW compliance tests.
 *
 * Regime is the dimension the /command-deck hero word hangs on, so these
 * tests lock three things: it never seals without both legs, it never mints
 * evidence it did not observe, and its vocabulary is exactly what
 * selectMarketStory's DEFAULT_MATCHERS can read.
 */

import { describe, it, expect } from "vitest";
import { deriveRegimeDimension, REGIME_RESOLVE_MIN_TRADES } from "./deriveRegimeDimension";
import { DEFAULT_MATCHERS } from "./viewModels/selectMarketStory";
import type { MarketStateDimension, MarketStateEvidenceRef } from "./canonicalMarketState";

const REF = (id: string): MarketStateEvidenceRef => ({
  eventId: id,
  observedAt: 1_900,
  availableAt: 2_000,
  source: "coinbase",
  fidelity: "DERIVED",
  basis: `basis ${id}`,
});

function dim(
  resolution: MarketStateDimension["resolution"],
  value: string | null,
  confidence: number | null,
  evidence: MarketStateEvidenceRef[] = [],
): MarketStateDimension {
  return { resolution, value, confidence, evidence, contradictions: [], unknowns: [] };
}

const UNKNOWN = dim("UNKNOWN", null, null);

describe("deriveRegimeDimension", () => {
  it("UNKNOWN in, UNKNOWN out — no tape behind either leg", () => {
    const r = deriveRegimeDimension({ direction: UNKNOWN, volatility: UNKNOWN, tradeCount: 0 });
    expect(r.resolution).toBe("UNKNOWN");
    expect(r.value).toBeNull();
    expect(r.evidence).toHaveLength(0);
  });

  it("refuses to seal without a sealed volatility leg", () => {
    const r = deriveRegimeDimension({
      direction: dim("RESOLVED", "UP", 0.75, [REF("d1")]),
      volatility: dim("PARTIAL", null, 0.35, [REF("v1")]),
      tradeCount: 40,
    });
    expect(r.resolution).toBe("PARTIAL");
    expect(r.value).toBeNull();
    expect(r.unknowns[0]).toContain("sealed volatility read");
  });

  it("refuses to seal on thin tape even when both legs claim to be resolved", () => {
    const r = deriveRegimeDimension({
      direction: dim("RESOLVED", "UP", 0.75, [REF("d1")]),
      volatility: dim("RESOLVED", "HIGH VOLATILITY", 0.55, [REF("v1")]),
      tradeCount: REGIME_RESOLVE_MIN_TRADES - 1,
    });
    expect(r.resolution).toBe("PARTIAL");
    expect(r.unknowns[0]).toContain(`${REGIME_RESOLVE_MIN_TRADES} classified trades`);
  });

  it("resolved direction on sealed range → TREND", () => {
    const r = deriveRegimeDimension({
      direction: dim("RESOLVED", "UP", 0.75, [REF("d1")]),
      volatility: dim("RESOLVED", "NORMAL VOLATILITY", 0.55, [REF("v1")]),
      tradeCount: 40,
    });
    expect(r.resolution).toBe("RESOLVED");
    expect(r.value).toBe("TREND");
  });

  it("two-sided tape on sealed range → BALANCE (a positive finding, not a shrug)", () => {
    const r = deriveRegimeDimension({
      direction: dim("PARTIAL", null, 0, [REF("d1")]),
      volatility: dim("RESOLVED", "LOW VOLATILITY", 0.55, [REF("v1")]),
      tradeCount: 40,
    });
    expect(r.resolution).toBe("RESOLVED");
    expect(r.value).toBe("BALANCE");
  });

  it("unknown direction with a sealed range does NOT become BALANCE by default", () => {
    const r = deriveRegimeDimension({
      direction: UNKNOWN,
      volatility: dim("RESOLVED", "LOW VOLATILITY", 0.55, [REF("v1")]),
      tradeCount: 40,
    });
    expect(r.resolution).toBe("PARTIAL");
    expect(r.value).toBeNull();
    expect(r.unknowns[0]).toContain("Direction is unresolved");
  });

  it("mints no evidence of its own — every ref traces to an input leg", () => {
    const direction = dim("RESOLVED", "UP", 0.75, [REF("d1")]);
    const volatility = dim("RESOLVED", "HIGH VOLATILITY", 0.55, [REF("v1")]);
    const r = deriveRegimeDimension({ direction, volatility, tradeCount: 40 });
    const inputIds = new Set([...direction.evidence, ...volatility.evidence].map((e) => e.eventId));
    expect(r.evidence).toHaveLength(2);
    for (const e of r.evidence) expect(inputIds.has(e.eventId)).toBe(true);
  });

  it("is never more confident than its least confident leg", () => {
    const r = deriveRegimeDimension({
      direction: dim("RESOLVED", "UP", 0.75, [REF("d1")]),
      volatility: dim("RESOLVED", "HIGH VOLATILITY", 0.35, [REF("v1")]),
      tradeCount: 40,
    });
    expect(r.confidence).toBe(0.35);
  });

  it("propagates contradictions from both legs rather than swallowing them", () => {
    const direction = { ...dim("RESOLVED", "UP", 0.75, [REF("d1")]), contradictions: ["d-bad"] };
    const volatility = { ...dim("RESOLVED", "HIGH VOLATILITY", 0.55, [REF("v1")]), contradictions: ["v-bad"] };
    const r = deriveRegimeDimension({ direction, volatility, tradeCount: 40 });
    expect(r.contradictions).toEqual(["d-bad", "v-bad"]);
  });

  it("VOCABULARY LOCK: every RESOLVED value is readable by selectMarketStory's matchers", () => {
    // The whole point of this producer is to move the deck hero off UNKNOWN.
    // A value the story engine cannot match seals the dimension and changes
    // nothing on screen — silent failure, the worst kind.
    const cases: { direction: MarketStateDimension; expectMatcher: "trend" | "balance" }[] = [
      { direction: dim("RESOLVED", "UP", 0.75, [REF("d")]), expectMatcher: "trend" },
      { direction: dim("RESOLVED", "DOWN", 0.75, [REF("d")]), expectMatcher: "trend" },
      { direction: dim("PARTIAL", null, 0, [REF("d")]), expectMatcher: "balance" },
    ];
    for (const c of cases) {
      const r = deriveRegimeDimension({
        direction: c.direction,
        volatility: dim("RESOLVED", "NORMAL VOLATILITY", 0.55, [REF("v")]),
        tradeCount: 40,
      });
      expect(r.resolution).toBe("RESOLVED");
      expect(DEFAULT_MATCHERS.regime[c.expectMatcher]!.matches(r)).toBe(true);
    }
  });
});
