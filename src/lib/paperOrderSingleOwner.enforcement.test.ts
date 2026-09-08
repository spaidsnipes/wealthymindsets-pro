/**
 * THE ORDER CONTRACT HAS ONE OWNER — enforcement.
 *
 * ── The failure this exists to prevent, which already happened ───────────────
 *
 * `/paper/page.tsx` declared private `Order`, `Position`, `Trade`, `OrderSide`,
 * `OrderType` and `OrderStatus` that duplicated `paperTrade.ts`'s exports. A
 * prior shift knew and left a comment arguing it was safe: "structural typing
 * makes the two shapes interchangeable" and "if either drifts, the compiler
 * catches it here."
 *
 * The compiler did not catch it. When the canonical `Order` gained the OPTIONAL
 * `decisionId` in 1588556, the shadow remained structurally assignable —
 * OPTIONAL FIELDS DO NOT BREAK ASSIGNABILITY — so nothing failed while the
 * surface silently lost the ability to see the field. `submit()` spread a real
 * decision id onto every order, persistence carried it, and the blotter could
 * not read it back. The defect was invisible for three commits and only
 * surfaced when a surface finally tried to READ the property.
 *
 * That is the general shape: a duplicate type is "compatible" right up until
 * the canonical owner learns something new, and then it teaches the surface
 * less than the truth, quietly. tsc cannot police this. This can.
 *
 * ── Honest scope ─────────────────────────────────────────────────────────────
 *
 * This is a source-level rule over one file's top-level declarations. It does
 * not prove /paper is correct; it proves /paper does not own a second
 * definition of a contract someone else owns (§6/§24, H21 ONE OWNER PER RULE).
 * Nothing stops a developer renaming the shadow to `LocalOrder` — but that is
 * a deliberate, reviewable act, which is exactly the conversion this is for.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PAGE = resolve(process.cwd(), "src/app/paper/page.tsx");
const src = readFileSync(PAGE, "utf8");
const OWNER = resolve(process.cwd(), "src/lib/paperTrade.ts");
const ownerSrc = readFileSync(OWNER, "utf8");

/**
 * Names paperTrade.ts owns — DERIVED FROM THE OWNER, NOT HAND-LISTED.
 *
 * The first version of this file hardcoded the six names the compiler had just
 * burned us with. `EquityPoint` was a seventh shadow in the same file, and the
 * hand-written list walked straight past it and reported green. A guard built
 * from the injury covers only the injury; the owner's export surface is the
 * actual thing being protected, so the owner's export surface is what we read.
 */
const OWNED_BY_PAPERTRADE: readonly string[] = Array.from(
  ownerSrc.matchAll(/^export\s+(?:interface|type)\s+([A-Z][A-Za-z0-9_]*)/gm),
  (m) => m[1],
);

/**
 * The names /paper actually uses. Only these must be IMPORTED — the owner
 * exports plenty this surface has no business knowing about, and demanding it
 * import them would teach the next person to add unused imports to appease a
 * test.
 */
const USED_BY_PAPER = [
  "Order", "Position", "Trade", "OrderSide", "OrderType", "OrderStatus",
  "EquityPoint",
] as const;

describe("paper order contract — one owner", () => {
  /**
   * THE GUARD ON THE GUARD. `it.each([])` registers NO tests and reports a
   * green file. If the derivation regex ever stops matching — someone
   * reformats the owner's exports, or a build step rewrites them — this whole
   * rule set would evaporate silently and we would learn nothing until the
   * next shadow shipped. That is the same class of failure as the shadow
   * itself: a check that has quietly stopped checking.
   */
  it("derives a real list from the owner, and would notice if it did not", () => {
    expect(
      OWNED_BY_PAPERTRADE.length,
      "derived zero names from paperTrade.ts — every rule below is now vacuous",
    ).toBeGreaterThanOrEqual(10);
    // Spot-anchors: the contract's spine must be in the derived list.
    for (const anchor of ["Order", "Position", "Trade", "EquityPoint"]) {
      expect(OWNED_BY_PAPERTRADE, `${anchor} vanished from the owner`).toContain(anchor);
    }
  });

  it("every name /paper claims to use is genuinely owned by paperTrade", () => {
    // Stops USED_BY_PAPER drifting into a list of names nobody owns, which
    // would make the import rule below assert something meaningless.
    for (const name of USED_BY_PAPER) {
      expect(OWNED_BY_PAPERTRADE, `${name} is not exported by paperTrade.ts`).toContain(name);
    }
  });

  it.each(OWNED_BY_PAPERTRADE)(
    "/paper does not declare its own %s",
    (name) => {
      // Top-level `interface X {` / `type X =` only. Anchored to line start so
      // a nested or renamed local shape is not caught by accident.
      const declared = new RegExp(`^(?:export\\s+)?(?:interface|type)\\s+${name}\\b`, "m");
      expect(
        declared.test(src),
        `/paper/page.tsx declares its own ${name}. paperTrade.ts owns it. `
        + "A duplicate stays structurally compatible until the owner adds an "
        + "optional field, and then the surface silently sees less than the "
        + "truth — that is how decisionId went invisible for three commits.",
      ).toBe(false);
    },
  );

  it("imports the contract from its canonical owner", () => {
    expect(src).toContain("@/lib/paperTrade");
    for (const name of USED_BY_PAPER) {
      expect(src, `${name} is not imported from the owner`)
        .toMatch(new RegExp(`type\\s+${name}\\s*,`));
    }
  });

  it("the surface can actually SEE decisionId — the field that exposed this", () => {
    // Anti-vacuity. Deleting the shadows means nothing if no surface reads the
    // field the shadows were hiding; this is what makes the rule load-bearing.
    expect(src).toMatch(/ord\.decisionId/);
  });
});

/*
 * A FOURTH RULE WAS WRITTEN AND DELETED, deliberately.
 *
 * It banned the phrase that carried the false reassurance ("...shapes
 * interchangeable"). It failed immediately — on the doc comment in page.tsx
 * that QUOTES the old claim in order to explain why it was wrong. No regex
 * separates asserting a claim from quoting it, so the rule's only stable
 * outcomes were to punish the explanation or to be written around. Both are
 * worse than nothing: a sentinel that forces prose contortions teaches the
 * next person to route around sentinels.
 *
 * The three rules above have real teeth — they read declarations and imports,
 * not opinions.
 */
