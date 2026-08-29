/**
 * composeMarketCanvasVM enforcement — canon §Single-Writer / Many-Readers
 * applied to the Phase 3 Market Canvas compilation.
 *
 * Every decision surface that renders a MarketCanvasVM (via
 * <MarketCanvasPanel> / <CanvasSummaryPill>) MUST derive it through
 * `composeMarketCanvasVM`, not by re-invoking `selectMarketCanvas`
 * with a hand-composed `selectDecisionWhyNot` pipeline. Otherwise the
 * deck and Nectar (or any two consumers) can silently diverge on
 * verdict / clearances / invalidators.
 *
 * This test walks src/ and fails when a file both:
 *   1. Imports the `selectMarketCanvas` FUNCTION (not the `MarketCanvasVM`
 *      type — panels/pills that render the VM still need the type), AND
 *   2. Does NOT import `composeMarketCanvasVM`.
 *
 * The pure selector remains callable inside the compiler itself and
 * its tests, but consumers must not bypass the shared writer.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, extname, resolve } from "node:path";

const SRC_ROOT = resolve(__dirname, "..", "..", "..", "..");
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

const ALLOWED_FILES = new Set<string>([
  "selectMarketCanvas.ts",
  "selectMarketCanvas.test.ts",
  "composeMarketCanvasVM.ts",
  "composeMarketCanvasVM.test.ts",
  "composeMarketCanvasVM.enforcement.test.ts",
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

describe("composeMarketCanvasVM enforcement — canon §Single-Writer / Many-Readers", () => {
  it("no file outside the whitelist imports selectMarketCanvas without going through the compiler", () => {
    const files = walk(SRC_ROOT).filter((f) => !isAllowedFile(f));
    const violations: string[] = [];

    // Match imports of the `selectMarketCanvas` function specifically.
    // Type-only imports (`import type { MarketCanvasVM }`) are compliant.
    // The narrow regex requires `selectMarketCanvas` as a named import
    // without the leading `type` keyword.
    const IMPORT_FN_PATTERN =
      /import\s*(?!type\b)[^;]*\bselectMarketCanvas\b[^;]*from\s*["']@\/lib\/marketData\/viewModels\/selectMarketCanvas["']/;

    for (const file of files) {
      let content: string;
      try { content = readFileSync(file, "utf8"); } catch { continue; }
      if (!IMPORT_FN_PATTERN.test(content)) continue;
      if (/composeMarketCanvasVM/.test(content)) continue;
      violations.push(file.replace(SRC_ROOT + "/", ""));
    }

    expect(violations).toEqual([]);
  });

  it("current Phase 3 consumer /command-deck routes through composeMarketCanvasVM (breadcrumb)", () => {
    const p = resolve(SRC_ROOT, "src/app/command-deck/page.tsx");
    const content = readFileSync(p, "utf8");
    expect(content).toContain("composeMarketCanvasVM");
    // And it must NOT still be calling the four separate selectors it
    // used to inline (the migration removed them).
    expect(content).not.toContain('from "@/lib/traderMemory/viewModels/selectPermission"');
    expect(content).not.toContain('from "@/lib/marketData/viewModels/selectOneStory"');
  });

  it("second Phase 3 consumer /journal routes through useMarketCanvasVM (X2 breadcrumb)", () => {
    const p = resolve(SRC_ROOT, "src/app/journal/page.tsx");
    const content = readFileSync(p, "utf8");
    // /journal uses the hook wrapper rather than calling the compiler
    // directly — the hook re-exports the compiler internally, so both
    // are acceptable canonical routes.
    expect(content).toMatch(/useMarketCanvasVM|composeMarketCanvasVM/);
    // And it must render one of the canonical canvas surfaces.
    expect(content).toMatch(/MarketCanvasPanel|CanvasSummaryPill/);
  });
});
