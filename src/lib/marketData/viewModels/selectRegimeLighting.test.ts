import { describe, expect, it } from "vitest";

import selectRegimeLighting, { DIMMED_ALPHA } from "./selectRegimeLighting";
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
