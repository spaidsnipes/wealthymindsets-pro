/**
 * "What kind of instrument is this?" is allowed exactly one answer.
 *
 * ── Why this Sentinel exists ────────────────────────────────────────────────
 *
 * `symbolAssetClass` was written to end four hand-typed copies of that
 * question. Within the same day, three MORE were found — none of them in a
 * route, so none of them visible to the adoption guard that was written at the
 * time, which named the four routes explicitly:
 *
 *   src/lib/fabio.ts                      BTC-USD → the stocks playbook
 *   src/components/chart/AssetClassSwitcher.tsx   GC1! and GC=F → two tabs
 *   src/components/chart/MainChart.tsx    "/ES" → RTH-filtered as a stock
 *
 * A guard that lists the offenders it knows about can only ever catch the
 * offenders it knows about. This one SCANS, so the eighth copy fails on the
 * day it is typed rather than on the day someone happens to look.
 *
 * ── What counts as a violation ──────────────────────────────────────────────
 *
 * The literal notation tests — `endsWith("1!")`, `includes("=F")` — which are
 * the shape every one of the seven took. This deliberately does not try to
 * recognise a class predicate in general; a scan that guesses would either miss
 * the next one or fail on innocent code, and an unreliable Sentinel gets
 * disabled, which is worse than none.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "@/lib/sourceScan";

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const SRC = path.join(REPO_ROOT, "src");

/** The notation tests that every hand-typed copy was built out of. */
const PREDICATE_SHAPES = [
  /\.endsWith\("1!"\)/,
  /\.includes\("1!"\)/,
  /\.endsWith\("=F"\)/,
  /\.includes\("=F"\)/,
];

/**
 * Files allowed to speak notation directly, each for a reason that is about
 * DEPENDENCY or RISK — never about tidiness, and never "it was here first".
 *
 * This map is the only typed thing in the file, and it is a ratchet: an entry
 * whose file stops matching is itself a failure below, so a stale exemption
 * cannot sit here quietly granting permission to a file that no longer needs
 * it.
 */
const EXEMPT: Record<string, string> = {
  "src/lib/marketData/symbolAssetClass.ts":
    "The owner. This is where the notation rules are supposed to live.",
  // NOT EXEMPT, deliberately: `src/lib/yahooSymbol.ts`. It is the NOTATION
  // owner and the most obvious candidate for a standing permission slip — but
  // it states the `1!` ↔ `=F` equivalence as a TABLE of named contracts, not as
  // a predicate, so it has never matched this scan. It was written into EXEMPT
  // anyway, on the reasoning that the notation owner must be allowed to speak
  // notation, and the ratchet below rejected it the first time it ran. That is
  // the entire argument for the ratchet: an exemption granted for a plausible
  // reason to a file that does not need it is a silent licence for the NEXT
  // predicate typed there.
  "src/lib/marketData/canonicalIdentity.ts":
    "`symbolAssetClass` imports cryptoBaseTicker FROM this module; a module " +
    "cannot ask its own consumer. Dependency direction, not preference.",
  "src/app/api/alpaca-trading/route.ts":
    "An ORDER path. Its local regex refuses MORE than the classifier does " +
    "(bare roots like CL and SI), and narrowing a refusal set on an order " +
    "path to remove a duplicate would be trading safety for tidiness. It " +
    "calls classifySymbol as well — see symbolAssetClass.test.ts.",
  "src/lib/fabio.ts":
    "Parses a contract ROOT out of canonical notation AFTER the owner has " +
    "already answered the class. Reading a resolved string is not a second " +
    "opinion about what the symbol is.",
};

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** The single owner of the question — and the positive-control specimen below. */
const OWNER_REL = "src/lib/marketData/symbolAssetClass.ts";

/** Walked ONCE so the guard below and the rules agree on what was scanned. */
const ALL_FILES = sourceFiles(SRC);

function offenders(): string[] {
  return ALL_FILES
    .filter((file) => {
      const code = stripComments(fs.readFileSync(file, "utf8"));
      return PREDICATE_SHAPES.some((shape) => shape.test(code));
    })
    .map((file) => path.relative(REPO_ROOT, file))
    .sort();
}

