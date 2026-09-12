/**
 * Two halves, because the law has two halves.
 *
 * BEHAVIOUR — the verdict function refuses the four failure classes the canon
 * names, and refuses them BY NAME. A guard that merely returns "not allowed"
 * tells the author they are stuck; one that returns PROOF_SUBSTITUTION tells
 * them they mistook supporting evidence for proof, which is the thing they
 * actually got wrong.
 *
 * ADOPTION — no document in this repository may record a human-use or
 * guest-readiness breaker as GREEN without a receipt. This is the half that
 * fails when a future shift, having run 5,600 green tests, writes GREEN against
 * a scene nobody looked at. Nothing throws when they do that and `tsc --noEmit`
 * exits 0 when they do that.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "@/lib/sourceScan";
import {
  assessVisualClaim,
  isForbiddenSubstitute,
  VISUAL_RECEIPT_FIELDS,
  PROOF_LADDER,
  FORBIDDEN_SUBSTITUTES,
  NON_PROVING_RUNG,
  type VisualClaim,
} from "./visualReceipt";

/** A claim that is admissible, built from the owner's own field list. */
function completeClaim(over: Partial<VisualClaim> = {}): VisualClaim {
  return {
    claimedState: "GREEN",
    proofMethod: "BROWSER_INTEGRATION",
    // Driven off the owner's table rather than a retyped list, so a field added
    // to the contract later is covered on the day it is added.
    fieldsPresent: [...VISUAL_RECEIPT_FIELDS],
    ...over,
  };
}

describe("assessVisualClaim — a green must be earned the way the criterion asked", () => {
  it("admits a complete, currently-observed receipt", () => {
    const v = assessVisualClaim(completeClaim());
    expect(v.state).toBe("GREEN");
    expect(v.admissible).toBe(true);
    expect(v.failureClass).toBeNull();
  });

  it("calls a typecheck-and-tests green PROOF_SUBSTITUTION, not merely incomplete", () => {
    // The live shape of this defect: every input true, conclusion unsupported.
    const v = assessVisualClaim(
      completeClaim({
        proofMethod: null,
        substitutesOffered: ["typecheck", "unit tests"],
      }),
    );
    expect(v.failureClass).toBe("PROOF_SUBSTITUTION");
    expect(v.state).toBe("YELLOW");
    // And it points at the ladder, so the author knows what to do next.
    expect(v.reason).toContain("BROWSER_INTEGRATION");
  });

  it("calls the bottom rung TOOL_ESCAPE rather than accepting it as a method", () => {
    // HUMAN_PROOF_REQUIRED is a legal place to STOP and an illegal place to
    // claim GREEN. Conflating those is the loophole the canon closes.
    const v = assessVisualClaim(completeClaim({ proofMethod: NON_PROVING_RUNG }));
    expect(v.failureClass).toBe("TOOL_ESCAPE");
    expect(v.state).toBe("YELLOW");
  });

  it("calls a pre-change screenshot STALE_VISUAL even when everything else is complete", () => {
    // The author DID look — at the wrong moment. That deserves its own name.
    const v = assessVisualClaim(completeClaim({ evidencePredatesChange: true }));
    expect(v.failureClass).toBe("STALE_VISUAL");
    expect(v.state).toBe("YELLOW");
  });

  it("calls a bare green with nothing offered FALSE_VISUAL_GREEN", () => {
    const v = assessVisualClaim(completeClaim({ proofMethod: null }));
    expect(v.failureClass).toBe("FALSE_VISUAL_GREEN");
  });

  it("refuses an observed scene whose receipt is incomplete, and names the gap", () => {
    const v = assessVisualClaim(completeClaim({ fieldsPresent: ["SCENE_ID", "ROUTE"] }));
    expect(v.admissible).toBe(false);
    expect(v.missingFields).toContain("OBSERVED_VISIBLE_BEHAVIOR");
    expect(v.reason).toContain("OBSERVED_VISIBLE_BEHAVIOR");
  });

  it("requires EVERY field the contract lists — one at a time", () => {
    // Drives the owner's table. If a field is added to the contract and the
    // verdict function forgets to require it, this fails for that field.
    for (const field of VISUAL_RECEIPT_FIELDS) {
      const withoutIt = VISUAL_RECEIPT_FIELDS.filter((f) => f !== field);
      const v = assessVisualClaim(completeClaim({ fieldsPresent: withoutIt }));
      expect(v.admissible, `omitting ${field} must not still be admissible`).toBe(false);
      expect(v.missingFields).toContain(field);
    }
  });

  it("accepts every real rung of the ladder as proof, and only the last one not", () => {
    for (const rung of PROOF_LADDER) {
      const v = assessVisualClaim(completeClaim({ proofMethod: rung }));
      if (rung === NON_PROVING_RUNG) {
        expect(v.admissible, `${rung} must not prove a GREEN`).toBe(false);
      } else {
        expect(v.admissible, `${rung} is a legal rung and must prove a GREEN`).toBe(true);
      }
    }
  });

  it("leaves a cautious author's YELLOW alone", () => {
    // The function can only refuse a green. Upgrading a claim would be
    // inventing confidence nobody asked for.
    const v = assessVisualClaim(completeClaim({ claimedState: "YELLOW", proofMethod: null }));
    expect(v.state).toBe("YELLOW");
    expect(v.admissible).toBe(true);
    expect(v.failureClass).toBeNull();
  });

  it("recognises every forbidden substitute the canon lists", () => {
    for (const s of FORBIDDEN_SUBSTITUTES) {
      expect(isForbiddenSubstitute(s), `${s} is on the canon's list`).toBe(true);
      expect(isForbiddenSubstitute(`  ${s.toUpperCase()}  `)).toBe(true);
    }
    expect(isForbiddenSubstitute("a screen recording of the live route")).toBe(false);
  });
});

