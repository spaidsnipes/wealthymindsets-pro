/**
 * META-SENTINEL — a Sentinel that finds nothing must not report "clean".
 *
 * ── THE MEASURED DEFECT ───────────────────────────────────────────────
 * A large family of Sentinels in this repo works by SCANNING a set of files
 * and asserting the set of violations is empty:
 *
 *     const files = walk(SRC_ROOT).filter(...);
 *     for (const f of files) { if (bad(f)) violations.push(f); }
 *     expect(violations).toEqual([]);
 *
 * That shape has a silent failure mode. If the scan ever stops finding the
 * files it means to police — a moved test, a renamed directory, a changed
 * extension set, a `resolve(__dirname, "..", "..")` that no longer lands on
 * `src/` — then `violations` is `[]` for the most boring reason imaginable and
 * the gate passes GREEN forever. A Sentinel policing nothing is INDISTINGUISHABLE
 * from a Sentinel finding nothing wrong.
 *
 * ── THIS IS NOT HYPOTHETICAL. IT HAS HAPPENED TWICE. ──────────────────
 *   1. Lane J — the `/paper` contract-multiplier guard passed GREEN while CL1!
 *      had no point value. Recorded in `vpRenderGeometry.test.ts`'s header,
 *      which is why that file opens with a vacuity guard.
 *   2. 2026-09-15 — the first `paperExecutionRealism` page guard asserted that
 *      `/paper` merely NAMED its selector. Deleting the rendered
 *      `<ExecutionRealismNote />` passed GREEN, because the name still appeared
 *      inside a component nobody rendered.
 *
 * And it was demonstrated a third time, deliberately, to justify this file:
 * pointing `TruthStatusChip.enforcement.test.ts`'s `SRC_ROOT` at
 * `src/lib/auth` — a real directory, wrong tree — left it passing 1/1 GREEN
 * while policing essentially nothing.
 *
 * ── THE CURE IS A RATCHET, NOT A REWRITE ──────────────────────────────
 * 77 scanning Sentinels assert emptiness. 26 of them do so without ever proving
 * their scan found anything. Failing all 26 today would produce a red suite nobody
 * can land, and `deltaVPGeometry.adoption.sentinel.test.ts` states the reason
 * that is self-defeating: "a gate that cries wolf on unrelated code is a gate
 * someone deletes."
 *
 * So the 26 are FROZEN below as recorded debt, and this gate fails when the
 * class GROWS. New scanning Sentinels must prove they scanned. The ledger can
 * only shrink — see the ratchet test, which fails if a listed file has since
 * been fixed but left on the list, so the number on screen stays true.
 *
 * ── WHAT COUNTS AS PROOF ──────────────────────────────────────────────
 * Any assertion that the scan found a non-trivial amount of material:
 * `expect(files.length).toBeGreaterThan(n)`, `toBeGreaterThanOrEqual`,
 * `not.toHaveLength(0)`, or an explicit positive control. The point is not the
 * exact form — it is that an empty scan must FAIL rather than pass.
 *
 * ── AND THIS FILE POLICES ITSELF ──────────────────────────────────────
 * A meta-Sentinel that scans for unguarded scanners, and then does not guard
 * its own scan, would be the joke writing itself. The first test below is its
 * own vacuity guard.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, extname, resolve } from "node:path";

const SRC_ROOT = resolve(__dirname, "..", "..");
const CODE_EXTENSIONS = new Set([".ts", ".tsx"]);

/**
 * Sentinels that assert emptiness without proving their scan found anything.
 *
 * RECORDED DEBT, FROZEN 2026-09-15. Do not add to this list. Removing an entry
 * (by giving that file a real guard) is always welcome and the ratchet test
 * below REQUIRES the removal once the guard exists.
 */
const UNGUARDED_SCANNERS_DEBT: readonly string[] = [
  // KNOWN FALSE POSITIVE of the scope heuristic below — diagnosed 2026-09-19,
  // left listed deliberately. This file is not a scanner. Its `toEqual([])` is
  // `expect(chunks).toEqual([])`, a RUNTIME assertion that disposal emptied a
  // capture buffer, and its single `readFileSync` reads one hardcoded path
  // (`LeftSidebar.tsx`) rather than enumerating a file set. The detector's
  // in-scope test is `/readdirSync|readFileSync/`, which it trips on the second
  // alternative.
  //
  // IT IS NOT REMOVED, AND THE REASON MATTERS. The obvious "fix" is to narrow
  // the scope test to `readdirSync` — files that actually WALK. MEASURED
  // 2026-09-19 (first pass): that would have dropped NINE entries at a stroke,
  // eight of them real gates that read a DECLARED LIST of paths instead of
  // walking one. RE-MEASURED after this block paid the ledger down to four:
  // NONE of the four survivors contains `readdirSync`. The narrowing would now
  // empty this ledger COMPLETELY — reporting zero debt by exempting the three
  // remaining live gates rather than by guarding them.
  //
  // A fixed-list gate goes vacuous exactly like a walking one: the list
  // empties, or its pattern goes stale. That is the ledger lying in the
  // DANGEROUS direction, which is worse than the harmless over-inclusion of one
  // lifecycle test.
  //
  // A conservative detector costs one wrong name on a list. A permissive one
  // costs coverage nobody can see they lost. Keeping this entry is the cheaper
  // error, taken with eyes open.
  "components/chart/LeftSidebar.lifecycle.test.ts",
  "lib/broker/providerReadiness.envExample.test.ts",
  "lib/experience/chartsRoomChrome.test.ts",
  "lib/journalDecisionFilter.test.ts",
];

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
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

