/**
 * PRODUCER ↔ MATCHER SYMMETRY — the silent failure this file exists to make loud.
 *
 * `selectAuctionState` reads upstream dimensions BY VALUE, through a table of
 * string matchers. `deriveStructureDimension` produces those values. Nothing in
 * the type system connects the two: the producer emits `string`, the matcher
 * accepts `string`, and they are free to disagree forever.
 *
 * FOUND WHILE WIRING, 2026-09-18. The moment `deriveStructureDimension` became
 * the STRUCTURE producer, its entire vocabulary — "HIGHER HIGHS", "LOWER LOWS",
 * "ROTATING IN RANGE" — matched NONE of the structure matchers, which were
 * still listing "bos" / "sweep" / "none" from an engine that never shipped.
 *
 * The symptom of that defect is NOTHING. No throw, no red test, no console
 * warning. `selectAuctionState` simply falls through every structure branch and
 * prints its fallback narrative for the rest of the product's life, while the
 * Passport beside it displays a perfectly good structure verdict.
 *
 * That is Canon Weakness #1 again — two surfaces, one instrument, one instant,
 * two answers — arriving not through a wrong computation but through two word
 * lists quietly drifting apart.
 *
 * So the vocabulary is asserted, not assumed. If a verdict is added to
 * `STRUCTURE_VERDICTS` and no matcher is taught to recognise it, this file goes
 * red on the same commit rather than in a Founder's browser six weeks later.
 */

import { describe, expect, it } from "vitest";
import { DEFAULT_AUCTION_MATCHERS } from "../selectAuctionState";
import { STRUCTURE_VERDICTS } from "../../deriveStructureDimension";
import type { MarketStateDimension } from "../../canonicalMarketState";

/** A dimension whose only interesting property is the word it carries. */
function resolvedWith(value: string): MarketStateDimension {
  return {
    resolution: "RESOLVED",
    value,
    confidence: 0.5,
    evidence: [],
    contradictions: [],
    unknowns: [],
  } as MarketStateDimension;
}

const STRUCTURE_MATCHERS = [
  DEFAULT_AUCTION_MATCHERS.structureBOS,
  DEFAULT_AUCTION_MATCHERS.structureSweep,
  DEFAULT_AUCTION_MATCHERS.structureNone,
] as const;

describe("every STRUCTURE verdict the producer can emit is recognised downstream", () => {
  const verdicts = Object.values(STRUCTURE_VERDICTS);

  it("has verdicts to check at all (guards against an empty-loop pass)", () => {
    expect(verdicts.length).toBeGreaterThan(0);
  });

  it.each(verdicts)("%s is matched by at least one structure matcher", (verdict) => {
    const dim = resolvedWith(verdict);
    const matched = STRUCTURE_MATCHERS.some((m) => m.matches(dim));
    expect(
      matched,
      `No auction matcher recognises the STRUCTURE verdict "${verdict}". `
      + "Auction State will silently fall through to its fallback narrative "
      + "while the Passport shows this verdict. Teach a matcher the word.",
    ).toBe(true);
  });
});

describe("the structure verdicts land in the RIGHT bucket, not merely some bucket", () => {
  it("a trending sequence is a break of structure", () => {
    // These drive EXPANDING, which is further gated behind a resolved
    // direction and a RESPONDING displacement — so this is not an overclaim.
    expect(DEFAULT_AUCTION_MATCHERS.structureBOS.matches(
      resolvedWith(STRUCTURE_VERDICTS.HIGHER_HIGHS),
    )).toBe(true);
    expect(DEFAULT_AUCTION_MATCHERS.structureBOS.matches(
      resolvedWith(STRUCTURE_VERDICTS.LOWER_LOWS),
    )).toBe(true);
  });

  it("a rotation is the ABSENCE of a break, which is what lets BALANCING fire", () => {
    // If this ever flipped true, `regimeBalance && !structureBOS` could never
    // hold and BALANCING would become unreachable — silently.
    expect(DEFAULT_AUCTION_MATCHERS.structureBOS.matches(
      resolvedWith(STRUCTURE_VERDICTS.RANGE),
    )).toBe(false);
  });

  it("no structure verdict is mistaken for a liquidity sweep", () => {
    // Sweep is a distinct observation this producer cannot make. Claiming it
    // would put REJECTING in front of a trader off a plain swing sequence.
    for (const v of Object.values(STRUCTURE_VERDICTS)) {
      expect(DEFAULT_AUCTION_MATCHERS.structureSweep.matches(resolvedWith(v))).toBe(false);
    }
  });
});

describe("an UNRESOLVED dimension never satisfies a matcher, whatever it carries", () => {
  it("refuses a matching word on a PARTIAL dimension", () => {
    // The Passport ships structure at PARTIAL on thin windows. A matcher that
    // ignored resolution would let a downgraded reading drive a RESOLVED
    // auction verdict — an upgrade laundered through a word.
    const partial = {
      ...resolvedWith(STRUCTURE_VERDICTS.HIGHER_HIGHS),
      resolution: "PARTIAL",
    } as MarketStateDimension;
    expect(DEFAULT_AUCTION_MATCHERS.structureBOS.matches(partial)).toBe(false);
  });
});
