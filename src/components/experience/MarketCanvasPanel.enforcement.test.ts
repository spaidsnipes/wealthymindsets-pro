/**
 * MarketCanvasPanel enforcement — canon §Single-Writer / Many-Readers.
 *
 * The Market Canvas is the canonical Phase 3 surface. Two owner-writers
 * exist for the invalidator + why-not tokens:
 *
 *   • DecisionWhyPanel — the compact WHY / WHY NOT single-panel form
 *   • MarketCanvasPanel — the composed four-corner Market Canvas
 *
 * Anything ELSE that renders the canon-owned strings "Would invalidate"
 * or the invalidator array shape is bypassing the single writers.
 *
 * This test walks src/ and fails when a NEW file renders those tokens
 * without going through one of the whitelisted writers.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, extname, resolve } from "node:path";

const SRC_ROOT = resolve(__dirname, "..", "..");
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

// Files allowed to render canon-owned canvas tokens directly.
const ALLOWED_FILES = new Set<string>([
  "DecisionWhyPanel.tsx",
  "DecisionWhyPanel.test.tsx",
  "MarketCanvasPanel.tsx",
  "MarketCanvasPanel.test.tsx",
  "MarketCanvasPanel.enforcement.test.ts",
  // The selector owns the string literal for the invalidator canon
  // reasons — it is the source of truth, not a chip site.
  "selectDecisionWhyNot.ts",
  "selectDecisionWhyNot.test.ts",
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

/** The one detection pattern the rule below depends on. Named once so the
 *  vacuity guard and the rule can never drift apart. */
const CANON_TOKEN = /["'>]\s*Would invalidate\s*["'<(]/;

/** Walked ONCE so the guard and the rule see the same tree. */
const ALL_FILES = walk(SRC_ROOT);

describe("<MarketCanvasPanel> enforcement — canon §Single-Writer / Many-Readers", () => {
  /**
   * ANTI-VACUITY — added 2026-09-19, paying down the frozen debt recorded in
   * `src/lib/ops/sentinelsProveTheyScanned.test.ts`.
   *
   * The rule below asserts a collection is EMPTY, and it has TWO ways to be
   * empty for the wrong reason:
   *
   *   1. THE WALK finds nothing — `src/` renamed, the extension set narrowed,
   *      a `statSync` throwing. Zero files scanned, zero violations found.
   *   2. THE TOKEN moves. This is the likelier failure and the nastier one.
   *      The rule hunts for one English string the canon happens to use today.
   *      Reword the Market Canvas corner to "Invalidated by" or push the label
   *      behind an i18n key, and the regex matches nothing anywhere — forever.
   *      The single-writer rule then reports a clean repo while every surface
   *      in the tree is free to hand-roll the new wording.
   *
   * Case 2 cannot be caught by counting files, so the guard below is a
   * POSITIVE CONTROL: the two canon owner-writers must themselves trip the
   * exact regex the rule uses. They are the known-good matches. If they stop
   * matching, the pattern is stale and must be re-derived from how the label
   * is actually written now — not left pointing at a string that has left the
   * codebase.
   */
  it("ANTI-VACUITY: the walk reaches source and the canon token still matches its owners", () => {
    expect(
      ALL_FILES.length,
      "walk(src) found almost no code files — did src/ move, or did the " +
        "extension set change? An empty scan makes the rule below permanently " +
        "green while enforcing nothing",
    ).toBeGreaterThan(200);

    const OWNERS = [
      "components/experience/MarketCanvasPanel.tsx",
      "components/experience/DecisionWhyPanel.tsx",
    ];
    const ownersThatTrip = OWNERS.filter((rel) =>
      CANON_TOKEN.test(readFileSync(resolve(SRC_ROOT, rel), "utf8")),
    );
    expect(
      ownersThatTrip.sort(),
      "the canon owner-writers no longer render a string this rule's regex " +
        "recognises. The 'Would invalidate' label was reworded or moved behind " +
        "an indirection, so the single-writer rule below is now searching for " +
        "text that exists nowhere and will pass over any amount of hand-rolled " +
        "duplication. Re-derive the pattern from the label as written today",
    ).toEqual(OWNERS.sort());
  });

  it("no file outside the whitelist hand-rolls the canon 'Would invalidate' token", () => {
    const files = ALL_FILES.filter((f) => !isAllowedFile(f));
    const violations: string[] = [];

    for (const file of files) {
      let content: string;
      try {
        content = readFileSync(file, "utf8");
      } catch { continue; }

      // Compliant if the file routes through a whitelisted writer.
      if (/MarketCanvasPanel|DecisionWhyPanel/.test(content)) continue;

      // Otherwise: rendering the canon 'Would invalidate' label directly
      // is a violation.
      if (CANON_TOKEN.test(content)) {
        violations.push(file.replace(SRC_ROOT + "/", ""));
      }
    }

    expect(violations).toEqual([]);
  });

  it("current Phase 3 consumers RENDER MarketCanvasPanel, not merely import it", () => {
    // Strengthened 2026-09-08. This asserted only that the NAME appeared in the
    // consumer, which the IMPORT LINE satisfies — so deleting the JSX would
    // have left the rule green while nothing reached the screen. That exact
    // mutation survived an equivalent rule on ContractStance the same day, so
    // the weakness is proven, not theoretical: an imported-but-never-rendered
    // component is the orphan shape these breadcrumbs exist to prevent, and an
    // import-graph walk cannot tell the difference either.
    const expected = [
      "app/command-deck/page.tsx",
    ];
    for (const rel of expected) {
      const p = resolve(SRC_ROOT, rel);
      const content = readFileSync(p, "utf8");
      expect(content, `${rel} does not import MarketCanvasPanel`)
        .toContain("MarketCanvasPanel");
      expect(content, `${rel} imports MarketCanvasPanel but never renders it`)
        .toMatch(/<MarketCanvasPanel[\s/>]/);
    }
  });
});
