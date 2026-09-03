import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { strengthDisclosure, strengthScore } from "@/lib/scannerStrength";

const raw = fs.readFileSync(
  path.join(process.cwd(), "src/app/scanner/page.tsx"),
  "utf8",
);
const page = raw
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * Scanner strength-grade Sentinel — canon weakness #4 SCORE ADDICTION.
 *
 * "A+" reads like a validated signal quality. It is actually a fixed-weight
 * bucket over two real inputs: |change %| x0.5 + volume ratio x0.3. The inputs
 * are honest market data, so the grade is not fabricated — but rendering a
 * letter grade with no disclosure implies a validation that never happened.
 *
 * Sibling controls already disclose ("Real percentage move"; refresh cadence
 * "does not certify every row as real-time"); the grade chip was the gap.
 */
describe("scanner strength disclosure", () => {
  it("states the exact formula and its real inputs", () => {
    const d = strengthDisclosure(4, 2);
    expect(d).toContain("|change %|");
    expect(d).toContain("volume ratio");
    expect(d).toContain("observed data only");
  });

  it("explicitly denies being a validated quality or prediction", () => {
    const d = strengthDisclosure(1, 1);
    expect(d).toContain("not a validated signal quality");
    expect(d).toContain("prediction");
  });

  it("reports the same score the grader buckets on", () => {
    // |6| * 0.5 + 4 * 0.3 = 3 + 1.2 = 4.20
    expect(strengthDisclosure(6, 4)).toContain("4.20");
    // Negative moves use absolute value.
    expect(strengthDisclosure(-6, 4)).toContain("4.20");
  });

  it("the disclosed score matches the grader's own arithmetic", () => {
    expect(strengthScore(6, 4)).toBeCloseTo(4.2, 5);
    expect(strengthScore(-6, 4)).toBeCloseTo(4.2, 5);
  });

  it("both strength chips carry the disclosure", () => {
    const uses = page.match(/title=\{strengthDisclosure\(/g) ?? [];
    expect(uses.length).toBe(2);
  });
});
