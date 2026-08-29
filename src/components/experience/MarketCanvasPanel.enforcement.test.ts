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

describe("<MarketCanvasPanel> enforcement — canon §Single-Writer / Many-Readers", () => {
  it("no file outside the whitelist hand-rolls the canon 'Would invalidate' token", () => {
    const files = walk(SRC_ROOT).filter((f) => !isAllowedFile(f));
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
      if (/["'>]\s*Would invalidate\s*["'<(]/.test(content)) {
        violations.push(file.replace(SRC_ROOT + "/", ""));
      }
    }

    expect(violations).toEqual([]);
  });

  it("current Phase 3 consumers import MarketCanvasPanel (breadcrumb)", () => {
    const expected = [
      "app/command-deck/page.tsx",
    ];
    for (const rel of expected) {
      const p = resolve(SRC_ROOT, rel);
      const content = readFileSync(p, "utf8");
      expect(content).toContain("MarketCanvasPanel");
    }
  });
});
