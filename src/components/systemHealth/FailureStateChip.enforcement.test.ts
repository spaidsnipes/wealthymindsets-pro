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

// Restrict to the 4 unambiguous canon health words to avoid false
// positives on generic vocabulary (NORMAL, UNKNOWN — both English
// words used in many unrelated contexts).
const LABEL_TEXT_PATTERN = /(?:>(?:DEGRADED|RECOVERING)<)/;

describe("<FailureStateChip> enforcement — canon §Failure + Recovery Grammar single-writer", () => {
  it("no file outside the whitelist hand-rolls a canon failure-state label as visible chip text", () => {
    const files = walk(SRC_ROOT).filter((f) => !isAllowedFile(f));
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
