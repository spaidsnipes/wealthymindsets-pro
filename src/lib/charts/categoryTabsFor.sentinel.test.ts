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

describe("categoryTabsFor Sentinel — single-writer category strip", () => {
  it("ChartsDashboard imports categoryTabsFor", () => {
    const body = readFileSync(DASHBOARD, "utf8");
    expect(body).toMatch(/from\s+["']@\/lib\/charts\/categoryTabsFor["']/);
  });

  it("the 8-tab literal is not re-inlined anywhere under src/components/chart", () => {
    // Pattern anchors on the specific literal ORDER + presence of the
    // uncommon "Corporate Actions" token so we don't false-positive on
    // an unrelated short list somewhere in the tree.
    const pattern = /"Chart"\s*,\s*"Options"\s*,\s*"ETFs"\s*,\s*"Financials"\s*,\s*"Valuation"\s*,\s*"Corporate Actions"/;
    const offenders: string[] = [];
    for (const path of walk(CHART_ROOT)) {
      if (path.endsWith(".test.ts") || path.endsWith(".test.tsx")) continue;
      const body = readFileSync(path, "utf8");
      // Strip block + line comments so a doc mention of the old inline
      // literal doesn't count as a real consumer.
      const code = body
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, "");
      if (pattern.test(code)) offenders.push(path);
    }
    expect(offenders).toEqual([]);
  });
});
