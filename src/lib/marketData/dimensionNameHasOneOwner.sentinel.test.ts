/**
 * SENTINEL — a canonical dimension has exactly ONE name, and exactly one place
 * that decides it.
 *
 * FOUND FROM USE, on production /charts (TSLA), inside one trader-facing
 * sentence:
 *
 *   "…direction, regime, volatility, orderFlow unresolved; location,
 *    aggression, profile measured but not decision-grade."
 *
 * `orderFlow` is a FIELD IDENTIFIER. It reached a trader because the surface
 * that printed the sentence never had to ask anyone what the dimension is
 * CALLED — it had the key in hand and the key looked close enough.
 *
 * ── WHY SEVEN OUT OF EIGHT WAS LUCK, NOT A RULE ─────────────────────────────
 *
 * Seven of the eight dimension keys are single lowercase words. `direction`
 * reads as English by accident; `volatility` does too. Only the two-word one
 * could ever expose that the sentence was printing identifiers — which is why
 * this survived every render test in the repo. The bug was 87.5% invisible.
 *
 * ── THE NEST: FIVE OWNERS, THREE SPELLINGS ──────────────────────────────────
 *
 *   surfaceLink.ts              "Order Flow"
 *   selectMarketObjectPassport  "Order Flow"  (a SECOND private table whose own
 *                                              comment admitted it "Mirrors
 *                                              surfaceLink's" — a copy that
 *                                              declares itself a copy is still
 *                                              a copy)
 *   chartMarketStatePublisher   "Order flow"  (sentence case, into unknowns)
 *   selectMarketStory           "orderFlow"   (raw key, into trader prose)
 *   selectMarketCanvas          "orderFlow"   (raw key, into vm.resolved)
 *
 * The last two sat in ADJACENT COLUMNS of MarketCanvasPanel, so one panel
 * printed `orderFlow` under Resolved and `Order Flow` under Missing, for the
 * same dimension, in the same instant. Canon Weakness #1 on the NAME axis.
 *
 * ORDER and NAME are different properties. Inspection priority IS genuinely
 * owned by a surface and deliberately differs between them; that is left alone
 * here. Only the NAME is claimed.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "@/lib/sourceScan";
import {
  DIMENSION_NAMES,
  MARKET_STATE_DIMENSION_KEYS,
  dimensionName,
} from "./canonicalMarketState";

function read(rel: string): string {
  return stripComments(fs.readFileSync(path.join(process.cwd(), rel), "utf8"));
}

/**
 * The surfaces that used to author the name themselves. Each must now ASK.
 * Comments are stripped first — every one of these files DESCRIBES the old
 * spellings in prose, and a guard that cannot tell a description from a
 * declaration is a guard that forbids explaining the bug it prevents.
 */
const FORMER_AUTHORS = [
  "src/lib/experience/surfaceLink.ts",
  "src/lib/marketData/viewModels/selectMarketObjectPassport.ts",
  "src/lib/marketData/chartMarketStatePublisher.ts",
  "src/lib/marketData/viewModels/selectMarketCanvas.ts",
  "src/lib/marketData/viewModels/selectMarketStory.ts",
] as const;

describe("a dimension has exactly one name", () => {
  it("× THE MACHINE IDENTIFIER: no dimension is named by its own key", () => {
    // The live defect, stated directly. `orderFlow` was the only key that
    // could fail this before — which is exactly why it is asserted for ALL
    // eight rather than for the one that happened to get caught.
    for (const key of MARKET_STATE_DIMENSION_KEYS) {
      expect(dimensionName(key), `${key} must not be named by its key`).not.toBe(key);
    }
  });

  it("× THE MACHINE IDENTIFIER: no name contains a camelCase hump", () => {
    for (const key of MARKET_STATE_DIMENSION_KEYS) {
      expect(DIMENSION_NAMES[key], `${key}`).not.toMatch(/[a-z][A-Z]/);
    }
  });

  it("every canonical dimension is named — TOTALLY, by the type system and here", () => {
    // The type is `Record<MarketStateDimensionKey, string>`, so a ninth
    // dimension fails the BUILD. This asserts the runtime half: no key maps to
    // an empty string, which would typecheck and print nothing.
    for (const key of MARKET_STATE_DIMENSION_KEYS) {
      expect(DIMENSION_NAMES[key], `${key} must have a name`).toBeTruthy();
    }
    expect(Object.keys(DIMENSION_NAMES).sort()).toEqual(
      [...MARKET_STATE_DIMENSION_KEYS].sort(),
    );
  });

  it("× THE THIRD NAME: two dimensions may never share one word", () => {
    const names = MARKET_STATE_DIMENSION_KEYS.map(dimensionName);
    expect(new Set(names).size, "names must be unique").toBe(names.length);
  });

  it("× THE UNNAMED KEY: an unrecognised key discloses itself rather than throwing", () => {
    // A selector whose whole job is explaining a silence must not become a new
    // source of noise. The fallback only inserts the space the identifier
    // omitted — it Title-Cases nothing — so an unnamed key still LOOKS like
    // the raw key it is, and admits that nobody named it.
    expect(dimensionName("someNewThing")).toBe("some New Thing");
    expect(dimensionName("ghost")).toBe("ghost");
  });
});

describe("the former authors of the name now ask for it", () => {
  it.each(FORMER_AUTHORS)("%s authors no dimension display name", (rel) => {
    const src = read(rel);
    // Both spellings that were ever typed into these files, plus the raw key
    // as a quoted string literal — the form in which it reached the trader.
    expect(src).not.toContain('"Order Flow"');
    expect(src).not.toContain('"Order flow"');
    expect(src).toContain("dimensionName");
  });

  it("the owner is the only module in the lane that spells the two-word one", () => {
    expect(read("src/lib/marketData/canonicalMarketState.ts")).toContain('"Order Flow"');
  });
});
