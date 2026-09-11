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

function offenders(): string[] {
  return sourceFiles(SRC)
    .filter((file) => {
      const code = stripComments(fs.readFileSync(file, "utf8"));
      return PREDICATE_SHAPES.some((shape) => shape.test(code));
    })
    .map((file) => path.relative(REPO_ROOT, file))
    .sort();
}

describe("asset-class predicates have exactly one owner", () => {
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
