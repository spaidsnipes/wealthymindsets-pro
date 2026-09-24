import { describe, expect, it } from "vitest";

import selectSemanticDensity from "./selectSemanticDensity";

describe("H-501 — each depth lets its own geometry speak", () => {
  it("FAR: macro speaks, micro quiet", () => {
    const v = selectSemanticDensity("FAR");
    expect(v.macro).toBe(1);
    expect(v.micro).toBeLessThan(v.mid);
  });
  it("MID: the profile tier speaks", () => {
    const v = selectSemanticDensity("MID");
    expect(v.mid).toBe(1);
    expect(v.macro).toBeLessThan(1);
    expect(v.micro).toBeLessThan(1);
  });
  it("NEAR: tape + anatomy speak, macro quiet", () => {
    const v = selectSemanticDensity("NEAR");
    expect(v.micro).toBe(1);
    expect(v.macro).toBeLessThan(v.mid);
  });
  it("exactly one tier is at full voice per measured depth", () => {
    for (const d of ["FAR", "MID", "NEAR"] as const) {
      const v = selectSemanticDensity(d);
      expect([v.macro, v.mid, v.micro].filter(x => x === 1)).toHaveLength(1);
    }
  });
  it("dims, never deletes: every tier stays above zero", () => {
    for (const d of ["FAR", "MID", "NEAR", "UNMEASURED"] as const) {
      const v = selectSemanticDensity(d);
      for (const x of [v.macro, v.mid, v.micro]) expect(x).toBeGreaterThan(0);
    }
  });
  it("UNMEASURED or no depth changes nothing", () => {
    for (const v of [selectSemanticDensity("UNMEASURED"), selectSemanticDensity(null)]) {
      expect([v.macro, v.mid, v.micro]).toEqual([1, 1, 1]);
    }
  });
});

import { semanticDensityForBarCount } from "./selectSemanticDensity";
import { selectSemanticZoom } from "./selectSemanticZoom";

describe("the governing depth IS the printed depth", () => {
  it("bar count goes through the one zoom rule", () => {
    for (const n of [0, 5, 30, 31, 120, 299, 300, 800]) {
      expect(semanticDensityForBarCount(n).depth).toBe(selectSemanticZoom({ visibleBarCount: n }).state);
    }
  });
});
