import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

/**
 * JSX COMMENT PLACEMENT SENTINEL
 *
 * OBSERVED FAILURE (twice, same shift):
 *   A `{/* ... *\/}` comment was written between `return (` and the first
 *   JSX tag. `tsc` reported a cascade of TS1005 / TS1109 / TS1128 /
 *   TS1136 parse errors, and on the second occurrence the broken file
 *   reached `main` — because the repo's dominant guard style is
 *   source-STRING assertions, which read a file happily whether or not
 *   it parses.
 *
 * ROOT CAUSE:
 *   `{/* ... *\/}` is JSX-CHILDREN syntax. It is only valid inside an
 *   already-open JSX element. Between `return (` and the first tag we
 *   are still in a parenthesized JavaScript expression, so the braces
 *   parse as a block statement and the rest of the component collapses.
 *   The correct form in that position is a `//` line comment placed
 *   above `return (` — or below the opening tag, where JSX children
 *   really begin.
 *
 * WHY A SENTINEL AND NOT JUST A FIX:
 *   The mistake is invisible in review (it LOOKS like ordinary JSX
 *   commentary) and it is exactly the shape an agent reaches for while
 *   annotating a scene change. Annotating scene changes is the whole
 *   working method of this cutover, so the failure mode recurs. A
 *   typecheck catches it only if someone runs a typecheck AFTER the
 *   last edit; this catches it in the same suite as everything else.
 *
 * This deliberately does NOT ban JSX comments. It bans exactly one
 * position: immediately after an opening `(` of a return/arrow body.
 */

const SRC = resolve(__dirname, "..");

function collectTsx(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectTsx(full, out);
    else if (entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

describe("JSX comment placement sentinel", () => {
  it("never opens a parenthesized expression with a JSX comment", () => {
    const files = collectTsx(SRC);
    expect(files.length, "the sweep must actually find .tsx files").toBeGreaterThan(50);

    // `return (` or `=> (` followed (whitespace/newlines only) by `{/*`.
    // At that point no JSX element is open, so the braces are a block.
    const offender = /(?:return|=>)\s*\(\s*\n\s*\{\s*\/\*/;

    const broken: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      if (offender.test(source)) broken.push(file.slice(SRC.length + 1));
    }

    expect(
      broken,
      "These files open a parenthesized expression with {/* ... */}, which is a " +
        "block statement, not a JSX comment, and will not parse. Move the comment " +
        "above `return (` as a // line comment, or below the first opening tag.",
    ).toEqual([]);
  });
});