/** Comments describe these patterns on purpose; only real code may match. */
function stripComments(raw: string): string {
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Asserts a collection is empty — the shape with the silent failure mode. */
const ASSERTS_EMPTINESS =
  /toEqual\(\[\]\)|toHaveLength\(0\)|\.length\s*\)\s*\.toBe\(0\)/;

/** Proves the scan found material, so an empty scan FAILS instead of passing. */
const PROVES_IT_SCANNED =
  /toBeGreaterThan\(|toBeGreaterThanOrEqual\(|not\.toHaveLength\(0\)|\.length\s*\)\s*\.toBe\([1-9]/;

const TEST_FILES = walk(SRC_ROOT).filter(
  (f) => f.endsWith(".test.ts") || f.endsWith(".test.tsx"),
);

const SELF = "lib/ops/sentinelsProveTheyScanned.test.ts";

function rel(p: string): string {
  return p.replace(SRC_ROOT + "/", "");
}

/** Scanning Sentinels that assert emptiness but never prove they scanned. */
function unguardedScanners(): string[] {
  const out: string[] = [];
  for (const f of TEST_FILES) {
    if (rel(f) === SELF) continue;
    let raw: string;
    try { raw = readFileSync(f, "utf8"); } catch { continue; }
    // Only files that actually scan the tree are in scope. A unit test that
    // says `expect(result).toEqual([])` about a pure function is not a gate
    // policing a file set and has nothing to prove about a scan.
    if (!/readdirSync|readFileSync/.test(raw)) continue;
    const code = stripComments(raw);
    if (!ASSERTS_EMPTINESS.test(code)) continue;
    if (PROVES_IT_SCANNED.test(code)) continue;
    out.push(rel(f));
  }
  return out.sort();
}

describe("META: a Sentinel that scanned nothing must not report clean", () => {
  it("VACUITY GUARD: this file's own scan actually found the test suite", () => {
    // The joke would write itself otherwise. If this number collapses, every
    // assertion below would pass for the exact reason this file exists to
    // police, so it is asserted FIRST and loudly.
    expect(
      TEST_FILES.length,
      "this meta-Sentinel found almost no test files — its own scan has drifted",
    ).toBeGreaterThan(150);
  });

  it("VACUITY GUARD: the detector can still recognise the shape it polices", () => {
    // Guards against the regexes silently ceasing to match anything — e.g. a
    // repo-wide migration to a different assertion style. If NOTHING in the
    // codebase asserts emptiness any more, this detector is dead weight and
    // must be re-derived rather than left reporting a clean bill of health.
    const assertEmptiness = TEST_FILES.filter((f) => {
      try { return ASSERTS_EMPTINESS.test(stripComments(readFileSync(f, "utf8"))); }
      catch { return false; }
    });
    expect(
      assertEmptiness.length,
      "no test asserts emptiness any more — this detector no longer detects",
    ).toBeGreaterThan(20);
  });

  it("THE GATE: no NEW scanning Sentinel may skip proving it scanned", () => {
    const found = unguardedScanners();
    const newcomers = found.filter((f) => !UNGUARDED_SCANNERS_DEBT.includes(f));
    expect(
      newcomers,
      `These Sentinels assert a violation set is EMPTY but never prove their ` +
        `scan found anything. If the scan drifts, they pass GREEN forever while ` +
        `policing nothing — which has already happened twice in this repo.\n\n` +
        `Add one assertion that the scan found material, e.g.\n` +
        `  expect(files.length).toBeGreaterThan(50);\n\n` +
        `New offenders:\n  ${newcomers.join("\n  ")}`,
    ).toEqual([]);
  });

  it("RATCHET: the debt ledger may only shrink, and must stay true", () => {
    // A file that has since been given a guard but left on the list makes the
    // recorded number a lie in the safe direction. Small lies about debt are
    // how a ledger stops being read.
    const found = unguardedScanners();
    const fixedButStillListed = UNGUARDED_SCANNERS_DEBT.filter(
      (f) => !found.includes(f),
    );
    expect(
      fixedButStillListed,
      `these now prove they scanned — delete them from UNGUARDED_SCANNERS_DEBT ` +
        `so the recorded debt stays honest:\n  ${fixedButStillListed.join("\n  ")}`,
    ).toEqual([]);
  });
});
