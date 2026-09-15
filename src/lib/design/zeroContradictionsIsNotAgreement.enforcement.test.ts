/**
 * SENTINEL — zero contradictions is not agreement.
 *
 * H1, shape 1 (fabricated absence), one tile to the left of the GAPS defect
 * cured in 2092da4. Found the same way: by LOOKING at the screen.
 *
 * `/command-deck` → Data Fidelity rendered, four pixels apart:
 *
 *     UNKNOWNS  8          (watch tone)
 *     CONTRADICTIONS  0    (OK tone)
 *
 * Read together those two cells say: *WM determined very little, and found no
 * disagreement in what it determined.* The second half is not a finding.
 *
 * **A contradiction requires TWO determinations to disagree.** The chain:
 *
 *   1. All eight named dimensions hard-code `contradictions: []` — verified in
 *      deriveDirectionDimension, deriveOrderFlowDimension,
 *      deriveVolatilityDimension and deriveRegimeDimension (regime merely
 *      unions direction + volatility, both always empty).
 *   2. The system's ONLY reachable producer is a single condition in
 *      `chartMarketStatePublisher.ts` — displayed ticker price with no matching
 *      timestamped tick.
 *   3. The deck was showing `0/8 dimensions resolved` in the same panel. With
 *      zero or one determination on the packet, `contradictions.length === 0`
 *      is arithmetic about an empty set.
 *
 * LABEL-NOT-MODEL: the cure is a disclosure sentence and a tone change. It
 * deliberately does NOT invent contradiction detectors — widening what WM
 * cross-checks is real work with real evidence requirements, and it is not
 * this commit.
 *
 * Over-corrections guarded below. Deleting the `contradictions` field, removing
 * the one narrow real detector because it is narrow, or making every
 * contradiction claim permanently unreadable would each pass the defect
 * assertions alone and would all be wrong.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  describeContradictionCoverage,
  MARKET_STATE_DIMENSION_KEYS,
  type MarketStateDimension,
} from "@/lib/marketData/canonicalMarketState";

const ROOT = resolve(__dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

/** A Sentinel that fails on its own honest prose is testing the wrong surface. */
function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const DECK = "src/app/command-deck/page.tsx";
const STATE = "src/lib/marketData/canonicalMarketState.ts";
const PUBLISHER = "src/lib/marketData/chartMarketStatePublisher.ts";

const resolved = (value: string): MarketStateDimension => ({
  resolution: "RESOLVED",
  value,
  confidence: 0.9,
  evidence: [
    {
      eventId: "e1",
      observedAt: 1_000,
      availableAt: 1_000,
      source: "test",
      fidelity: "OBSERVED",
      basis: "test",
    },
  ],
  contradictions: [],
  unknowns: [],
});

const unresolved = (): MarketStateDimension => ({
  resolution: "UNKNOWN",
  value: null,
  confidence: null,
  evidence: [],
  contradictions: [],
  unknowns: ["no evidence"],
});

