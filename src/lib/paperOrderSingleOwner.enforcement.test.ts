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

/** Names paperTrade.ts owns. /paper may USE these; it may not DEFINE them. */
const OWNED_BY_PAPERTRADE = [
  "Order", "Position", "Trade", "OrderSide", "OrderType", "OrderStatus",
] as const;

describe("paper order contract — one owner", () => {
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
    for (const name of OWNED_BY_PAPERTRADE) {
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
