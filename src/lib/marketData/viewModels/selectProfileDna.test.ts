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
