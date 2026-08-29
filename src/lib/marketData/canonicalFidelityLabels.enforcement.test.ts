/**
 * canonicalFidelityLabels enforcement — Sentinel source-tree scan.
 *
 * Canon §Living Market Visual Systems (2026-08-27) LAW 5:
 *   "Generic yellow dots are prohibited."
 *
 * Canon §Legacy Surface Quarantine:
 *   "Remove or quarantine from the new production path: old yellow-dot
 *    vocabulary, old provider-specific status strips, blanket delayed
 *    labels, blanket OHLC-only badges, duplicate chart-app toolbars."
 *
 * This test walks the /src tree and fails if any of the quarantined
 * legacy phrases appear as a code STRING LITERAL (a UI copy value the
 * trader could see). Comments, canon quotes, module docstrings,
 * historical ledger references, and the enforcement test file itself
 * are exempted so the team can name what it moved away from.
 *
 * When the test fires, a new atom either:
 *   1. Rewrites the offending literal to a CANONICAL_FIDELITY_LABELS
 *      value (preferred), or
 *   2. Provides a canon amendment removing the phrase from the
 *      QUARANTINED_FIDELITY_PHRASES list (rare).
 *
 * Deliberately implemented in Node fs (not a webpack import) so the
 * test can inspect on-disk source without loading every file into the
 * module graph.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import { QUARANTINED_FIDELITY_PHRASES } from "./canonicalFidelityLabels";

const SRC_ROOT = resolve(__dirname, "..", "..");
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

// Files that are ALLOWED to mention the quarantined phrases:
//  - the canon module itself lists them by name
//  - test files may assert on them
//  - historical ledger docs live outside src/ but if any land inside,
//    respect the .ledger. naming convention.
function isAllowedFile(path: string): boolean {
  if (path.endsWith(".test.ts") || path.endsWith(".test.tsx")) return true;
  if (path.endsWith("canonicalFidelityLabels.ts")) return true;
  if (path.endsWith("canonicalFidelityLabels.enforcement.test.ts")) return true;
  return false;
}

function walkSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      // Skip node_modules, build artifacts, and next generated dirs.
      if (
        name === "node_modules" ||
        name === ".next" ||
        name === ".open-next" ||
        name === "dist" ||
        name === "build"
      ) {
        continue;
      }
      walkSourceFiles(p, acc);
    } else if (CODE_EXTENSIONS.has(extname(name))) {
      acc.push(p);
    }
  }
  return acc;
}

/**
 * Line-level match — for each quarantined phrase, scan every source
 * file for lines containing the phrase as a DOUBLE-QUOTED string
 * literal. Anything inside a `//` comment or `/* * /` block or a
 * canon-quoted docstring is skipped by a simple heuristic (line
 * trimmed starts with `*` or `//` or contains "canon" / "verbatim").
 */
function findLiteralViolations(
  file: string,
  content: string,
  phrase: string,
): { line: number; text: string }[] {
  const violations: { line: number; text: string }[] = [];
  const needle = `"${phrase}"`;
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.includes(needle)) continue;
    const trimmed = raw.trim();
    // Skip block-comment continuation, single-line comments, and
    // any line that self-labels as canon/quarantine reference.
    if (trimmed.startsWith("*")) continue;
    if (trimmed.startsWith("//")) continue;
    if (/canon|verbatim|quarantin|legacy/i.test(raw)) continue;
    violations.push({ line: i + 1, text: raw.trim() });
  }
  return violations;
}

describe("canonicalFidelityLabels — source-tree Sentinel enforcement", () => {
  it("no source file contains a quarantined phrase as a live UI string literal", () => {
    const files = walkSourceFiles(SRC_ROOT).filter((f) => !isAllowedFile(f));
    const allViolations: string[] = [];

    for (const file of files) {
      let content: string;
      try {
        content = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      for (const phrase of QUARANTINED_FIDELITY_PHRASES) {
        const hits = findLiteralViolations(file, content, phrase);
        for (const h of hits) {
          allViolations.push(`${file}:${h.line} — quarantined "${phrase}" → ${h.text}`);
        }
      }
    }

    // Empty list = canon-clean. Non-empty = Sentinel fires; the diff
    // must migrate to CANONICAL_FIDELITY_LABELS.
    expect(allViolations).toEqual([]);
  });

  it("scanner covers .ts, .tsx, .js, .jsx, .mjs, .cjs — walks recursively", () => {
    const files = walkSourceFiles(SRC_ROOT);
    // Trivial sanity: the walk must have found something (the src/
    // tree isn't empty). If this ever hits 0, the walker is broken.
    expect(files.length).toBeGreaterThan(50);
    // And it must not be pulling from node_modules by accident.
    for (const f of files) {
      expect(f).not.toContain("node_modules");
      expect(f).not.toContain(".open-next");
    }
  });
});
