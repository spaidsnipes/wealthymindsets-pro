/**
 * categoryTabsFor Sentinel — single-writer canon.
 *
 * The /charts top-level category strip must render its tab set from
 * categoryTabsFor(). A future edit that re-inlines the literal
 * ["Chart","Options","ETFs","Financials",...] array would silently
 * revert the asset-class filtering breakthrough (BTC would show
 * Financials again, futures would show Corporate Actions again).
 *
 * This scan walks src/components/chart and asserts:
 *   1. ChartsDashboard.tsx imports categoryTabsFor
 *   2. The 8-tab literal string appears at most ONCE in the whole
 *      /chart component tree (the helper's own definition doesn't
 *      count — it lives in src/lib/charts/).
 *
 * When it fires, the failure message names the offending file so
 * the builder can either delete the inlined literal or, if a new
 * consumer genuinely needs the full list, import ALL_CATEGORY_TABS
 * from the helper module.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const CHART_ROOT = resolve(__dirname, "../../components/chart");
const DASHBOARD = join(CHART_ROOT, "ChartsDashboard.tsx");

const CODE_EXTENSIONS = new Set([".ts", ".tsx"]);

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (CODE_EXTENSIONS.has(name.slice(name.lastIndexOf(".")))) acc.push(p);
  }
  return acc;
}

/**
 * The vocabulary owner — the one module allowed to define the canon tab list.
 * `ALL_CATEGORY_TABS` lives here.
 */
const VOCABULARY_OWNER = resolve(__dirname, "../../lib/charts/categoryTabsFor.ts");
const VOCABULARY_OWNER_REL = "src/lib/charts/categoryTabsFor.ts";

/**
 * The tab names INLINED_TAB_LITERAL_PATTERN hunts for, in the order it requires
 * them. This list is the single source of the pattern below — the regex is
 * BUILT from it rather than written out again, so the guard and the rule can
 * never come to disagree about which words are being hunted.
 */
const HUNTED_TABS: readonly string[] = [
  "Chart",
  "Options",
  "ETFs",
  "Financials",
  "Valuation",
  "Corporate Actions",
];

/**
 * Anchors on the specific literal ORDER + presence of the uncommon
 * "Corporate Actions" token so we don't false-positive on an unrelated short
 * list somewhere in the tree.
 */
const INLINED_TAB_LITERAL_PATTERN = new RegExp(
  HUNTED_TABS.map((t) => `"${t}"`).join("\\s*,\\s*"),
);

/** Walked ONCE so the guard below and the rule agree on what was scanned. */
const ALL_FILES = walk(CHART_ROOT);

