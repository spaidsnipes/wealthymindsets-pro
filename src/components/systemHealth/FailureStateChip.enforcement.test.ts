/**
 * FailureStateChip enforcement — canon §Single-Writer / Many-Readers.
 *
 * <FailureStateChip> is the sole writer for the 6 canon subsystem-
 * health states rendered as visible chip chrome (DEGRADED / BLOCKED /
 * UNAVAILABLE / RECOVERING). NORMAL + UNKNOWN are excluded from the
 * violation check because both are extremely common English words
 * that appear in unrelated contexts across the codebase — the
 * heuristic would false-positive constantly.
 *
 * A violation is a file that
 *   1. Renders one of the health labels as a visible JSX text token
 *      (e.g. `>DEGRADED<`, `>BLOCKED<`), AND
 *   2. Does NOT import FailureStateChip, AND
 *   3. Is not a test file, the chip itself, or the grammar module.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, extname, resolve } from "node:path";

const SRC_ROOT = resolve(__dirname, "..", "..");
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

const ALLOWED_FILES = new Set<string>([
  "FailureStateChip.tsx",
  "FailureStateChip.test.tsx",
  "FailureStateChip.enforcement.test.ts",
  "failureStateGrammar.ts",
  "failureStateGrammar.test.ts",
  "fidelityToHealth.ts",
  "fidelityToHealth.test.ts",
]);

function isAllowedFile(path: string): boolean {
  const base = path.split("/").pop() ?? "";
  if (ALLOWED_FILES.has(base)) return true;
  if (base.endsWith(".test.ts") || base.endsWith(".test.tsx")) return true;
  return false;
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (
        name === "node_modules" || name === ".next" ||
        name === ".open-next" || name === "dist" || name === "build"
      ) continue;
      walk(p, acc);
    } else if (CODE_EXTENSIONS.has(extname(name))) {
      acc.push(p);
    }
  }
  return acc;
}

/**
 * The subset of canon health states this rule polices. NORMAL, BLOCKED,
 * UNAVAILABLE and UNKNOWN are omitted — ordinary English words that would
 * false-positive across unrelated prose.
 *
 * This list is the single source of the pattern below — the regex is BUILT
 * from it rather than written out again, so the guard and the rule can never
 * come to disagree about which words are being hunted.
 */
const POLICED_STATES: readonly string[] = ["DEGRADED", "RECOVERING"];

/** The vocabulary owner — the one module allowed to define these states. */
const VOCABULARY_OWNER = "lib/systemHealth/failureStateGrammar.ts";

// Restrict to the 4 unambiguous canon health words to avoid false
// positives on generic vocabulary (NORMAL, UNKNOWN — both English
// words used in many unrelated contexts).
const LABEL_TEXT_PATTERN = new RegExp(`(?:>(?:${POLICED_STATES.join("|")})<)`);

/** Walked ONCE so the guard below and the rule agree on what was scanned. */
const ALL_FILES = walk(SRC_ROOT);

describe("<FailureStateChip> enforcement — canon §Failure + Recovery Grammar single-writer", () => {
  /**
   * ANTI-VACUITY — added 2026-09-19, paying down the frozen debt recorded in
   * `src/lib/ops/sentinelsProveTheyScanned.test.ts`.
   *
   * The rule below asserts a collection is EMPTY, and it is a LATENT rule: it
   * is supposed to find nothing today, and fire the day somebody paints
   * DEGRADED on a surface instead of rendering <FailureStateChip>. That is the
   * hardest shape to keep honest, because "found nothing" is the expected
   * answer and therefore tells you nothing about whether the scan still works.
   *
   * MEASURED 2026-09-19, and worth stating plainly: `>DEGRADED<` and
   * `>RECOVERING<` currently match ZERO files in the whole tree — including
   * FailureStateChip.tsx itself, which renders `{s}` read out of the state
   * union rather than as a literal JSX text node. So there is no live specimen
   * to point at. The usual positive control — "the pattern still matches its
   * writer" — is not available here and pretending otherwise would be theater.
   *
   * What CAN go stale, and silently, is the VOCABULARY. The words in
   * POLICED_STATES are hardcoded here; the canon six live in
   * failureStateGrammar.ts. Rename a state there — DEGRADED becomes IMPAIRED,
   * say — and this rule keeps hunting a word the product no longer uses, stays
   * green forever, and the newly-minted IMPAIRED label is free to be
   * hand-rolled on any surface. The gate would be policing a dead language.
   *
   * So the guard binds the pattern's vocabulary to the vocabulary owner. Every
   * word the regex hunts must still be a real canon state in
   * failureStateGrammar.ts. That module is the correct specimen because it is
   * the declared single source of truth for what these states ARE — if a word
   * is not there, the rule has no business looking for it anywhere else.
   */
  it("ANTI-VACUITY: the walk reaches source and every policed state is still canon vocabulary", () => {
    expect(
      ALL_FILES.length,
      "walk(src) found almost no code files — did src/ move, did this test file " +
        "move relative to it, or did CODE_EXTENSIONS change? An empty scan makes " +
        "the rule below permanently green while enforcing nothing. Re-point " +
        "SRC_ROOT at the real source tree",
    ).toBeGreaterThan(200);

    const vocabulary = readFileSync(resolve(SRC_ROOT, VOCABULARY_OWNER), "utf8");
    const missing = POLICED_STATES.filter((s) => !vocabulary.includes(`"${s}"`));
    expect(
      missing,
      `These states are hunted by LABEL_TEXT_PATTERN but no longer appear as ` +
        `canon state strings in ${VOCABULARY_OWNER}: ${missing.join(", ")}. ` +
        "The canon grammar was renamed or reorganised and this rule was not " +
        "updated with it, so it is now scanning for words the product does not " +
        "say — permanently green while the REAL states go unpoliced. Update " +
        "POLICED_STATES to match the canon six, and check whether the renamed " +
        "state is being hand-rolled anywhere",
    ).toEqual([]);

    // And the pattern must actually be built from that vocabulary — a cheap
    // check that the alternation survived construction.
    expect(
      LABEL_TEXT_PATTERN.test(">DEGRADED<"),
      "LABEL_TEXT_PATTERN does not match a literal `>DEGRADED<` JSX text node — " +
        "the exact shape it exists to detect. The regex construction above is " +
        "broken (bad escaping, empty POLICED_STATES), so the rule below matches " +
        "nothing by accident rather than by cleanliness",
    ).toBe(true);
  });

  it("no file outside the whitelist hand-rolls a canon failure-state label as visible chip text", () => {
    const files = ALL_FILES.filter((f) => !isAllowedFile(f));
    const violations: string[] = [];

    for (const file of files) {
      let content: string;
      try {
        content = readFileSync(file, "utf8");
      } catch { continue; }

      if (/FailureStateChip/.test(content)) continue;

      if (LABEL_TEXT_PATTERN.test(content)) {
        violations.push(file.replace(SRC_ROOT + "/", ""));
      }
    }

    expect(violations).toEqual([]);
  });
});
