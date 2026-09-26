import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatVolume } from "./formatVolume";

describe("formatVolume — a traded bar is never called empty", () => {
  it("keeps fractions of a coin", () => {
    expect(formatVolume(0.0004213)).toBe("0.0004213");
    expect(formatVolume(1.000031)).toBe("1");
    expect(formatVolume(12.34567)).toBe("12.35");
  });
  it("whole units with separators from 100 up; zero only for zero", () => {
    expect(formatVolume(6286)).toBe("6,286");
    expect(formatVolume(123.6)).toBe("124");
    expect(formatVolume(0)).toBe("0");
    expect(formatVolume(NaN)).toBe("—");
  });
  it("the Data Window uses it", () => {
    const code = readFileSync(join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
    expect(code).toContain("value: dataWindow.v, color: \"#8896BE\", fmt: formatVolume");
  });
});