describe("categoryTabsFor Sentinel — single-writer category strip", () => {
  /**
   * ANTI-VACUITY — added 2026-09-19, paying down the frozen debt recorded in
   * `src/lib/ops/sentinelsProveTheyScanned.test.ts`.
   *
   * The rule below asserts a collection is EMPTY, and its detector is an
   * ORDER-ANCHORED literal sequence — six quoted tab names that must appear
   * consecutively, separated only by commas. That is about as brittle as a
   * detector gets. Reorder the canon list, insert a tab into the middle of it,
   * rename one, or reformat the array and the pattern matches nothing at all,
   * silently, while the rule keeps reporting clean.
   *
   * ── WHAT COULD NOT BE PROVEN, AND WHY IT MATTERS ──────────────────────
   * MEASURED 2026-09-19: INLINED_TAB_LITERAL_PATTERN currently matches ZERO
   * files in the entire repo — INCLUDING the owner, `categoryTabsFor.ts`. The
   * usual positive control ("the pattern still matches its writer") is simply
   * not available here, and manufacturing a specimen would be theater.
   *
   * The reason is the defect itself, already realised: `ALL_CATEGORY_TABS` has
   * since grown six microstructure tabs — Absorption, Aggression, Big Trades,
   * Value Profile, Continuation, Worksheet — which sit BETWEEN "Chart" and
   * "Options". The consecutive `"Chart","Options","ETFs",…` run this pattern
   * requires no longer exists anywhere. So state it plainly: as written, this
   * rule can only catch a re-inline of the PRE-2026-09 eight-tab list. A
   * re-inline of TODAY's fourteen-tab list would pass. That is a real scope
   * limit of this Sentinel, not something the guard can assert away, and
   * rewriting the rule's semantics is out of scope for an anti-vacuity pass.
   *
   * ── WHAT THE GUARD DOES PROVE ─────────────────────────────────────────
   * Two things that CAN fail:
   *   1. The walk still reaches the /chart component tree, and still reaches
   *      ChartsDashboard.tsx specifically — the file the strip actually lives
   *      in. If the scan empties, the rule is green over nothing.
   *   2. The pattern's VOCABULARY is still real. Every tab name the regex hunts
   *      must still be a member of ALL_CATEGORY_TABS in the owner module.
   *      Rename "Corporate Actions" there and this rule would go on hunting a
   *      word the product no longer says — permanently green, policing a dead
   *      language. The owner is the right specimen because it is the declared
   *      single source of truth for what these tabs ARE: if a name is not
   *      there, the rule has no business looking for it anywhere else.
   */
  it("ANTI-VACUITY: the walk reaches the chart tree and every hunted tab name is still canon vocabulary", () => {
    expect(
      ALL_FILES.length,
      "walk(src/components/chart) found almost no code files — did the chart " +
        "component tree move, did this test file move relative to it, or did " +
        "CODE_EXTENSIONS change? An empty scan makes the rule below permanently " +
        "green while policing nothing. Re-point CHART_ROOT at the real tree",
    ).toBeGreaterThan(40);

    expect(
      ALL_FILES,
      "ChartsDashboard.tsx is not in the scanned set — and it is the file that " +
        "actually renders the category strip. The scan is looking somewhere " +
        "the strip no longer lives, so the rule below cannot see the one " +
        "re-inline it most needs to catch. Re-point CHART_ROOT",
    ).toContain(DASHBOARD);

    const owner = readFileSync(VOCABULARY_OWNER, "utf8");
    const missing = HUNTED_TABS.filter((t) => !owner.includes(`"${t}"`));
    expect(
      missing,
      `These tab names are hunted by INLINED_TAB_LITERAL_PATTERN but no longer ` +
        `appear as canon tab strings in ${VOCABULARY_OWNER_REL}: ` +
        `${missing.join(", ")}. The canon tab list was renamed or reorganised ` +
        "and this Sentinel was not updated with it, so it is now scanning for " +
        "words the product does not say — permanently green while the REAL tab " +
        "list is free to be re-inlined. Update HUNTED_TABS to match " +
        "ALL_CATEGORY_TABS, and check whether the renamed list has been " +
        "hand-copied into the /chart tree",
    ).toEqual([]);
  });

  it("ChartsDashboard imports categoryTabsFor", () => {
    const body = readFileSync(DASHBOARD, "utf8");
    expect(body).toMatch(/from\s+["']@\/lib\/charts\/categoryTabsFor["']/);
  });

  it("the 8-tab literal is not re-inlined anywhere under src/components/chart", () => {
    const pattern = INLINED_TAB_LITERAL_PATTERN;
    const offenders: string[] = [];
    for (const path of ALL_FILES) {
      if (path.endsWith(".test.ts") || path.endsWith(".test.tsx")) continue;
      const body = readFileSync(path, "utf8");
      // Strip block + line comments so a doc mention of the old inline
      // literal doesn't count as a real consumer.
      const code = body
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, "");
      if (pattern.test(code)) offenders.push(path);
    }
    expect(
      offenders,
      `These files re-inline the category tab literal: ${offenders.join(", ")}. ` +
        "That silently reverts the asset-class filtering breakthrough (BTC " +
        "showing Financials, futures showing Corporate Actions). Delete the " +
        "inlined literal and call categoryTabsFor(), or import " +
        `ALL_CATEGORY_TABS from ${VOCABULARY_OWNER_REL} if the full list is ` +
        "genuinely needed",
    ).toEqual([]);
  });
});
