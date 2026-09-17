import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * EVERY `unabridged` CAP MUST ACCOUNT FOR ITSELF.
 *
 * WHY THIS FILE EXISTS. The WORKSPACE equipment grammar promises that ENTER
 * takes the trader from a docked preview to the complete experience. Panels keep
 * that promise with the house pattern
 *
 *     const <name>Cap = unabridged ? Number.POSITIVE_INFINITY : N;
 *
 * — Infinity, not a bigger number, because "as many as I was handed" is the
 * rule. The docked view therefore shows N and holds the rest.
 *
 * A row that simply STOPS at N is the panel showing the trader SOME of the
 * evidence while looking exactly like a panel that had shown them ALL of it.
 * Declining to draw something you are holding is a display choice, and a display
 * choice has to say so. So each cap owes a visible remainder: "+K more".
 *
 * WHAT MADE IT A RULE. A live audit walked all six WORKSPACE tenants on prod and
 * compared drawer text against full-screen text. Three came back byte-identical.
 * The question "is that a wiring defect or is the content simply not deep right
 * now?" could only be answered by querying the DOM for what each panel was
 * withholding — and two of the four caps in the codebase rendered their
 * remainder with no attribute on it, so there was nothing to query. The
 * disclosure existed for a human reading the screen and did not exist for anyone
 * auditing it. This test closes that: the remainder must be MARKED, not merely
 * drawn.
 *
 * (The audit's verdict, for the record: not a defect. `decision-chain` had two
 * hints against a cap of three, and `personal-edge` / `behaviour-mirror` were
 * honest empty states with nothing deeper to show. The wiring was right; the
 * INSTRUMENT for proving it was missing.)
 *
 * The rule is deliberately about the MARKER and not the text. Wording is a
 * copy decision and belongs to whoever owns the panel; being auditable is not.
 */

const SRC = join(__dirname, "..", "..", "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "__tests__") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(p) && !/\.test\.tsx$/.test(p)) out.push(p);
  }
  return out;
}

/** `const hintCap = unabridged ? Number.POSITIVE_INFINITY : 3;` → "hintCap". */
const CAP_DECL =
  /const\s+([A-Za-z_$][\w$]*)\s*=\s*unabridged\s*\?\s*Number\.POSITIVE_INFINITY\s*:/g;

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

interface Cap {
  readonly file: string;
  readonly name: string;
  readonly src: string;
}

function allCaps(): readonly Cap[] {
  const caps: Cap[] = [];
  for (const file of walk(SRC)) {
    const src = stripComments(readFileSync(file, "utf8"));
    CAP_DECL.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = CAP_DECL.exec(src)) !== null) {
      caps.push({ file: file.slice(SRC.length + 1), name: m[1], src });
    }
  }
  return caps;
}

describe("every unabridged cap accounts for itself", () => {
  it("finds the caps at all — a scan that matches nothing proves nothing", () => {
    // Anti-vacuity. If the house pattern is ever renamed, every assertion below
    // would pass over an empty list and this file would go quietly useless.
    expect(
      allCaps().length,
      "no `unabridged ? Number.POSITIVE_INFINITY : N` cap was found anywhere in " +
        "src/. Either the house pattern was renamed — in which case re-pin " +
        "CAP_DECL to the new spelling rather than deleting this file — or the " +
        "caps are gone and the ENTER promise is no longer kept by anyone.",
    ).toBeGreaterThanOrEqual(4);
  });

  it("caps what it was given — every cap is actually used to slice", () => {
    for (const cap of allCaps()) {
      expect(
        cap.src,
        `${cap.file}: \`${cap.name}\` is declared as an unabridged cap but is ` +
          "never used to slice anything. A cap that caps nothing is a prop " +
          "that looks honoured and is not — this is the ENTER-is-only-a-resize " +
          "failure with a decoy in place of the fix.",
      ).toContain(`slice(0, ${cap.name})`);
    }
  });

  it("names what it withholds with an auditable marker", () => {
    for (const cap of allCaps()) {
      // A `data-*-withheld` attribute. The suffix is what makes the disclosure
      // queryable from the live DOM; the prefix is the panel's own business.
      expect(
        /data-[a-z0-9-]*-withheld/.test(cap.src),
        `${cap.file}: \`${cap.name}\` holds rows back in the docked view but ` +
          "the panel renders no `data-…-withheld` element. The trader may well " +
          "be told '+K more' on screen — the point is that nothing can CHECK " +
          "it. A live ENTER audit cannot distinguish 'this panel is withholding " +
          "nothing right now' from 'this panel is withholding silently', and " +
          "that is the exact ambiguity that let ENTER-is-only-a-resize live.",
      ).toBe(true);
    }
  });
});
