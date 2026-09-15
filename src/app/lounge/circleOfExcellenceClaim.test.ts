import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

/**
 * AN INSTRUCTION IS A CLAIM THAT THE ACTION IS POSSIBLE.
 *
 * `/lounge` rendered "Circle of Excellence · Top 8" from `LOUNGE_TOP8`, a
 * module-level `const` fixed at `[]`. Its empty state read:
 *
 *   "Add real members to build your Circle of Excellence."
 *
 * There is no way to add one. No setter, no form, no server read, no route —
 * a whole-repo sweep finds the declaration, its length check and its map, and
 * nothing else. The sentence is an imperative handed to a reader who cannot
 * obey it.
 *
 * An empty list that reports emptiness is honest. An empty list that tells you
 * to fill it is asserting that a mechanism exists. That is the same family as
 * the invented `Profile → Contact` room on /partnerships, one step harder:
 * that named a PLACE that did not exist, this named an ACT that cannot be
 * performed.
 *
 * THE GUARD IS CONDITIONAL, NOT A BAN. It forbids the imperative only while
 * the collection has no writer. Build a real add-member path and the guard
 * goes quiet on its own — the sentence becomes true and is allowed back.
 */

const SRC = resolve(__dirname, "../..");

/** Every .ts/.tsx source file under /src, excluding tests. */
function sourceFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      const full = resolve(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.tsx?$/.test(name) || /\.test\./.test(name)) continue;
      out.push(full);
    }
  };
  walk(root);
  return out;
}

/** Source with block and line comments stripped — prose ABOUT a defect is not the defect. */
function body(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/**
 * A collection is UNWRITABLE when it is declared as an empty literal and
 * nothing anywhere in /src ever assigns to it or hands it to a setter.
 *
 * Deliberately conservative: any sign of a writer at all makes it writable,
 * so this can only ever under-report. It must never call a real, fillable
 * list unwritable.
 */
function isUnwritable(name: string, files: string[]): boolean {
  let declaredEmpty = false;
  for (const file of files) {
    const b = body(readFileSync(file, "utf8"));
    const decl = new RegExp(`const\\s+${name}\\s*(?::[^=]+)?=\\s*\\[\\s*\\]`).test(b);
    if (decl) declaredEmpty = true;
    // Any assignment, push, or state setter for this symbol counts as a writer.
    if (new RegExp(`${name}\\s*=\\s*[^=\\[]`).test(b)) return false;
    if (new RegExp(`${name}\\.(push|splice|unshift|pop)\\b`).test(b)) return false;
    if (new RegExp(`set${name.replace(/_/g, "")}\\b`, "i").test(b)) return false;
  }
  return declaredEmpty;
}

/** The literal strings a page renders when a collection is empty. */
function emptyStateStrings(src: string, name: string): string[] {
  const b = body(src);
  const at = b.indexOf(`${name}.length === 0`);
  if (at === -1) return [];
  // The ternary's true-branch, up to the `) :` that opens the populated branch.
  const tail = b.slice(at);
  const end = tail.indexOf(") :");
  const branch = end === -1 ? tail.slice(0, 600) : tail.slice(0, end);
  return [...branch.matchAll(/>([^<>{}]*[a-z][^<>{}]*)</g)].map((m) => m[1].trim()).filter(Boolean);
}

/**
 * Copy that hands the reader a TASK rather than describing a STATE.
 *
 * The distinction is grammatical mood, not vocabulary. A first draft of this
 * guard matched the bare word `add` anywhere and rejected the honest
 * replacement "this build has no way to add one" — which is a description of
 * an absent mechanism, the exact opposite of the defect. A word is not a mood.
 *
 * So: the verb must open the sentence (true imperative), or be handed to the
 * reader in the second person.
 */
const TASK_VERB = "add|create|invite|start|build|connect|choose|pick|set up|sign up";
const IMPERATIVE = new RegExp(
  `(^|[.!?—]\\s*)(${TASK_VERB})\\b|\\byou\\s+(can|should|must|may)\\s+(${TASK_VERB})\\b`,
  "i",
);

const FILES = sourceFiles(SRC);

const SURFACES: Array<{ label: string; file: string; symbol: string }> = [
  { label: "/lounge", file: resolve(__dirname, "./page.tsx"), symbol: "LOUNGE_TOP8" },
  { label: "/profile", file: resolve(SRC, "app/profile/page.tsx"), symbol: "CIRCLE_OF_EXCELLENCE" },
];

describe("× AN INSTRUCTION IS A CLAIM THAT THE ACTION IS POSSIBLE", () => {
  it("× THE VACUOUS SWEEP: the walker reads a real, populated source tree", () => {
    // Without this, every assertion below passes on an empty file list.
    expect(FILES.length).toBeGreaterThan(50);
    expect(FILES).toContain(resolve(__dirname, "./page.tsx"));
  });

  it("× THE PHANTOM WRITER: both Circle collections really are unwritable today", () => {
    // Non-vacuity for the conditional guard. If this ever fails because a real
    // add-member path shipped, DELETE this expectation and the guard relaxes
    // correctly — it does not mean the product regressed.
    for (const { symbol } of SURFACES) {
      expect(isUnwritable(symbol, FILES), `${symbol} has a writer`).toBe(true);
    }
  });

  it.each(SURFACES)(
    "× THE IMPOSSIBLE INSTRUCTION: $label does not tell the reader to fill a list it cannot fill",
    ({ file, symbol }) => {
      const src = readFileSync(file, "utf8");
      const strings = emptyStateStrings(src, symbol);
      expect(strings.length).toBeGreaterThan(0); // the empty state must still say something
      if (!isUnwritable(symbol, FILES)) return; // a real writer exists — instruction is honest now
      for (const s of strings) {
        expect(s, `empty-state copy issues an impossible instruction: "${s}"`).not.toMatch(IMPERATIVE);
      }
    },
  );

  it("the emptiness is still disclosed — the fix was honesty, not deletion", () => {
    const lounge = body(readFileSync(resolve(__dirname, "./page.tsx"), "utf8"));
    expect(lounge).toContain("Circle of Excellence");
    expect(lounge).toMatch(/LOUNGE_TOP8\.length === 0/);
    expect(lounge).toMatch(/no way to add/i);
  });
});
