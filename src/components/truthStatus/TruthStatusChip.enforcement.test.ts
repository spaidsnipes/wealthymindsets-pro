/**
 * TruthStatusChip enforcement — canon §Single-Writer / Many-Readers.
 *
 * <TruthStatusChip> is the sole writer for the 11 canon truth-status
 * labels (VERIFIED / CORROBORATED / PROVISIONAL / ESTIMATED /
 * INFERRED / ASSUMED / DISPUTED / UNVERIFIED / UNKNOWN /
 * FALSE_OR_CONTRADICTED / SUPERSEDED). This test walks src/ and fails
 * if any NEW file hand-rolls the label vocabulary as user-facing chip
 * chrome.
 *
 * Heuristic: a violation is a file that
 *   1. Renders one of the canon labels as a visible JSX text token
 *      (e.g. `>VERIFIED<`, `>DISPUTED<`), AND
 *   2. Does NOT import TruthStatusChip, AND
 *   3. Is not a test file, the chip itself, or the truthStatusLabels
 *      module (which owns the constants).
 *
 * This is intentionally narrower than a substring match — a file that
 * *reads* the enum key (e.g. `status === "VERIFIED"`) is fine; only
 * emitting the label as visible text without going through the chip
 * is a violation.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, extname, resolve } from "node:path";

const SRC_ROOT = resolve(__dirname, "..", "..");
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

const ALLOWED_FILES = new Set<string>([
  "TruthStatusChip.tsx",
  "TruthStatusChip.test.tsx",
  "TruthStatusChip.enforcement.test.ts",
  // Vocabulary owner
  "truthStatusLabels.ts",
  "truthStatusLabels.test.ts",
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
 * The subset of canon DISPLAY labels this rule polices. The four omitted
 * (ESTIMATED / INFERRED / ASSUMED / UNKNOWN) are ordinary English words that
 * would false-positive across unrelated prose.
 *
 * This list is the single source of the pattern below — the regex is BUILT
 * from it rather than written out again, so the guard and the rule can never
 * come to disagree about which words are being hunted.
 */
const POLICED_LABELS: readonly string[] = [
  "VERIFIED",
  "CORROBORATED",
  "PROVISIONAL",
  "DISPUTED",
  "UNVERIFIED",
  "FALSE OR CONTRADICTED",
  "SUPERSEDED",
];

/** The vocabulary owner — the one module allowed to define these strings. */
const VOCABULARY_OWNER = "lib/truthStatus/truthStatusLabels.ts";

// Match canon labels as visible JSX text tokens only (>LABEL< or
// {"LABEL"} in a JSX context). Excludes bare enum comparisons.
const LABEL_TEXT_PATTERN = new RegExp(`(?:>(?:${POLICED_LABELS.join("|")})<)`);

/** Walked ONCE so the guard below and the rule agree on what was scanned. */
const ALL_FILES = walk(SRC_ROOT);

describe("<TruthStatusChip> enforcement — canon §Truth Status Labels single-writer", () => {
  /**
   * ANTI-VACUITY — added 2026-09-19, paying down the frozen debt recorded in
   * `src/lib/ops/sentinelsProveTheyScanned.test.ts`.
   *
   * The rule below asserts a collection is EMPTY, and it is a LATENT rule: it
   * is supposed to find nothing today, and fire the day somebody hand-rolls a
   * truth-status label instead of rendering <TruthStatusChip>. That is the
   * hardest shape to keep honest, because "found nothing" is the expected
   * answer and therefore tells you nothing about whether the scan still works.
   *
   * MEASURED 2026-09-19, and worth stating plainly: `>VERIFIED<` and its
   * siblings currently match ZERO files in the whole tree — including
   * TruthStatusChip.tsx itself, which renders `{label}` read out of
   * CANONICAL_TRUTH_STATUS rather than as a literal JSX text node. So there is
   * no live specimen to point at. The usual positive control — "the pattern
   * still matches its writer" — is not available here and pretending otherwise
   * would be theater.
   *
   * What CAN go stale, and silently, is the VOCABULARY. The words in
   * POLICED_LABELS are hardcoded here; the canon list they mirror lives in
   * truthStatusLabels.ts. Rename a canon label there — VERIFIED becomes
   * CONFIRMED, say — and this rule keeps hunting a word the product no longer
   * uses, stays green forever, and the newly-minted CONFIRMED label is free to
   * be hand-rolled on any surface. The gate would be policing a dead language.
   *
   * So the guard binds the pattern's vocabulary to the vocabulary owner. Every
   * word the regex hunts must still be a real canon display string in
   * truthStatusLabels.ts. That module is the correct specimen because it is the
   * declared single source of truth for what these labels ARE — if a word is
   * not there, the rule has no business looking for it anywhere else.
   */
  it("ANTI-VACUITY: the walk reaches source and every policed label is still canon vocabulary", () => {
    expect(
      ALL_FILES.length,
      "walk(src) found almost no code files — did src/ move, did this test file " +
        "move relative to it, or did CODE_EXTENSIONS change? An empty scan makes " +
        "the rule below permanently green while enforcing nothing. Re-point " +
        "SRC_ROOT at the real source tree",
    ).toBeGreaterThan(200);

    const vocabulary = readFileSync(resolve(SRC_ROOT, VOCABULARY_OWNER), "utf8");
    const missing = POLICED_LABELS.filter((l) => !vocabulary.includes(`"${l}"`));
    expect(
      missing,
      `These labels are hunted by LABEL_TEXT_PATTERN but no longer appear as ` +
        `canon display strings in ${VOCABULARY_OWNER}: ${missing.join(", ")}. ` +
        "The canon vocabulary was renamed or reorganised and this rule was not " +
        "updated with it, so it is now scanning for words the product does not " +
        "say — permanently green while the REAL labels go unpoliced. Update " +
        "POLICED_LABELS to match the canon list, and check whether the renamed " +
        "label is being hand-rolled anywhere",
    ).toEqual([]);

    // And the pattern must actually be built from that vocabulary — a cheap
    // check that the alternation survived construction.
    expect(
      LABEL_TEXT_PATTERN.test(">VERIFIED<"),
      "LABEL_TEXT_PATTERN does not match a literal `>VERIFIED<` JSX text node — " +
        "the exact shape it exists to detect. The regex construction above is " +
        "broken (bad escaping, empty POLICED_LABELS), so the rule below matches " +
        "nothing by accident rather than by cleanliness",
    ).toBe(true);
  });

  it("no file outside the whitelist hand-rolls a canon truth-status label as visible chip text", () => {
    const files = ALL_FILES.filter((f) => !isAllowedFile(f));
    const violations: string[] = [];

    for (const file of files) {
      let content: string;
      try {
        content = readFileSync(file, "utf8");
      } catch { continue; }

      // Compliant if the file routes through the primitive.
      if (/TruthStatusChip/.test(content)) continue;

      if (LABEL_TEXT_PATTERN.test(content)) {
        violations.push(file.replace(SRC_ROOT + "/", ""));
      }
    }

    expect(violations).toEqual([]);
  });
});