describe("zero contradictions is not agreement", () => {
  it("THE DEFECT: nothing resolved means nothing COULD have disagreed", () => {
    const claim = describeContradictionCoverage({ contradictions: [] });
    expect(claim.measured, "An empty-set count is not a measurement.").toBe(false);
    expect(claim.value).not.toBe("0");
    expect(claim.detectability).toBe("NOTHING_TO_COMPARE");
    expect(claim.determinationCount).toBe(0);
    // The narration must name the INPUT, not make a claim about the world.
    expect(claim.detail).toMatch(/nothing that could contradict/i);
    expect(claim.detail).toMatch(/not evidence of agreement/i);
  });

  it("THE DEFECT: one determination cannot contradict itself", () => {
    const claim = describeContradictionCoverage({
      contradictions: [],
      direction: resolved("UP"),
    });
    expect(claim.determinationCount).toBe(1);
    expect(claim.measured).toBe(false);
    expect(claim.value).not.toBe("0");
    expect(claim.detectability).toBe("NOTHING_TO_COMPARE");
    expect(claim.detail).toMatch(/cannot contradict itself/i);
  });

  it("THE DEFECT: /command-deck routes CONTRADICTIONS through the claim compiler", () => {
    const deck = codeOnly(read(DECK));
    expect(deck).toContain("describeContradictionCoverage");
    expect(
      deck,
      "The raw length printed a structural zero in the OK tone beside UNKNOWNS 8.",
    ).not.toMatch(/value=\{String\(state\.contradictions\.length\)\}/);
    // And it must be a VALUE import — a type-only import cannot route a tile.
    expect(deck).toMatch(
      /import \{ describeContradictionCoverage \} from "@\/lib\/marketData\/canonicalMarketState"/,
    );
  });

  it("a price tick and a bar close are determinations too, not only dimensions", () => {
    // These are the two things WM most often actually knows. Excluding them
    // would make the tile unreadable on exactly the packets that DO carry
    // comparable facts.
    const claim = describeContradictionCoverage({
      contradictions: [],
      price: { last: 101.5 },
      lastBar: { close: 100.25 },
    });
    expect(claim.determinationCount).toBe(2);
    expect(claim.measured).toBe(true);
    expect(claim.value).toBe("0");
  });

  it("OVER-CORRECTION: an OBSERVED contradiction is always reportable, in the warn tone", () => {
    // Finding one PROVES at least two determinations existed to disagree, so
    // the denominator can never suppress it.
    const claim = describeContradictionCoverage({
      contradictions: ["ticker price has no matching timestamped tick"],
    });
    expect(claim.value).toBe("1");
    expect(claim.measured).toBe(true);
    expect(claim.warn, "An observed contradiction must still draw the eye.").toBe(true);
    expect(claim.detectability).toBe("COMPARABLE");
  });

  it("OVER-CORRECTION: two resolved dimensions that agree may still say zero, plainly", () => {
    const claim = describeContradictionCoverage({
      contradictions: [],
      direction: resolved("UP"),
      volatility: resolved("EXPANDING"),
      regime: unresolved(),
    });
    expect(claim.determinationCount).toBe(2);
    expect(claim.value).toBe("0");
    expect(claim.measured).toBe(true);
    expect(claim.warn).toBe(false);
    // The denominator is stated, so "0" is readable as a real measurement.
    expect(claim.detail).toMatch(/2 determinations were compared/);
  });

  it("OVER-CORRECTION: the contradictions field is NOT deleted from the schema", () => {
    const src = codeOnly(read(STATE));
    expect(src).toMatch(/contradictions: readonly string\[\]/);
  });

  it("OVER-CORRECTION: the one real detector is NOT removed for being narrow", () => {
    // chartMarketStatePublisher holds the system's only reachable producer.
    // Deleting it because it is currently the only one would destroy the
    // capability rather than disclose its narrowness.
    const src = codeOnly(read(PUBLISHER));
    expect(src).toMatch(/contradictions\.push\(/);
  });

  it("the eight named dimensions are declared in ONE place", () => {
    // `/command-deck` renders `0/8 dimensions resolved`; any claim about "all
    // of WM's determinations" has to agree with that count.
    expect(MARKET_STATE_DIMENSION_KEYS).toHaveLength(8);
    expect(new Set(MARKET_STATE_DIMENSION_KEYS).size).toBe(8);
    const src = codeOnly(read(STATE));
    for (const key of MARKET_STATE_DIMENSION_KEYS) {
      expect(src).toMatch(new RegExp(`${key}: MarketStateDimension`));
    }
  });

  it("OVER-CORRECTION: surfaces that only ESCALATE on contradictions keep their silence", () => {
    // HeroTruth, WhyInspector and the Passport panel render a contradiction
    // badge only when the count is > 0. They assert nothing at zero, so they
    // were never lying and are out of scope. Rewriting them to shout
    // "undetectable" everywhere would be design theater.
    const hero = codeOnly(read("src/components/command-deck/HeroTruth.tsx"));
    expect(hero).toMatch(/contradictions\.length > 0/);
    const why = codeOnly(read("src/components/command-deck/WhyInspector.tsx"));
    expect(why).toMatch(/contradictions\.length > 0/);
  });
});
