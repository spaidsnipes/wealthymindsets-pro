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

  it("DELAYED_BY_ENTITLEMENT badge → tooltip carries all seven canon narrative fields", () => {
    const b = priceSourceBadge("yahoo", true);
    expect(b.label).toBe(CANONICAL_FIDELITY_LABELS.DELAYED_BY_ENTITLEMENT);
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
});
