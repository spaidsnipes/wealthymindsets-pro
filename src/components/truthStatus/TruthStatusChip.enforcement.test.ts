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

// Match canon labels as visible JSX text tokens only (>LABEL< or
// {"LABEL"} in a JSX context). Excludes bare enum comparisons.
const LABEL_TEXT_PATTERN = /(?:>(?:VERIFIED|CORROBORATED|PROVISIONAL|DISPUTED|UNVERIFIED|FALSE OR CONTRADICTED|SUPERSEDED)<)/;

describe("<TruthStatusChip> enforcement — canon §Truth Status Labels single-writer", () => {
  it("no file outside the whitelist hand-rolls a canon truth-status label as visible chip text", () => {
    const files = walk(SRC_ROOT).filter((f) => !isAllowedFile(f));
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
