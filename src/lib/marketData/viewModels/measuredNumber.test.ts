/**
 * MEASURED NUMBER — tests, plus a sentinel against the duplicate coming back.
 *
 * The behaviour tests are ordinary. The sentinel at the bottom is the point of
 * the file: this module exists because the SAME function was written out twice
 * and the SAME class of rendering bug shipped three times, and nothing in the
 * suite could see any of it. Unit tests over `formatMagnitude` prove the owner
 * is correct; they say nothing about whether anyone consults it.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { roundSig, formatMagnitude, formatRatio } from "./measuredNumber";

describe("roundSig — scale-preserving rounding", () => {
  it("keeps a small number small instead of flattening it to zero", () => {
    expect(roundSig(0.0651, 3)).toBe(0.0651);
    expect(roundSig(0.00042, 3)).toBe(0.00042);
  });

  it("truncates a large number's noise rather than its magnitude", () => {
    expect(roundSig(4137201, 3)).toBe(4140000);
  });

  it("an exact zero and a non-number are zero, not NaN", () => {
    expect(roundSig(0, 3)).toBe(0);
    expect(roundSig(Number.NaN, 3)).toBe(0);
    expect(roundSig(Number.POSITIVE_INFINITY, 3)).toBe(0);
  });

  it("is sign-preserving", () => {
    expect(roundSig(-0.0651, 3)).toBe(-0.0651);
  });
});

describe("formatMagnitude — a number a trader can read at a glance", () => {
  it("NEVER renders a real, non-zero magnitude as zero", () => {
    // The production defect, as a property rather than an anecdote.
    for (const v of [0.065, 0.0004, 0.00000091, 0.5, 0.999]) {
      const s = formatMagnitude(v);
      expect(s, `formatMagnitude(${v})`).not.toBe("0");
      expect(s, `formatMagnitude(${v})`).not.toBe("0.00");
      expect(Number(s.replace(/,/g, "")), `formatMagnitude(${v})`).toBeGreaterThan(0);
    }
  });

  it("NEVER renders scientific notation", () => {
    // The other production defect: `EFFICIENCY RATIO 4.37e+2`. A trader is
    // being asked to act on this number; it must not also be a puzzle.
    for (const v of [437, 0.00000091, 4137201, 1e21, 1e-21]) {
      expect(formatMagnitude(v), `formatMagnitude(${v})`).not.toMatch(/e[+-]/i);
    }
  });

  it("renders the two numbers that were wrong on production", () => {
    expect(formatMagnitude(0.0651)).toBe("0.0651");
    expect(formatMagnitude(437.21)).toBe("437");
  });

  it("groups above a thousand and drops decimals nobody measured", () => {
    expect(formatMagnitude(12400)).toBe("12,400");
    expect(formatMagnitude(4137201.2836)).toBe("4,137,201");
  });

  it("an absent number is an em dash, never a zero", () => {
    expect(formatMagnitude(null)).toBe("—");
    expect(formatMagnitude(undefined)).toBe("—");
    expect(formatMagnitude(Number.NaN)).toBe("—");
    expect(formatMagnitude(Number.POSITIVE_INFINITY)).toBe("—");
  });

  it("an exact zero is allowed to say zero", () => {
    // The rule is "a non-zero number must not read as zero", not "nothing may
    // read as zero". A measured zero is a finding.
    expect(formatMagnitude(0)).toBe("0");
  });
});

describe("formatRatio — deliberately NOT the same function", () => {
  it("keeps a baseline reading near one", () => {
    expect(formatRatio(1)).toBe("1.00");
    expect(formatRatio(2.5)).toBe("2.50");
  });

  it("survives a ratio near zero, which is why it was written", () => {
    expect(formatRatio(0.0021)).toBe("0.0021");
    expect(formatRatio(0.000004)).toBe("0.000004");
  });

  it("diverges from formatMagnitude on purpose, and here is where", () => {
    // If someone ever "simplifies" one into the other, this is the line that
    // tells them what they broke: a ratio wants to be legible against 1.00×,
    // a magnitude wants to be legible against itself.
    expect(formatRatio(1)).toBe("1.00");
    expect(formatMagnitude(1)).toBe("1");
    expect(formatRatio(2.5)).toBe("2.50");
    expect(formatMagnitude(2.5)).toBe("2.5");
  });

  it("an absent number is an em dash", () => {
    expect(formatRatio(null)).toBe("—");
    expect(formatRatio(Number.NaN)).toBe("—");
  });
});

/**
 * SENTINEL — the duplicate must not come back.
 *
 * `roundSig` lived in TWO selector files, byte-for-byte, each under its own
 * comment explaining the reasoning. Neither copy was wrong; that is exactly
 * why nothing caught them. Re-typing the four-line body next to the code that
 * needs it is the most natural thing in the world to do, and it is how the
 * product came to hold three different answers to one question.
 *
 * WHAT THIS CAN AND CANNOT SEE. This is a SOURCE-TEXT assertion. It cannot
 * witness a caller that imports the owner and then ignores the result, and it
 * cannot see a rendered pixel. It closes ONE thing: the arithmetic cannot
 * quietly re-appear beside a canvas without failing here BY NAME.
 */
describe("measuredNumber adoption (Sentinel)", () => {
  const ROOT = path.resolve(__dirname, "..", "..", "..", "..");
  const CONSUMERS = [
    "src/lib/marketData/viewModels/selectLiquidityWeather.ts",
    "src/lib/marketData/viewModels/selectAbsorption.ts",
  ];

  function read(rel: string): string {
    return readFileSync(path.join(ROOT, rel), "utf8");
  }

  it("the files it polices actually exist and are non-trivial", () => {
    // Guards against FALSE_RIPENESS: a renamed or emptied file would make
    // every assertion below pass vacuously.
    for (const rel of CONSUMERS) {
      expect(read(rel).length, rel).toBeGreaterThan(2000);
    }
  });

  it("no consumer re-declares the rounding it imports", () => {
    const offenders = CONSUMERS.filter((rel) =>
      /function\s+roundSig\s*\(/.test(read(rel)),
    );
    expect(
      offenders,
      `these files declare their own roundSig instead of importing the owner ` +
        `in measuredNumber.ts. That duplicate is how three different answers ` +
        `to one rendering question shipped:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every consumer names the owner it delegates to", () => {
    for (const rel of CONSUMERS) {
      expect(read(rel), rel).toMatch(/from\s+"\.\/measuredNumber"/);
    }
  });

  it("the panels that shipped the defect no longer format magnitudes themselves", () => {
    // Named individually so a failure tells the reader which pixel regressed
    // and what it printed at a trader when it last went wrong.
    const liquidity = read("src/components/experience/LiquidityWeatherPanel.tsx");
    const absorption = read("src/components/experience/AbsorptionAnatomyPanel.tsx");

    const code = (s: string) =>
      s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

    expect(
      code(absorption),
      "AbsorptionAnatomyPanel printed `EFFICIENCY RATIO 4.37e+2` at a trader — " +
        "scientific notation is not a reading. Delegate to formatMagnitude.",
    ).not.toMatch(/toExponential\s*\(/);

    expect(
      code(liquidity),
      "LiquidityWeatherPanel printed `MEDIAN COST 0 size per spread` on a tape " +
        "whose real cost was 0.065. It must not carry its own fixed-decimal " +
        "formatter for a magnitude.",
    ).not.toMatch(/function\s+num\s*\(/);

    expect(liquidity).toMatch(/formatCost\(vm\.medianCost\)/);
    expect(absorption).toMatch(/formatMagnitude\(vm\.efficiency\)/);
  });
});
