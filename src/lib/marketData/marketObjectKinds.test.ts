/**
 * KINDS AND SLOTS — the laws, and the overbuild each one prevents.
 */

import { describe, expect, it } from "vitest";

import * as kindsModule from "./marketObjectKinds";
import {
  checkGeometry,
  homeForRejectedKind,
  isMarketObjectKind,
  MARKET_OBJECT_KINDS,
  MARKET_OBJECT_STATES,
  OPTIONAL_ATTACHMENT_SLOTS,
  P0_OBJECT_KINDS,
  REJECTED_KIND_NAMES,
  SHARED_ATTACHMENT_SLOTS,
  type MarketObject,
  type MarketObjectKind,
} from "./marketObjectKinds";

describe("the closed kinds", () => {
  it("IS EXACTLY EIGHT — stop there for consumer chrome", () => {
    expect(MARKET_OBJECT_KINDS).toEqual([
      "LEVEL", "ZONE", "INVALIDATION", "GAP", "STRUCTURE", "LIQUIDITY", "ANCHOR",
    ]);
  });

  it("P0 is the three that let a trader trade the underlying", () => {
    // Location, the band it sits in, and the line it dies on. Everything else
    // is depth, and depth that arrives before these three is the mall.
    expect(P0_OBJECT_KINDS).toEqual(["LEVEL", "ZONE", "INVALIDATION"]);
  });

  it("NO READING IS A KIND — the overbuild, refused by name", () => {
    // OB, FVG, MB, IFVG, BPR are five names for geometry that folds into three
    // shapes. Promoting a reading to a kind is how the house would take a side
    // in a strategy argument it has said it does not own.
    for (const rejected of REJECTED_KIND_NAMES) {
      expect(isMarketObjectKind(rejected), rejected).toBe(false);
    }
  });

  it("NAMES THE HOME rather than merely refusing — a refusal gets built anyway", () => {
    // "We don't support that" is how the kind gets added under a different
    // spelling next quarter. "That is a ZONE" is an answer.
    expect(homeForRejectedKind("ORDER_BLOCK")).toBe("ZONE");
    expect(homeForRejectedKind("order_block")).toBe("ZONE");
    expect(homeForRejectedKind("  Wyckoff  ")).toBe("STRUCTURE");
    expect(homeForRejectedKind("BPR")).toBe("GAP");
    for (const rejected of REJECTED_KIND_NAMES) {
      expect(homeForRejectedKind(rejected), rejected).not.toBeNull();
    }
  });

  it("an unknown shape gets NULL, not the roomiest kind", () => {
    // Folding an unrecognised name into ZONE would file it as understood.
    expect(homeForRejectedKind("SOMETHING_NOBODY_HAS_DEFINED")).toBeNull();
    expect(homeForRejectedKind("")).toBeNull();
  });
});

describe("a kind is never a permission", () => {
  it("EXPORTS NOTHING THAT COULD BE READ AS CONSENT", () => {
    // The canon's sharpest rejection: "Kind = permission — touched OB = GO."
    // Whether capital may move is answered by the gates, the Evidence Debt and
    // the fidelity algebra. A shape is not a reason, and the safest way to keep
    // it that way is for the affirmative function to not exist.
    const surface = Object.keys(kindsModule as Record<string, unknown>);
    for (const name of surface) {
      expect(name, `${name} reads as permission`).not.toMatch(
        /tradeable|tradable|canTrade|isValidEntry|allowsGo|permits/i,
      );
    }
  });
});

describe("the shared slots — attachments must not differ by kind", () => {
  const object = (kind: MarketObjectKind): MarketObject => ({
    objectId: "o1", kind, symbolId: "TSLA", sessionId: "s1",
    priceLow: 100, priceHigh: kind === "ZONE" || kind === "GAP" || kind === "STRUCTURE" || kind === "LIQUIDITY" ? 105 : 100,
    birthBarId: "b1", testBarIds: [], lastResponseBarId: null, invalidationPrice: null,
    state: "ALIVE", evidenceIds: [], decay: 0, asOf: 1, fidelityAtBirth: "INDICATIVE",
  });

  it("EVERY KIND CARRIES EVERY SLOT — this is the one-drawer law", () => {
    // If a single kind could omit a slot, the Passport would need to know which
    // kind it is looking at, and the drawer layout would start branching. Eight
    // inspects, arriving one field at a time.
    for (const kind of MARKET_OBJECT_KINDS) {
      const o = object(kind);
      for (const slot of SHARED_ATTACHMENT_SLOTS) {
        expect(slot in o, `${kind} is missing ${String(slot)}`).toBe(true);
      }
    }
  });

  it("NO SLOT REPRINTS A BAR", () => {
    // "Attachments reprint bars" is on the creep table. An object that stores
    // its own open and close is a second market with a second past.
    for (const slot of [...SHARED_ATTACHMENT_SLOTS, ...OPTIONAL_ATTACHMENT_SLOTS]) {
      expect(String(slot), String(slot)).not.toMatch(/^(open|high|low|close|volume|ohlc)$/i);
    }
    // It references the bar instead, which is the whole difference.
    expect(SHARED_ATTACHMENT_SLOTS).toContain("birthBarId");
  });

  it("STATE IS A WORD, NOT A SCORE — §15, on the object", () => {
    // An object that is 0.73 alive is a grade. The five stages say what the
    // market did to it, which is a finding rather than a judgement.
    expect(MARKET_OBJECT_STATES).toEqual(["ALIVE", "TESTED", "DEFENDED", "CONSUMED", "INVALID"]);
    for (const s of MARKET_OBJECT_STATES) expect(typeof s).toBe("string");
  });

  it("carries asOf, because an object's memory is also a claim about a moment", () => {
    expect(SHARED_ATTACHMENT_SLOTS).toContain("asOf");
    expect(SHARED_ATTACHMENT_SLOTS).toContain("fidelityAtBirth");
  });
});

describe("geometry is the ONE axis kinds may differ on", () => {
  it("A PRICE KIND IS A PRICE — and the reason is Available R", () => {
    // A thesis that dies "somewhere around here" cannot size a position,
    // because the invalidation distance is the denominator of 1R.
    for (const kind of ["LEVEL", "INVALIDATION", "ANCHOR"] as const) {
      expect(checkGeometry(kind, 100, 100).ok, kind).toBe(true);
      const band = checkGeometry(kind, 100, 105);
      expect(band.ok, kind).toBe(false);
      if (!band.ok) expect(band.reason).toMatch(/is a price, not a band/);
    }
  });

  it("a band kind may be a band, and may also be degenerate", () => {
    expect(checkGeometry("ZONE", 100, 105).ok).toBe(true);
    // A value area that has collapsed to one price is still a ZONE. Refusing it
    // would make the kind depend on the market's current width.
    expect(checkGeometry("ZONE", 100, 100).ok).toBe(true);
  });

  it("REFUSES AN INSIDE-OUT BAND rather than silently sorting it", () => {
    // Swapping the two would be the house correcting a caller's bug into a
    // plausible object, and the object would then be inspected as a finding.
    const r = checkGeometry("ZONE", 105, 100);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/inside out/);
  });

  it("refuses non-finite geometry — an object off the chart is not on it", () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(checkGeometry("ZONE", bad, 105).ok, String(bad)).toBe(false);
      expect(checkGeometry("ZONE", 100, bad).ok, String(bad)).toBe(false);
    }
  });
});
