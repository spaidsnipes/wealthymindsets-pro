import { describe, it, expect } from "vitest";
import { buildCanonicalFidelityTooltip } from "./CanonicalFidelityBadge";
import { priceSourceBadge } from "@/lib/priceSource";
import { CANONICAL_FIDELITY_LABELS } from "@/lib/marketData/canonicalFidelityLabels";

/**
 * buildCanonicalFidelityTooltip — canon §Simplification Dividend +
 * §Failure Recovery Grammar. Every non-NORMAL badge produces a
 * multi-line tooltip carrying the 7-question narrative; NORMAL states
 * (LIVE + SESSION CLOSED) keep the clean one-line title.
 *
 * Testing the pure builder (not the JSX render) is deliberate — the
 * vitest env is jsdom-free by convention for lib tests, and the
 * tooltip string is the entire behavioral contract the four migrated
 * consumers depend on.
 */
describe("buildCanonicalFidelityTooltip — canon 7-question enrichment", () => {
  it("LIVE badge → one-line tooltip (canon: normal inactivity is not failure)", () => {
    const b = priceSourceBadge("polygon", true);
    expect(b.label).toBe(CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE);
    const t = buildCanonicalFidelityTooltip(b);
    expect(t).toBe(b.title);
    expect(t).not.toContain("Affected:");
    expect(t).not.toContain("State:");
  });

  it("ACTIVE_DEGRADED badge → tooltip carries all seven canon narrative fields", () => {
    const b = priceSourceBadge("yahoo", true);
    expect(b.label).toBe(CANONICAL_FIDELITY_LABELS.ACTIVE_DEGRADED);
    const t = buildCanonicalFidelityTooltip(b);
    expect(t.startsWith(b.title)).toBe(true);
    expect(t).toContain("State: DEGRADED");
    expect(t).toContain("Affected:");
    expect(t).toContain("Still works:");
    expect(t).toContain("Reason:");
    expect(t).toContain("Impact:");
    expect(t).toContain("Next:");
    expect(t).toContain("Recovered when:");
  });

  it("STALE_PIPELINE badge (unresolved provider) → tooltip flags RECOVERING", () => {
    const b = priceSourceBadge("unavailable", false);
    expect(b.label).toBe(CANONICAL_FIDELITY_LABELS.STALE_PIPELINE);
    const t = buildCanonicalFidelityTooltip(b);
    expect(t).toContain("State: RECOVERING");
  });

  it("titleSuffix is appended to the base title, not the narrative", () => {
    const b = priceSourceBadge("polygon", true);
    const t = buildCanonicalFidelityTooltip(b, "Click to chart.");
    expect(t).toBe(`${b.title} Click to chart.`);
  });

  it("titleSuffix + non-NORMAL badge → suffix stays on the first line", () => {
    const b = priceSourceBadge("yahoo", true);
    const t = buildCanonicalFidelityTooltip(b, "TSLA — Click to chart.");
    const lines = t.split("\n");
    expect(lines[0]).toBe(`${b.title} TSLA — Click to chart.`);
    expect(lines[1]).toBe("");
    expect(lines[2]).toBe("State: DEGRADED");
  });

  it("every canon fidelity label produces a non-empty tooltip (no consumer can break rendering)", () => {
    for (const src of ["polygon", "binance", "coinbase", "alpaca", "finnhub", "yahoo", "unavailable"]) {
      const b = priceSourceBadge(src, true);
      const t = buildCanonicalFidelityTooltip(b);
      expect(t.length).toBeGreaterThan(0);
    }
  });

  describe("capabilityReport enrichment — canon §Provider Status Per Capability", () => {
    it("LIVE badge + all-NORMAL capabilities → tooltip mentions coverage count (canon §Vector, not god score)", () => {
      const b = priceSourceBadge("polygon", true);
      const t = buildCanonicalFidelityTooltip(b, undefined, {
        bars: CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE,
        quotes: CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE,
        ticks: CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE,
      });
      expect(t).toContain("Capabilities evaluated: 3 / 7 — all normal");
    });

    it("LIVE badge + a degraded capability → tooltip flags weakest capability by name", () => {
      const b = priceSourceBadge("polygon", true);
      const t = buildCanonicalFidelityTooltip(b, undefined, {
        bars: CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE,
        quotes: CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE,
        depth: CANONICAL_FIDELITY_LABELS.BLOCKED_BY_ENTITLEMENT,
      });
      expect(t).toContain("Weakest capability: depth · BLOCKED BY ENTITLEMENT");
      expect(t).toContain("Capabilities evaluated: 3 / 7");
    });

    it("no capabilityReport supplied → tooltip shape unchanged (backwards-compat)", () => {
      const b = priceSourceBadge("polygon", true);
      expect(buildCanonicalFidelityTooltip(b)).toBe(b.title);
    });

    it("empty capabilityReport → tooltip omits coverage line (silent per canon)", () => {
      const b = priceSourceBadge("polygon", true);
      const t = buildCanonicalFidelityTooltip(b, undefined, {});
      expect(t).toBe(b.title);
      expect(t).not.toContain("Capabilities evaluated");
    });

    it("SESSION_CLOSED weakest capability does NOT count as a problem (canon §closed-is-not-delayed)", () => {
      const b = priceSourceBadge("polygon", true);
      const t = buildCanonicalFidelityTooltip(b, undefined, {
        bars: CANONICAL_FIDELITY_LABELS.SESSION_CLOSED_LAST_VERIFIED,
        quotes: CANONICAL_FIDELITY_LABELS.SESSION_CLOSED_LAST_VERIFIED,
      });
      expect(t).not.toContain("Weakest capability");
      expect(t).toContain("all normal");
    });
  });
});
