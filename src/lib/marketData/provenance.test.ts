import { describe, it, expect } from "vitest";
import {
  deriveResolution,
  envelope,
  isFullTruth,
  coverageLabel,
  type Provenance,
} from "./provenance";

function prov(over: Partial<Provenance> = {}): Provenance {
  return {
    fidelity: "OBSERVED",
    source: "alpaca",
    observedAt: 1_755_400_000_000,
    coverage: { observed: 3, expected: 3 },
    ...over,
  };
}

describe("deriveResolution — canon A04 truth tier", () => {
  it("UNKNOWN when fidelity is UNAVAILABLE", () => {
    expect(deriveResolution(prov({ fidelity: "UNAVAILABLE" }))).toBe("UNKNOWN");
  });

  it("UNKNOWN when observed coverage is 0", () => {
    expect(deriveResolution(prov({ coverage: { observed: 0, expected: 5 } }))).toBe("UNKNOWN");
  });

  it("PARTIAL when observed < expected (incomplete coverage)", () => {
    expect(deriveResolution(prov({ coverage: { observed: 3, expected: 7 } }))).toBe("PARTIAL");
  });

  it("PARTIAL when the value is not directly OBSERVED (derived/proxy/inferred)", () => {
    for (const fidelity of ["DERIVED", "PROXY", "INFERRED", "SIMULATED"] as const) {
      expect(deriveResolution(prov({ fidelity, coverage: { observed: 3, expected: 3 } }))).toBe("PARTIAL");
    }
  });

  it("RESOLVED when OBSERVED with complete coverage", () => {
    expect(deriveResolution(prov({ coverage: { observed: 7, expected: 7 } }))).toBe("RESOLVED");
  });

  it("RESOLVED when OBSERVED with unbounded-but-present coverage (expected null)", () => {
    expect(deriveResolution(prov({ coverage: { observed: 2, expected: null } }))).toBe("RESOLVED");
  });
});

describe("envelope / isFullTruth", () => {
  it("wraps a value and derives resolution", () => {
    const e = envelope(42.5, prov());
    expect(e.value).toBe(42.5);
    expect(e.resolution).toBe("RESOLVED");
    expect(e.source).toBe("alpaca");
    expect(isFullTruth(e)).toBe(true);
  });

  it("a partial envelope is not full truth", () => {
    const e = envelope(10, prov({ coverage: { observed: 1, expected: 4 } }));
    expect(e.resolution).toBe("PARTIAL");
    expect(isFullTruth(e)).toBe(false);
  });

  it("preserves the wrapped value type (works on any T)", () => {
    const e = envelope({ poc: 100, vah: 105 }, prov());
    expect(e.value).toEqual({ poc: 100, vah: 105 });
  });

  it("is pure — identical inputs, identical output", () => {
    const p = prov();
    expect(envelope(1, p)).toEqual(envelope(1, p));
  });
});

describe("coverageLabel", () => {
  it("renders honest coverage strings", () => {
    expect(coverageLabel({ observed: 4, expected: 7 })).toBe("4/7");
    expect(coverageLabel({ observed: 3, expected: null })).toBe("3");
    expect(coverageLabel({ observed: 0, expected: 5 })).toBe("none");
  });
});