describe("asset-class predicates have exactly one owner", () => {
  /**
   * ANTI-VACUITY — added 2026-09-19, paying down the frozen debt recorded in
   * `src/lib/ops/sentinelsProveTheyScanned.test.ts`.
   *
   * The first rule below asserts a collection is EMPTY, and it reaches that
   * emptiness through a walk plus four hardcoded regexes. Both halves can die
   * quietly:
   *
   *   - `sourceFiles(SRC)` resolves SRC by climbing THREE directories from
   *     __dirname and appending "src". Move this test one level, or restructure
   *     to a monorepo `packages/*` layout, and that climb lands somewhere with
   *     no `.ts` files under it. `readdirSync` on a wrong-but-real directory
   *     returns a small set, not an error, and the rule reports clean.
   *   - `PREDICATE_SHAPES` hardcodes the exact source text `.endsWith("1!")`
   *     and friends. If the canon notation changes — say futures move to a
   *     different continuous-contract suffix — these four regexes hunt a
   *     notation nothing uses. Seven hand-typed predicates in the NEW notation
   *     could then spread unopposed, exactly the disease this file was written
   *     to cure, with the gate green the whole time.
   *
   * There is an existing synthetic check further down ("the scan can actually
   * see a violation") which feeds the pattern a hand-written sample string.
   * That proves the regexes compile, but a hand-written sample is written to
   * match — it cannot tell you whether the notation is still what real code
   * says. This guard uses a LIVE specimen instead: `symbolAssetClass.ts`, the
   * declared owner. It is the right specimen precisely because it is the one
   * file that is SUPPOSED to speak notation directly — its whole purpose is to
   * be the single place these tests live. If the patterns cannot find the
   * predicate THERE, they cannot find one anywhere, and the scan is blind.
   */
  it("ANTI-VACUITY: the walk reaches src and the predicate shapes still match the owner", () => {
    expect(
      ALL_FILES.length,
      "sourceFiles(src) found almost no code files — did src/ move, did this " +
        "test file move relative to it (SRC is resolved by climbing three " +
        "directories from __dirname), or did the repo become a monorepo? An " +
        "empty scan makes the rules below permanently green while policing " +
        "nothing. Re-point SRC at the real source tree",
    ).toBeGreaterThan(200);

    const owner = stripComments(fs.readFileSync(path.join(REPO_ROOT, OWNER_REL), "utf8"));
    expect(
      PREDICATE_SHAPES.some((shape) => shape.test(owner)),
      `None of PREDICATE_SHAPES matches ${OWNER_REL} — the declared OWNER of ` +
        "this question, and the one file guaranteed to state the futures " +
        "notation test directly. Either the owner stopped expressing the rule " +
        "as `.endsWith(\"1!\")` / `.includes(\"=F\")` (refactored to a table, a " +
        "shared constant, or a new notation), or the canon notation itself " +
        "changed. Either way these four regexes now match ZERO real code: the " +
        "rules below are green because the scan is blind, not because the " +
        "predicate has one owner. Re-derive PREDICATE_SHAPES from how " +
        `${OWNER_REL} actually classifies futures today`,
    ).toBe(true);
  });

  it("no file hand-types the futures notation test without a recorded reason", () => {
    const unexplained = offenders().filter((rel) => !(rel in EXEMPT));
    expect(
      unexplained,
      "These files test futures notation themselves instead of asking " +
        "`classifySymbol`. Seven copies of this predicate existed before it " +
        "had an owner and they disagreed with each other in production — " +
        "BTC-USD reached the stocks playbook, GC1! and GC=F opened different " +
        "tabs, and /ES was RTH-filtered as a stock. If a new one is genuinely " +
        "necessary, add it to EXEMPT with the reason",
    ).toEqual([]);
  });

  it("every exemption is still earning its place", () => {
    // A ratchet only ratchets if it cannot rust. An exemption for a file that
    // no longer hand-types anything is a standing permission slip nobody
    // reviewed — and it would silently cover the NEXT predicate typed there.
    const current = new Set(offenders());
    for (const rel of Object.keys(EXEMPT)) {
      expect(current.has(rel), `${rel} is exempt but no longer matches — delete the exemption`).toBe(true);
    }
  });

  it("the scan can actually see a violation", () => {
    // REVIVE LAW, permanently: a scan that matches nothing passes forever.
    const sample = 'const isFutures = up.endsWith("1!") || up.includes("=F");';
    expect(PREDICATE_SHAPES.some((shape) => shape.test(sample))).toBe(true);
    expect(PREDICATE_SHAPES.some((shape) => shape.test("const x = 1;"))).toBe(false);
  });
});
