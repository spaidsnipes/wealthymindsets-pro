import { describe, expect, it } from "vitest";

import selectProfileDna, { MIN_DNA_ROWS } from "./selectProfileDna";

/** 20 rows from 100.0 to 101.9; volume peaks at `peak` (row index). */
const curve = (peak: number, width = 2) =>
  Array.from({ length: 20 }, (_, i) => ({
    price: +(100 + i * 0.1).toFixed(2),
    volume: 10 + Math.max(0, 100 - Math.abs(i - peak) * (100 / width)),
  }));

const input = (peak: number, vah: number, val: number) => ({
  curve: curve(peak), poc: +(100 + peak * 0.1).toFixed(2), vah, val, bars: 78, estimated: true,
});

describe("refusals", () => {
  it("no profile, thin sample and a flat range are named", () => {
    expect(selectProfileDna(null).reason).toBe("NO_PROFILE");
    expect(selectProfileDna({ ...input(10, 101.2, 100.8), poc: null }).reason).toBe("NO_PROFILE");
    const thin = { ...input(3, 100.4, 100.2), curve: curve(3).slice(0, MIN_DNA_ROWS - 1) };
    const t = selectProfileDna(thin);
    expect(t.reason).toBe("THIN_SAMPLE");
    expect(t.strip).toBe("");
    const flat = { ...input(0, 100, 100), curve: Array.from({ length: 15 }, () => ({ price: 100, volume: 5 })) };
    expect(selectProfileDna(flat).reason).toBe("FLAT_RANGE");
  });
});

describe("shape", () => {
  it("POC high with narrow value → P", () => {
    expect(selectProfileDna(input(17, 101.8, 101.5)).shape).toBe("P");
  });
  it("POC low with narrow value → b", () => {
    expect(selectProfileDna(input(2, 100.4, 100.1)).shape).toBe("b");
  });
  it("POC central with narrow value → D", () => {
    expect(selectProfileDna(input(10, 101.2, 100.8)).shape).toBe("D");
  });
  it("value spanning most of the range → ELONGATED, whatever the POC", () => {
    expect(selectProfileDna(input(17, 101.9, 100.2)).shape).toBe("ELONGATED");
  });
});

describe("honesty", () => {
  it("numbers are unit-interval descriptions, and the sample is printed", () => {
    const v = selectProfileDna(input(10, 101.2, 100.8));
    for (const x of [v.pocPosition!, v.valueWidth!, v.massCentre!]) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
    }
    expect(v.strip).toContain("20 ROWS / 78 BARS");
    expect(v.strip).toContain("EST");
  });
  it("never prophecy: the strip carries no direction or probability words", () => {
    const v = selectProfileDna(input(17, 101.8, 101.5));
    expect(v.strip).not.toMatch(/BULL|BEAR|LONG|SHORT|BUY|SELL|PROB|%\s*CHANCE|WILL/);
  });
});

describe("v2 — the geometry the canvas draws is published here, never recomputed there", () => {
  const flatCurve = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ price: +(100 + i * 0.1).toFixed(2), volume: 50 }));

  it("a symmetric curve has no lean: |skew| < 0.05", () => {
    const sym = Array.from({ length: 21 }, (_, i) => ({
      price: +(100 + i * 0.1).toFixed(2),
      volume: 10 + Math.max(0, 100 - Math.abs(i - 10) * 50),
    }));
    const s = selectProfileDna({ curve: sym, poc: 101, vah: 101.1, val: 100.9, bars: 40, estimated: false });
    expect(s.version).toBe(2);
    expect(s.measured).toBe(true);
    expect(Math.abs(s.skew!)).toBeLessThan(0.05);
    expect(s.massCentrePrice!).toBeCloseTo(101, 6);
  });

  it("a uniform curve has excess kurtosis ≈ −1.2", () => {
    const u = selectProfileDna({ curve: flatCurve(20), poc: 100.9, vah: 101.4, val: 100.4, bars: 40, estimated: false });
    expect(u.measured).toBe(true);
    expect(u.excessKurtosis!).toBeGreaterThan(-1.25);
    expect(u.excessKurtosis!).toBeLessThan(-1.15);
  });

  it("a P-shape's mass centre sits BELOW its POC and leans negative; a b mirrors it", () => {
    const p = selectProfileDna(input(17, 101.8, 101.5));
    expect(p.shape).toBe("P");
    expect(p.massCentrePrice!).toBeLessThan(p.poc!);
    expect(p.skew!).toBeLessThan(0);
    const b = selectProfileDna(input(2, 100.4, 100.1));
    expect(b.shape).toBe("b");
    expect(b.massCentrePrice!).toBeGreaterThan(b.poc!);
    expect(b.skew!).toBeGreaterThan(0);
  });

  it("publishes range, levels and row step as prices the lane can project", () => {
    const v = selectProfileDna(input(10, 101.2, 100.8));
    expect(v.lo).toBe(100);
    expect(v.hi).toBe(101.9);
    expect([v.val, v.poc, v.vah]).toEqual([100.8, 101, 101.2]);
    expect(v.rowStep!).toBeCloseTo(0.1, 9);
    expect(v.massCentre!).toBeCloseTo((v.massCentrePrice! - v.lo!) / (v.hi! - v.lo!), 9);
    // The compiler's own grid wins over the derived gap.
    expect(selectProfileDna({ ...input(10, 101.2, 100.8), rowStep: 0.05 }).rowStep).toBe(0.05);
  });

  it("THIN_SAMPLE is unchanged as a refusal, but keeps its range for the faint spine", () => {
    const thin = { ...input(3, 100.4, 100.2), curve: curve(3).slice(0, MIN_DNA_ROWS - 1) };
    const t = selectProfileDna(thin);
    expect(t.reason).toBe("THIN_SAMPLE");
    expect(t.measured).toBe(false);
    expect(t.shape).toBeNull();
    expect(t.strip).toBe("");
    expect([t.skew, t.excessKurtosis, t.massCentrePrice, t.poc, t.vah, t.val]).toEqual([null, null, null, null, null, null]);
    expect(t.rows).toBe(MIN_DNA_ROWS - 1);
    expect(t.lo).toBe(100);
    expect(t.hi).toBe(101);
  });

  it("NO_PROFILE publishes no geometry at all", () => {
    const n = selectProfileDna(null);
    expect([n.lo, n.hi, n.massCentrePrice, n.rowStep]).toEqual([null, null, null, null]);
  });
});