/**
 * The import, not the module path. A source scan that matches a bare path stays
 * green when a mere CODE COMMENT names the module — that miss has been caught
 * twice on this codebase already.
 */
const OWNER_IMPORT = 'from "@/lib/ops/visualReceipt"';

const OWNER = "src/lib/ops/visualReceipt.ts";

function read(rel: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");
}

describe("visualReceipt — the law has exactly one executable owner", () => {
  it("THE MEASURED GAP: the owner module exists", () => {
    expect(
      fs.existsSync(path.resolve(process.cwd(), OWNER)),
      `${OWNER} is missing. The NO-ESCAPE VISUAL VERIFICATION BREAKER then lives only in ` +
        "Drive, and a document cannot refuse a commit",
    ).toBe(true);
  });

  it("no other module retypes the receipt contract", () => {
    // G2: exactly one owner; consumers derive/import, never retype. A second
    // copy of an evidence standard is a standard that silently weakens — the
    // day the canon adds a field, every hand-typed checker keeps passing
    // documents that are now incomplete.
    const roots = ["src/lib", "src/app", "scripts"];
    const offenders: string[] = [];
    for (const root of roots) {
      const dir = path.resolve(process.cwd(), root);
      if (!fs.existsSync(dir)) continue;
      const stack = [dir];
      while (stack.length) {
        const cur = stack.pop()!;
        for (const entry of fs.readdirSync(cur, { withFileTypes: true })) {
          const full = path.join(cur, entry.name);
          if (entry.isDirectory()) {
            stack.push(full);
            continue;
          }
          if (!/\.(ts|tsx|mjs)$/.test(entry.name)) continue;
          const rel = path.relative(process.cwd(), full);
          if (rel === OWNER || rel === "src/lib/ops/visualReceipt.test.ts") continue;
          // Judge what a file RUNS, not what it says about itself. Prose is
          // allowed to quote the contract; code is not allowed to restate it.
          const code = stripComments(fs.readFileSync(full, "utf8"));
          const restatesLadder =
            code.includes("COMPUTER_USE_SCREEN_VIEW") && code.includes("BROWSER_INTEGRATION");
          const restatesFields =
            code.includes("VISUAL_PROOF_METHOD") && code.includes("OBSERVED_VISIBLE_BEHAVIOR");
          if ((restatesLadder || restatesFields) && !code.includes(OWNER_IMPORT)) {
            offenders.push(rel);
          }
        }
      }
    }
    expect(
      offenders,
      `these files restate the visual-receipt contract instead of importing it from ${OWNER}: ` +
        offenders.join(", "),
    ).toEqual([]);
  });

  it("the owner encodes the ladder as an ORDER, not an unordered set", () => {
    // The ladder's whole content is that rung 1 failing sends you to rung 2.
    // A Set would typecheck, pass a membership test, and lose the instruction.
    const code = stripComments(read(OWNER));
    expect(code).toContain("PROOF_LADDER = [");
    expect(PROOF_LADDER[0]).toBe("BROWSER_INTEGRATION");
    expect(PROOF_LADDER[PROOF_LADDER.length - 1]).toBe(NON_PROVING_RUNG);
  });

  it("the owner refuses to let the bottom rung carry a GREEN", () => {
    // Stated as a source-level guard as well as a behavioural one, because the
    // realistic rot is someone "simplifying" the special case away: with it
    // gone, every tool failure becomes a legal GREEN and the law inverts.
    //
    // THIS ASSERTION WAS WEAKER ON ITS FIRST WRITING, and the failure-prove
    // caught it. It read `toContain("NON_PROVING_RUNG")` — and when the
    // enforcement branch was actually deleted, it STAYED GREEN, because the
    // identifier still appears in its own `export const` and `TOOL_ESCAPE`
    // still appears in the `VisualFailureClass` union. A declaration is not an
    // enforcement. Matching the comparison itself is the only form of this
    // check that can tell the difference.
    const code = stripComments(read(OWNER));
    expect(
      code,
      "the owner no longer compares proofMethod against the non-proving rung, so the " +
        "bottom of the ladder can now carry a GREEN and the whole law inverts",
    ).toContain("claim.proofMethod === NON_PROVING_RUNG");
  });
});
