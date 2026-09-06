import { describe, it, expect } from "vitest";
import { buildCanonicalFidelityTooltip } from "./CanonicalFidelityBadge";
import { priceSourceBadge } from "@/lib/priceSource";
import { CANONICAL_FIDELITY_LABELS } from "@/lib/marketData/canonicalFidelityLabels";

// Tooltip tests below use a real-observation fixture, not provider names as proof.
const observedQuote = (source: string, connected: boolean, sessionOpen?: boolean | null) =>
  priceSourceBadge(source, connected, sessionOpen, {present: true, fresh: true});

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
    const b = observedQuote("polygon", true);
    expect(b.label).toBe(CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE);
    const t = buildCanonicalFidelityTooltip(b);
    expect(t).toBe(b.title);
    expect(t).not.toContain("Affected:");
    expect(t).not.toContain("State:");
  });

  it("ACTIVE_DEGRADED badge → tooltip carries all seven canon narrative fields", () => {
    const b = observedQuote("yahoo", true);
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

  it("unresolved provider → availability, without inventing a recovering pipeline", () => {
    const b = observedQuote("unavailable", false);
    expect(b.label).toBe(CANONICAL_FIDELITY_LABELS.STALE_PIPELINE);
    const t = buildCanonicalFidelityTooltip(b);
    expect(t).toContain("No price observation received");
    expect(t).not.toContain("RECOVERING");
  });

  it("titleSuffix is appended to the base title, not the narrative", () => {
    const b = observedQuote("polygon", true);
    const t = buildCanonicalFidelityTooltip(b, "Click to chart.");
    expect(t).toBe(`${b.title} Click to chart.`);
  });

  it("titleSuffix + non-NORMAL badge → suffix stays on the first line", () => {
    const b = observedQuote("yahoo", true);
    const t = buildCanonicalFidelityTooltip(b, "TSLA — Click to chart.");
    const lines = t.split("\n");
    expect(lines[0]).toBe(`${b.title} TSLA — Click to chart.`);
    expect(lines[1]).toBe("");
    expect(lines[2]).toBe("State: DEGRADED");
  });

  it("every canon fidelity label produces a non-empty tooltip (no consumer can break rendering)", () => {
    for (const src of ["polygon", "binance", "coinbase", "alpaca", "finnhub", "yahoo", "unavailable"]) {
      const b = observedQuote(src, true);
      const t = buildCanonicalFidelityTooltip(b);
      expect(t.length).toBeGreaterThan(0);
    }
  });

  describe("capabilityReport enrichment — canon §Provider Status Per Capability", () => {
    it("LIVE badge + all-NORMAL capabilities → tooltip mentions coverage count (canon §Vector, not god score)", () => {
      const b = observedQuote("polygon", true);
      const t = buildCanonicalFidelityTooltip(b, undefined, {
        bars: CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE,
        quotes: CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE,
        ticks: CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE,
      });
      expect(t).toContain("Capabilities evaluated: 3 / 7 — all normal");
    });

    /**
     * This test previously asserted `Weakest capability: depth · BLOCKED BY
     * ENTITLEMENT` for exactly this input — a LIVE bars+quotes report with a
     * blocked DEPTH entitlement. It was locking in the defect BUILD ORDER §14.7
     * names: "missing Greeks cannot dirty a verified last price." Depth is a
     * real capability, but no price rests on it, and a chip that labels a PRICE
     * must not answer "what's weakest here?" with something the price does not
     * depend on. The assertion is rewritten, not deleted — depth is still
     * disclosed, on a line that speaks only for depth.
     */
    it("a degraded NON-price capability is disclosed without describing the price (§14.7)", () => {
      const b = observedQuote("polygon", true);
      const t = buildCanonicalFidelityTooltip(b, undefined, {
        bars: CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE,
        quotes: CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE,
        depth: CANONICAL_FIDELITY_LABELS.BLOCKED_BY_ENTITLEMENT,
      });
      expect(t).toContain("Not affecting this price: depth · BLOCKED BY ENTITLEMENT");
      expect(t).not.toContain("Weakest price capability");
      expect(t).toContain("Capabilities evaluated: 3 / 7");
    });

    it("a degraded PRICE capability IS named as the weakness (§14.7 is not a mute button)", () => {
      const b = observedQuote("polygon", true);
      const t = buildCanonicalFidelityTooltip(b, undefined, {
        bars: CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE,
        ticks: CANONICAL_FIDELITY_LABELS.STALE_PIPELINE,
        greeks: CANONICAL_FIDELITY_LABELS.BLOCKED_BY_ENTITLEMENT,
      });
      expect(t).toContain("Weakest price capability: ticks · STALE PIPELINE");
      // …and the Greek is still on the record, just not speaking for the price.
      expect(t).toContain("Not affecting this price: greeks · BLOCKED BY ENTITLEMENT");
    });

    it("a blocked Greek behind a live quote never reads as the price being weak", () => {
      const b = observedQuote("polygon", true);
      const t = buildCanonicalFidelityTooltip(b, undefined, {
        bars: CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE,
        quotes: CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE,
        ticks: CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE,
        greeks: CANONICAL_FIDELITY_LABELS.BLOCKED_BY_ENTITLEMENT,
      });
      expect(t).not.toContain("Weakest price capability");
      expect(t).toContain("Not affecting this price: greeks · BLOCKED BY ENTITLEMENT");
      expect(t).toContain("Capabilities evaluated: 4 / 7");
    });

    it("no capabilityReport supplied → tooltip shape unchanged (backwards-compat)", () => {
      const b = observedQuote("polygon", true);
      expect(buildCanonicalFidelityTooltip(b)).toBe(b.title);
    });

    it("empty capabilityReport → tooltip omits coverage line (silent per canon)", () => {
      const b = observedQuote("polygon", true);
      const t = buildCanonicalFidelityTooltip(b, undefined, {});
      expect(t).toBe(b.title);
      expect(t).not.toContain("Capabilities evaluated");
    });

    it("SESSION_CLOSED weakest capability does NOT count as a problem (canon §closed-is-not-delayed)", () => {
      const b = observedQuote("polygon", true);
      const t = buildCanonicalFidelityTooltip(b, undefined, {
        bars: CANONICAL_FIDELITY_LABELS.SESSION_CLOSED_LAST_VERIFIED,
        quotes: CANONICAL_FIDELITY_LABELS.SESSION_CLOSED_LAST_VERIFIED,
      });
      expect(t).not.toContain("Weakest capability");
      expect(t).toContain("all normal");
    });
  });
});
