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

/** Walked ONCE so the guard below and the rule agree on what was scanned. */
const ALL_FILES = walk(SRC_ROOT);

describe("<SemanticZoom> enforcement — canon §Phase 2 Experience Shell", () => {
  /**
   * ANTI-VACUITY — added 2026-09-19, paying down the frozen debt recorded in
   * `src/lib/ops/sentinelsProveTheyScanned.test.ts`.
   *
   * The rule below asserts a collection is EMPTY, and its detection pattern is
   * unusually fragile even by the standards of this class. `LEVEL_PILL_PATTERN`
   * hunts for two very specific SHAPES — a JSX text node written exactly `>L1<`,
   * or a quoted `"L1"` immediately followed by `,` or `}`. Both are formatting
   * accidents as much as they are semantics. Run the tree through a formatter
   * that breaks JSX children onto their own line, or change the primitive's
   * label map to a template/computed form, and the regex matches nothing at all.
   *
   * The failure is silent and total: zero matches reads identically to zero
   * hand-rolled tab strips, and the single-writer canon this file exists to
   * defend would be unenforced from that commit onward.
   *
   * So the guard is a POSITIVE CONTROL against the primitive itself. SemanticZoom
   * is the one file in the tree guaranteed to emit canon level pills — it is the
   * sole writer. If the pattern cannot find them THERE, the pattern is stale.
   * Note the deliberate inversion: this asserts the ALLOWLISTED file matches.
   * Its being whitelisted is exactly why it is safe to use as the known-good
   * specimen — the rule below skips it, so nothing here can mask a violation.
   */
  it("ANTI-VACUITY: the walk reaches source and the pill pattern still matches its writer", () => {
    expect(
      ALL_FILES.length,
      "walk(src) found almost no code files — did src/ move, or did the " +
        "extension set change? An empty scan makes the rule below permanently " +
        "green while enforcing nothing",
    ).toBeGreaterThan(200);

    const primitive = readFileSync(
      resolve(SRC_ROOT, "components/experience/SemanticZoom.tsx"),
      "utf8",
    );
    expect(
      LEVEL_PILL_PATTERN.test(primitive),
      "LEVEL_PILL_PATTERN no longer matches SemanticZoom.tsx — the SOLE writer " +
        "of canon level pills. The primitive's labels were reformatted or moved " +
        "to a computed form, so this pattern now matches nothing anywhere and " +
        "the rule below is green over a tree it can no longer read. Re-derive " +
        "the pattern from how the pills are actually emitted today",
    ).toBe(true);
  });

  it("no file outside the whitelist hand-rolls a level pill strip", () => {
    const files = ALL_FILES.filter((f) => !isAllowedFile(f));
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
      "components/learningGenome/LearningGenomeInspector.tsx",
    ];
    for (const rel of expected) {
      const p = resolve(SRC_ROOT, rel);
      const content = readFileSync(p, "utf8");
      expect(content).toContain("SemanticZoom");
    }
  });
});
