import { describe, it, expect } from "vitest";
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, extname, resolve } from "node:path";

/**
 * canon §Single-Writer / Many-Readers (ATH SYSTEMS CLARITY 2026-08-28)
 *
 * The <CanonicalFidelityBadge> primitive (SHIFT-R atom 2) is the sole
 * writer for trader-facing fidelity chips. This test walks src/ and
 * fails if any NEW component starts rendering a chip from a
 * PriceSourceBadge without going through the primitive.
 *
 * How the heuristic works — a file is a violation candidate when it
 * BOTH:
 *   1. imports `priceSourceBadge` (i.e. is producing/consuming a
 *      fidelity badge), AND
 *   2. Renders a `<span` with an inline `background:` or `borderRadius:`
 *      near a `badge.label` or `badge.live` reference (the exact
 *      pattern that used to live in ChartsDashboard / TickerTape /
 *      WatchlistPanel before SHIFT-R migration).
 *
 * Allowed exemptions (whitelist by filename):
 *   - CanonicalFidelityBadge.tsx itself (the canonical writer)
 *   - test files (may assert on the primitive's output)
 *   - MainChart.tsx (uses candleDataStatus, a different signal axis —
 *     canon labels rendered directly, no PriceSourceBadge input)
 *   - priceSource.ts (the type owner)
 */

const SRC_ROOT = resolve(__dirname, "..", "..");
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

const ALLOWED_FILES = new Set<string>([
  "CanonicalFidelityBadge.tsx",
  "CanonicalFidelityBadge.test.ts",
  "CanonicalFidelityBadge.enforcement.test.ts",
  // priceSource.ts is the type owner + resolver; not a UI surface.
  "priceSource.ts",
  "priceSource.test.ts",
  // SHIFT-T cutover 2026-08-29: MainChart's remaining hand-rolled
  // chip (line 6875 resolveChartSurfaceBadge site) migrated to
  // <CanonicalFidelityBadge> — no longer exempted. Canon §Binding
  // Legacy Data + Surface Cutover Law: "OLD PROVIDER CHROME AND OLD
  // CHART-APP SURFACES ARE QUARANTINED FROM THE NEW OS PATH."
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

describe("<CanonicalFidelityBadge> enforcement — canon §Single-Writer / Many-Readers", () => {
  it("no file outside the whitelist hand-rolls a fidelity chip from a PriceSourceBadge", () => {
    const files = walk(SRC_ROOT).filter((f) => !isAllowedFile(f));
    const violations: string[] = [];

    for (const file of files) {
      let content: string;
      try {
        content = readFileSync(file, "utf8");
      } catch { continue; }

      // Must import priceSourceBadge — otherwise it's not a fidelity chip site.
      if (!/priceSourceBadge/.test(content)) continue;
      // Must NOT also import CanonicalFidelityBadge — that means it went
      // through the primitive (correct pattern).
      const usesPrimitive = /CanonicalFidelityBadge/.test(content);
      if (usesPrimitive) continue;

      // A file that imports priceSourceBadge without CanonicalFidelityBadge
      // and renders visible chip chrome is a violation. Heuristic: look
      // for inline chip-shaped styles referencing badge fields.
      const linesInFile = content.split("\n");
      const suspicious: string[] = [];
      for (let i = 0; i < linesInFile.length; i++) {
        const line = linesInFile[i];
        if (!line.includes("badge.label") && !line.includes("badge.live") &&
            !line.includes(".label") && !line.includes(".live")) continue;
        // Check a 5-line window for chip-style tell-tales.
        const window = linesInFile.slice(Math.max(0, i - 5), Math.min(linesInFile.length, i + 6)).join("\n");
        if (/borderRadius:\s*["'\d]/.test(window) && /background:/.test(window)) {
          suspicious.push(`${file}:${i + 1}`);
          break;
        }
      }
      if (suspicious.length > 0) {
        violations.push(...suspicious);
      }
    }

    expect(violations).toEqual([]);
  });

  it("<CanonicalFidelityBadge> is actually imported in the four migrated surfaces (Sentinel breadcrumb)", () => {
    const expected = [
      "components/chart/ChartsDashboard.tsx",
      "components/layout/TickerTape.tsx",
      "components/chart/WatchlistPanel.tsx",
      // SHIFT-T cutover 2026-08-29: MainChart's resolveChartSurfaceBadge
      // site now rendered by the primitive too — protects the migration
      // from silent revert.
      "components/chart/MainChart.tsx",
    ];
    for (const rel of expected) {
      const p = resolve(SRC_ROOT, rel);
      const content = readFileSync(p, "utf8");
      expect(content).toContain("CanonicalFidelityBadge");
    }
  });
});
