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
 *
 * ── ANTI-VACUITY: what this Sentinel can and cannot prove ───────────────────
 *
 * `expect(violations).toEqual([])` is green both when the scan LOOKED AND
 * FOUND NOTHING and when it DID NOT LOOK. Two independent emptiness modes are
 * guarded below, plus one honest gap that is recorded rather than faked.
 *
 * (a) THE WALK FOUND NOTHING. `walk()` is called exactly ONCE, at module
 *     level, so the guard and the rule provably inspect the same array. If
 *     SRC_ROOT ever stops landing on src/ (a `resolve("..","..")` drift, a
 *     narrowed extension set, a renamed directory) the floor below fails.
 *
 * (b) THE PATTERN WENT STALE. The rule is a CONJUNCTION, and a file count
 *     cannot see either half rotting. Each half is therefore pointed at its
 *     real owner:
 *       · RAW_DELTA_PATTERN is asserted against heroTruthChronology.ts — the
 *         module that legitimately computes `capturedAt - eventAt`. If that
 *         arithmetic is renamed or restructured, the half of the rule that
 *         recognises the defect stops recognising anything, and this fails.
 *       · ADAPTER_PATTERN (the skip token) is asserted against HeroTruth.tsx.
 *         A stale skip token would silently change WHICH files get scanned.
 *
 * (c) WHAT COULD NOT BE EARNED, STATED PLAINLY. There is NO live positive
 *     control for RENDERS_PRICE_AGE_PATTERN. Measured 2026-09-19: the phrase
 *     "price age" appears in exactly ONE file under src/ — this Sentinel's own
 *     source, where the regex literal lives — and that file is excluded by
 *     `isAllowedFile`. HeroTruth.tsx no longer says "price age" at all; the
 *     adapter renders "observed 1.4m ago" / "observation age unverified"
 *     instead. So this half matches ZERO scanned files today.
 *
 *     No specimen was manufactured to make it look otherwise. The honest
 *     scope of that half is: it is a TRAP KEYED TO THE OLD LITERAL, armed for
 *     a future copy-paste of the pre-fix HeroTruth idiom, and it polices
 *     nothing about the wording the product actually ships now. What IS
 *     guarded is that the regex still recognises the historical string it was
 *     written from — a pattern self-test, explicitly NOT a positive control.
 *     If HeroTruth's age chrome must be policed by phrase, this Sentinel is
 *     the wrong instrument and a new one keyed to the adapter's real labels
 *     is required.
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

/**
 * The walk runs ONCE. Guard and rule read the same array, so a drifting root
 * cannot make the rule blind while the guard measures a different tree.
 */
const ALL_FILES = walk(SRC_ROOT);
const SCANNED_FILES = ALL_FILES.filter((f) => !isAllowedFile(f));

/**
 * The three patterns, named once and used by BOTH the guard and the rule, so
 * they can never drift apart.
 */
const ADAPTER_PATTERN = /selectHeroPriceChronology|HeroPriceChronology/;
const RENDERS_PRICE_AGE_PATTERN = /["'>]\s*price age\s+/;
const RAW_DELTA_PATTERN = /capturedAt\s*-\s*eventAt|eventAt.*capturedAt/;

const HERO_TRUTH = resolve(SRC_ROOT, "components/command-deck/HeroTruth.tsx");
const CHRONOLOGY_OWNER = resolve(SRC_ROOT, "lib/marketData/heroTruthChronology.ts");

describe("the scan is not vacuous", () => {
  it("the walk really reaches src/ — measured 1526 code files, 704 after the test filter", () => {
    // Floors sit comfortably below the measured counts. They exist to catch a
    // COLLAPSE (root drift, narrowed extensions), not to freeze the number.
    expect(ALL_FILES.length, `walk(${SRC_ROOT}) collapsed — the rule below is scanning nothing`)
      .toBeGreaterThan(900);
    expect(SCANNED_FILES.length, "every file was whitelisted away — the rule inspects no source")
      .toBeGreaterThan(400);
    expect(ALL_FILES).toContain(HERO_TRUTH);
  });

  it("POSITIVE CONTROL: the raw-delta half still matches its real owner", () => {
    // heroTruthChronology.ts is the ONE module allowed to compute the delta
    // (`const ageMs = state.capturedAt - eventAt`). If that arithmetic is
    // reworded or reformatted, the half of the rule that recognises the
    // defect recognises nothing — and the gate would stay green forever.
    const owner = readFileSync(CHRONOLOGY_OWNER, "utf8");
    expect(
      RAW_DELTA_PATTERN.test(owner),
      "RAW_DELTA_PATTERN no longer matches heroTruthChronology.ts — the pattern " +
        "has gone stale and the enforcement below now polices nothing",
    ).toBe(true);
  });

  it("POSITIVE CONTROL: the skip token still matches the adapter's consumer", () => {
    // ADAPTER_PATTERN decides WHICH files are exempt. A stale token silently
    // changes the scanned set instead of failing.
    expect(
      ADAPTER_PATTERN.test(readFileSync(HERO_TRUTH, "utf8")),
      "ADAPTER_PATTERN no longer matches HeroTruth.tsx — the exemption vocabulary is stale",
    ).toBe(true);
  });

  it("PATTERN SELF-TEST ONLY: the phrase half has no live specimen in src/", () => {
    // Honest statement of a gap, not a positive control. See docblock (c):
    // nothing the product ships says "price age" any more, so this half
    // matches zero scanned files. It is a trap keyed to the pre-fix literal.
    const historical = '<span>price age {freshnessMs}</span>';
    expect(RENDERS_PRICE_AGE_PATTERN.test(historical)).toBe(true);

    const live = SCANNED_FILES.filter((f) => {
      try { return RENDERS_PRICE_AGE_PATTERN.test(readFileSync(f, "utf8")); } catch { return false; }
    });
    expect(live, "a scanned file now emits 'price age' — re-read docblock (c); " +
      "this half is no longer inert and the gap note must be rewritten").toEqual([]);
  });
});

describe("heroTruthChronology enforcement — canon §fail-closed hero chronology", () => {
  it("HeroTruth.tsx MUST import selectHeroPriceChronology (breadcrumb)", () => {
    const heroTruthPath = HERO_TRUTH;
    const content = readFileSync(heroTruthPath, "utf8");
    expect(content).toContain("selectHeroPriceChronology");
    // And it must NOT have reverted to the deprecated freshnessMs derivation
    // it used to compute from `capturedAt - eventAt`.
    expect(content).not.toMatch(/const\s+freshnessMs\s*=\s*eventAt\s*&&\s*capturedAt/);
  });

  it("no file outside the whitelist emits 'price age' chrome from a raw capturedAt-eventAt delta", () => {
    const violations: string[] = [];

    for (const file of SCANNED_FILES) {
      let content: string;
      try {
        content = readFileSync(file, "utf8");
      } catch { continue; }

      // Compliant if the file routes through the adapter or is the
      // chronology-owning module.
      if (ADAPTER_PATTERN.test(content)) continue;

      // Heuristic violation: file both (a) renders the "price age" text
      // token as visible chrome AND (b) references the canonical-state
      // fields whose delta the adapter now gates. This catches a copy-
      // paste of the old HeroTruth idiom into a new surface.
      const rendersPriceAge = RENDERS_PRICE_AGE_PATTERN.test(content);
      const derivesRawDelta = RAW_DELTA_PATTERN.test(content);
      if (rendersPriceAge && derivesRawDelta) {
        violations.push(file.replace(SRC_ROOT + "/", ""));
      }
    }

    expect(violations).toEqual([]);
  });
});
