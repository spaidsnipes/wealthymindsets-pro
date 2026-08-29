/**
 * heroTruthChronology enforcement — canon §fail-closed hero chronology.
 *
 * The Command Deck hero's price-age display MUST route through
 * `selectHeroPriceChronology`. Any silent revert to a raw
 * `capturedAt - eventAt` computation would resurrect the receipt-time-
 * age lie (a DELAYED replay showing "price age 22h" as if it were
 * market truth).
 *
 * This test walks src/ and fails when:
 *   1. HeroTruth.tsx drops its import of selectHeroPriceChronology, OR
 *   2. Any file outside the whitelist derives a `freshnessMs` /
 *      `priceAge*` value directly from `capturedAt - eventAt` on a
 *      canonical state and renders it as user-facing age chrome.
 *
 * The second check is heuristic — narrowed to render sites that also
 * emit the "price age" phrase (the exact string HeroTruth used to
 * display), so it doesn't false-positive on internal telemetry.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, extname, resolve } from "node:path";

const SRC_ROOT = resolve(__dirname, "..", "..");
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

// Files allowed to compute price age without going through the adapter.
// (The adapter itself, its test, this Sentinel.)
const ALLOWED_FILES = new Set<string>([
  "heroTruthChronology.ts",
  "heroTruthChronology.test.ts",
  "heroTruthChronology.enforcement.test.ts",
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

describe("heroTruthChronology enforcement — canon §fail-closed hero chronology", () => {
  it("HeroTruth.tsx MUST import selectHeroPriceChronology (breadcrumb)", () => {
    const heroTruthPath = resolve(SRC_ROOT, "components/command-deck/HeroTruth.tsx");
    const content = readFileSync(heroTruthPath, "utf8");
    expect(content).toContain("selectHeroPriceChronology");
    // And it must NOT have reverted to the deprecated freshnessMs derivation
    // it used to compute from `capturedAt - eventAt`.
    expect(content).not.toMatch(/const\s+freshnessMs\s*=\s*eventAt\s*&&\s*capturedAt/);
  });

  it("no file outside the whitelist emits 'price age' chrome from a raw capturedAt-eventAt delta", () => {
    const files = walk(SRC_ROOT).filter((f) => !isAllowedFile(f));
    const violations: string[] = [];

    for (const file of files) {
      let content: string;
      try {
        content = readFileSync(file, "utf8");
      } catch { continue; }

      // Compliant if the file routes through the adapter or is the
      // chronology-owning module.
      if (/selectHeroPriceChronology|HeroPriceChronology/.test(content)) continue;

      // Heuristic violation: file both (a) renders the "price age" text
      // token as visible chrome AND (b) references the canonical-state
      // fields whose delta the adapter now gates. This catches a copy-
      // paste of the old HeroTruth idiom into a new surface.
      const rendersPriceAge = /["'>]\s*price age\s+/.test(content);
      const derivesRawDelta = /capturedAt\s*-\s*eventAt|eventAt.*capturedAt/.test(content);
      if (rendersPriceAge && derivesRawDelta) {
        violations.push(file.replace(SRC_ROOT + "/", ""));
      }
    }

    expect(violations).toEqual([]);
  });
});
