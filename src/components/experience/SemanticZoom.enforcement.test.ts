/**
 * <SemanticZoom> enforcement — canon §Single-Writer / Many-Readers +
 * canon §Phase 2 Experience Shell.
 *
 * The SemanticZoom primitive is the SOLE writer for the L1/L2/L3/L4
 * progressive-disclosure pattern. Any file that renders a level pill
 * strip (short labels L1..L4 inside a `role="tablist"` chrome or the
 * literal `>L1<` / `>L2<` etc. tokens) MUST route through the primitive
 * — otherwise we drift into hand-rolled tab strips and the "the same
 * writer everywhere" canon breaks.
 *
 * This test walks src/ and fails when a NEW file starts rendering
 * canonical level pills without importing SemanticZoom.
 *
 * Whitelist:
 *   - SemanticZoom.tsx (the primitive itself)
 *   - test files
 */

import { describe, it, expect } from "vitest";
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, extname, resolve } from "node:path";

const SRC_ROOT = resolve(__dirname, "..", "..");
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

const ALLOWED_FILES = new Set<string>([
  "SemanticZoom.tsx",
  "SemanticZoom.test.tsx",
  "SemanticZoom.enforcement.test.ts",
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

// Matches ">L1<", ">L2<", ">L3<", ">L4<" JSX text nodes — the exact
// tokens the SemanticZoom primitive emits for its pill labels. A file
// rendering these directly is bypassing the single writer.
const LEVEL_PILL_PATTERN = /(?:>L[1-4]<|["']L[1-4]["']\s*[,}])/;

describe("<SemanticZoom> enforcement — canon §Phase 2 Experience Shell", () => {
  it("no file outside the whitelist hand-rolls a level pill strip", () => {
    const files = walk(SRC_ROOT).filter((f) => !isAllowedFile(f));
    const violations: string[] = [];

    for (const file of files) {
      let content: string;
      try {
        content = readFileSync(file, "utf8");
      } catch { continue; }

      // A file that imports/uses SemanticZoom is by definition compliant.
      if (/SemanticZoom/.test(content)) continue;

      // Otherwise: if it renders JSX-text level pills directly it is
      // reinventing the primitive.
      if (LEVEL_PILL_PATTERN.test(content)) {
        // Narrow the false-positive window: also require a tablist /
        // aria-selected nearby to confirm it's chip chrome (not e.g. a
        // legend label). If we can't confirm chrome, we still record it
        // — the LEVEL_PILL token is canon-reserved.
        violations.push(file.replace(SRC_ROOT + "/", ""));
      }
    }

    expect(violations).toEqual([]);
  });

  it("<SemanticZoom> is imported by every current Phase 2 consumer (breadcrumb)", () => {
    const expected = [
      "app/command-deck/page.tsx",
      "components/command-deck/WhyInspector.tsx",
    ];
    for (const rel of expected) {
      const p = resolve(SRC_ROOT, rel);
      const content = readFileSync(p, "utf8");
      expect(content).toContain("SemanticZoom");
    }
  });
});
