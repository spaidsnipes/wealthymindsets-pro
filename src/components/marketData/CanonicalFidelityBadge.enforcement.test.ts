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

/**
 * The badge-producer token. A file that never names this is not a fidelity
 * chip site at all, so the rule skips it. Shared with the guard below so the
 * two cannot disagree about what "produces a badge" means.
 */
const BADGE_PRODUCER_PATTERN = /priceSourceBadge/;

/**
 * The chip-chrome heuristic, lifted out of the rule so the ANTI-VACUITY guard
 * and the rule run the SAME detector over the SAME text. Returns the 1-based
 * line numbers where a `.label` / `.live` read sits within five lines of both
 * a numeric/string `borderRadius:` and a `background:` — i.e. hand-rolled pill
 * chrome wrapped around badge truth.
 */
function findInlineChipChrome(content: string): number[] {
  const linesInFile = content.split("\n");
  const hits: number[] = [];
  for (let i = 0; i < linesInFile.length; i++) {
    const line = linesInFile[i];
    if (!line.includes("badge.label") && !line.includes("badge.live") &&
        !line.includes(".label") && !line.includes(".live")) continue;
    // Check a 5-line window for chip-style tell-tales.
    const window = linesInFile.slice(Math.max(0, i - 5), Math.min(linesInFile.length, i + 6)).join("\n");
    if (/borderRadius:\s*["'\d]/.test(window) && /background:/.test(window)) {
      hits.push(i + 1);
      break;
    }
  }
  return hits;
}

/** Walked ONCE so the guard below and the rule agree on what was scanned. */
const ALL_FILES = walk(SRC_ROOT);

describe("<CanonicalFidelityBadge> enforcement — canon §Single-Writer / Many-Readers", () => {
  /**
   * ANTI-VACUITY — added 2026-09-19, paying down the frozen debt recorded in
   * `src/lib/ops/sentinelsProveTheyScanned.test.ts`.
   *
   * The rule below asserts a collection is EMPTY, and it can reach that answer
   * two entirely different ways. Either nobody hand-rolls a fidelity chip —
   * which is what we want it to mean — or one of its two gates has quietly
   * stopped recognising anything.
   *
   * Both gates are brittle in the specific ways this repo has been bitten by
   * before. `BADGE_PRODUCER_PATTERN` is a bare function NAME: rename or re-export
   * `priceSourceBadge` and every file in the tree is skipped on the first
   * `continue`, so the scan never even reaches the chrome check. And
   * `findInlineChipChrome` is a FORMATTING detector — it wants a `.label` read
   * within five lines of both `borderRadius:` and `background:`. Move the pill
   * styles into a CSS class, a styled-component, or a Tailwind string and the
   * detector goes permanently quiet while the hand-rolled chip it was built to
   * catch renders exactly as before.
   *
   * Neither failure announces itself. `violations` is `[]` either way and this
   * gate reports a clean single-writer tree it can no longer actually read.
   *
   * So the guard pins both halves to known-good specimens:
   *   - `src/lib/priceSource.ts` — the module that DEFINES and exports
   *     `priceSourceBadge`. If the producer token is not there, it is nowhere.
   *   - `CanonicalFidelityBadge.tsx` — the sole legitimate writer, whose
   *     `variant === "chrome"` branch renders `{badge.label}` inside exactly the
   *     inline `borderRadius` + `background` pill the detector hunts for. It is
   *     the one file in the tree guaranteed to look like a fidelity chip.
   *
   * Note the deliberate inversion: the writer is on the ALLOWLIST, which is
   * precisely why it is safe as the specimen — the rule below skips it, so
   * nothing asserted here can mask a real violation.
   */
  it("ANTI-VACUITY: the walk reaches source, and both detector halves still recognise their owners", () => {
    expect(
      ALL_FILES.length,
      "walk(src) found almost no code files — did src/ move, did this test file " +
        "move relative to it, or did CODE_EXTENSIONS change? An empty scan makes " +
        "the rule below permanently green while enforcing nothing. Re-point " +
        "SRC_ROOT at the real source tree",
    ).toBeGreaterThan(200);

    const producerOwner = readFileSync(resolve(SRC_ROOT, "lib/priceSource.ts"), "utf8");
    expect(
      BADGE_PRODUCER_PATTERN.test(producerOwner),
      "BADGE_PRODUCER_PATTERN no longer matches src/lib/priceSource.ts — the " +
        "module that defines priceSourceBadge(). The producer was renamed or " +
        "moved, so the rule below now skips EVERY file on its first gate and " +
        "polices nothing at all. Re-derive this pattern from whatever the badge " +
        "producer is called today",
    ).toBe(true);

    const writer = readFileSync(
      resolve(SRC_ROOT, "components/marketData/CanonicalFidelityBadge.tsx"),
      "utf8",
    );
    expect(
      findInlineChipChrome(writer).length,
      "findInlineChipChrome() no longer fires on CanonicalFidelityBadge.tsx — the " +
        "SOLE writer of fidelity chips, and the one file guaranteed to render a " +
        "badge label inside inline pill chrome. The chip's styling moved to a CSS " +
        "class, a styled-component or utility classes, which means this detector " +
        "now matches nothing anywhere and the rule below is green over a tree it " +
        "can no longer read. Re-derive the heuristic from how the chip is actually " +
        "styled today",
    ).toBeGreaterThan(0);
  });

  it("no file outside the whitelist hand-rolls a fidelity chip from a PriceSourceBadge", () => {
    const files = ALL_FILES.filter((f) => !isAllowedFile(f));
    const violations: string[] = [];

    for (const file of files) {
      let content: string;
      try {
        content = readFileSync(file, "utf8");
      } catch { continue; }

      // Must import priceSourceBadge — otherwise it's not a fidelity chip site.
      if (!BADGE_PRODUCER_PATTERN.test(content)) continue;
      // Must NOT also import CanonicalFidelityBadge — that means it went
      // through the primitive (correct pattern).
      const usesPrimitive = /CanonicalFidelityBadge/.test(content);
      if (usesPrimitive) continue;

      // A file that imports priceSourceBadge without CanonicalFidelityBadge
      // and renders visible chip chrome is a violation. Heuristic: look
      // for inline chip-shaped styles referencing badge fields.
      const suspicious = findInlineChipChrome(content).map((ln) => `${file}:${ln}`);
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
      // The watchlist's chip render moved out of the panel and into the row
      // 2026-09-12, when the canon sentence was given its own line. The
      // breadcrumb follows the RENDER, not the directory it used to sit in.
      "components/chart/WatchlistRow.tsx",
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
