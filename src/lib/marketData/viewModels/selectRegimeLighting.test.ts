import { describe, expect, it } from "vitest";

import selectRegimeLighting, { DIMMED_ALPHA, HANDOVER_ALPHA, PILOT_ALPHA } from "./selectRegimeLighting";
import type { RegimeVerdict } from "./selectRegime";

const L = (verdict: RegimeVerdict) => selectRegimeLighting({ verdict });

describe("H-901 — only one breaker, and the rules it throws", () => {
  it("TREND on: magnets dim, trend fixtures keep full light", () => {
    const v = L("TREND");
    expect(v.breaker).toBe("TREND");
    expect(v.magnets).toBe(DIMMED_ALPHA);
    expect(v.trend).toBe(1);
  });

  it("RANGE on (BALANCE or COMPRESSION): trend fixtures capped, magnets keep light", () => {
    for (const verdict of ["BALANCE", "COMPRESSION"] as const) {
      const v = L(verdict);
      expect(v.breaker).toBe("RANGE");
      expect(v.trend).toBe(DIMMED_ALPHA);
      expect(v.magnets).toBe(1);
    }
  });

  it("TRANSITION on (TRANSITION or EXPANSION): all fixtures dimmed", () => {
    for (const verdict of ["TRANSITION", "EXPANSION"] as const) {
      const v = L(verdict);
      expect(v.breaker).toBe("TRANSITION");
      expect(v.magnets).toBeLessThan(1);
      expect(v.trend).toBeLessThan(1);
    }
  });

  it("UNKNOWN or no reading: NO breaker, lights unchanged — never dim on a guess", () => {
    for (const v of [L("UNKNOWN"), selectRegimeLighting(null)]) {
      expect(v.breaker).toBeNull();
      expect(v.magnets).toBe(1);
      expect(v.trend).toBe(1);
      expect(v.chip).toMatch(/UNKNOWN/);
    }
  });

  it("a dimmer, never an off switch: every multiplier stays above zero", () => {
    for (const verdict of ["TREND", "BALANCE", "COMPRESSION", "TRANSITION", "EXPANSION", "UNKNOWN"] as const) {
      const v = L(verdict);
      expect(v.magnets).toBeGreaterThan(0);
      expect(v.trend).toBeGreaterThan(0);
    }
  });

  it("never both fixture classes dimmed except in TRANSITION (only one breaker on)", () => {
    for (const verdict of ["TREND", "BALANCE", "COMPRESSION"] as const) {
      const v = L(verdict);
      expect(v.magnets === 1 || v.trend === 1).toBe(true);
    }
  });
});

// v2 (Founder 2026-09-25 13:58, "look at the actual screen"): the plate's
// market canvas carries fixtures, not the breaker legend. These pin how the
// regime's OWN fixtures are lit, and F15A's state light.
describe("H-901 v2 — the plate's own fixtures, lit by the one breaker", () => {
  const ALL = ["TREND", "BALANCE", "COMPRESSION", "TRANSITION", "EXPANSION", "UNKNOWN"] as const;

  it("TREND lights the channel and dims the magnets; RANGE lights the magnets and caps the channel", () => {
    const t = L("TREND");
    expect(t.fixtureState).toEqual({ magnets: "DIMMED", channel: "LIT" });
    expect(t.fixtures).toEqual({ magnets: DIMMED_ALPHA, trend: 1 });
    for (const verdict of ["BALANCE", "COMPRESSION"] as const) {
      const r = L(verdict);
      expect(r.fixtureState).toEqual({ magnets: "LIT", channel: "CAPPED" });
      expect(r.fixtures).toEqual({ magnets: 1, trend: DIMMED_ALPHA });
    }
  });

  it("TRANSITION dims every fixture for the handover", () => {
    for (const verdict of ["TRANSITION", "EXPANSION"] as const) {
      const v = L(verdict);
      expect(v.fixtureState).toEqual({ magnets: "HANDOVER", channel: "HANDOVER" });
      expect(v.fixtures).toEqual({ magnets: HANDOVER_ALPHA, trend: HANDOVER_ALPHA });
    }
  });

  it("NO breaker: every OTHER layer's light unchanged, and the plate's fixtures never blaze together", () => {
    for (const v of [L("UNKNOWN"), selectRegimeLighting(null)]) {
      expect(v.magnets).toBe(1);
      expect(v.trend).toBe(1);
      expect(v.fixtureState).toEqual({ magnets: "PILOT", channel: "PILOT" });
      expect(v.fixtures).toEqual({ magnets: PILOT_ALPHA, trend: PILOT_ALPHA });
      expect(PILOT_ALPHA).toBeLessThan(1);
    }
  });

  it("while a breaker is on, the fixtures take exactly the breaker's light (one light, two readers)", () => {
    for (const verdict of ALL) {
      const v = L(verdict);
      if (!v.breaker) continue;
      expect(v.fixtures).toEqual({ magnets: v.magnets, trend: v.trend });
    }
  });

  it("at most one fixture class is LIT, in every state — never both", () => {
    for (const verdict of [...ALL, null]) {
      const v = verdict ? L(verdict) : selectRegimeLighting(null);
      const lit = [v.fixtureState.magnets, v.fixtureState.channel].filter(s => s === "LIT").length;
      expect(lit, String(verdict)).toBeLessThanOrEqual(1);
      expect(Math.min(v.fixtures.magnets, v.fixtures.trend), String(verdict)).toBeLessThan(1);
      expect(v.fixtures.magnets).toBeGreaterThan(0);
      expect(v.fixtures.trend).toBeGreaterThan(0);
    }
  });

  it("F15A field by state: BALANCE (RANGE), TRANSITION, WAIT (no breaker); TREND has no F15A level", () => {
    expect(L("BALANCE").field).toBe("BALANCE");
    expect(L("COMPRESSION").field).toBe("BALANCE");
    expect(L("TRANSITION").field).toBe("TRANSITION");
    expect(L("EXPANSION").field).toBe("TRANSITION");
    expect(L("UNKNOWN").field).toBe("WAIT");
    expect(selectRegimeLighting(null).field).toBe("WAIT");
    expect(L("TREND").field).toBeNull();
  });

  it("ONE mark: a breaker earns a compact title, no breaker earns none (the unresolved coin speaks)", () => {
    for (const verdict of ALL) {
      const v = L(verdict);
      if (v.breaker) {
        expect(v.title).toMatch(new RegExp(`^REGIME · ${v.breaker} · `));
        expect(v.title!.length).toBeLessThan(48);
      } else {
        expect(v.title).toBeNull();
      }
      expect(v.title ?? "").not.toMatch(/ONLY ONE ON|CIRCUIT/);
    }
  });
});
