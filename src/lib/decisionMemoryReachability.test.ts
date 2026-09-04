/**
 * decisionMemoryReachability — the Decision Memory capability is READ-wired and
 * WRITE-orphaned, and this file pins that as a NAMED BLOCKER.
 *
 * The shape, stated plainly:
 *
 *   DecisionMemoryStore.put() is the store's ONLY ingress. Its only caller in
 *   the whole repository is the store's own unit test. Therefore in production
 *   the decision-memory store is not "probably empty" — it is PROVABLY empty,
 *   for every owner, forever, by construction.
 *
 *   Meanwhile three production surfaces read from it: /command-deck, /profile,
 *   and useMarketCanvasVM.
 *
 * Why this is NOT a screen lie, and so is not fixed here:
 *
 *   All three readers union the (always-empty) store list with real Journal
 *   decisions, so they degrade to journal-only and render honest empty states.
 *   The Decision Receipt has an explicit "honest empty state when nothing is
 *   sealed yet" branch. Nothing on screen claims a sealed decision exists.
 *
 * What IS dead, and is worth seeing:
 *
 *   /command-deck derives `hasOpenPosition` and `hasUnreviewedClose` from
 *   `decisionRecords` alone, with no journal fallback. Because the store can
 *   never be written, both are pinned false in production — the job-mode
 *   inference can never reach MANAGE or REVIEW by way of decision state, and
 *   the Exit Ramp can never report "decision record(s) preserved".
 *
 * This is the same defect class as the `showLaunchCoin` form removed in
 * 27cfc13, one level up: that was an orphaned PANEL behind a closed door;
 * this is an orphaned CAPABILITY. chartPanelDoorway.test.ts sweeps for the
 * former and cannot see the latter — a capability has no mount to notice.
 *
 * Recorded as the CURRENT state rather than skipped, following the §14.13
 * named-blocker precedent in buildOrderInvariants.test.ts: the suite stays
 * green, the gap stays visible, and these assertions flip the moment somebody
 * either wires a writer or deletes the capability. Deliberately NOT wired here
 * — sealing a decision requires a real decision surface and a real trigger;
 * inventing a caller to turn this file green would manufacture exactly the
 * kind of unreachable ceremony it exists to detect.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(__dirname, "..", "..");
const SRC = join(REPO_ROOT, "src");

const WRITE_MODULE = "src/lib/traderMemory/decisionMemory.ts";
const STORE_MODULE = "src/lib/traderMemory/decisionMemoryStore.ts";
const HOOK_MODULE = "src/lib/traderMemory/useDecisionMemory.ts";
const ORPHAN_MODULE = "src/lib/decisionMemory.ts";

/** Production sources only: no test files, no __tests__ fixtures. */
function walkProduction(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "node_modules" || name === ".next" || name === "__tests__") continue;
      out.push(...walkProduction(p));
      continue;
    }
    if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

/**
 * Strip comments AND import statements before looking for a symbol.
 *
 * Importing a name is not using it — a module can import a symbol and never
 * reach it. Counting the import line as a call site would report the write
 * path as wired the moment anyone added an unused import.
 */
function productionBody(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/^\s*import[\s\S]*?from\s*["'][^"']*["'];/gm, "");
}

/**
 * Files that REFERENCE `sym`, not merely files that CALL it.
 *
 * This deliberately matches a bare identifier rather than `sym(`. The store
 * reaches toDecisionSnapshot point-free, as `.map(toDecisionSnapshot)`, and a
 * call-syntax detector scores that as zero. A writer could be wired the same
 * point-free way; a detector that missed it would keep reporting "no writers"
 * while records flowed into the store. The positive control below exists to
 * keep this honest.
 */
function referencingFiles(sym: string, exclude: readonly string[]): string[] {
  const hits: string[] = [];
  for (const abs of walkProduction(SRC)) {
    const rel = relative(REPO_ROOT, abs);
    if (exclude.includes(rel)) continue;
    if (new RegExp(`\\b${sym}\\b`).test(productionBody(readFileSync(abs, "utf8")))) {
      hits.push(rel);
    }
  }
  return hits.sort();
}

/** Resolve a relative import specifier against the importing file's own dir. */
function resolvesTo(fromRel: string, spec: string, targetRel: string): boolean {
  if (!spec.startsWith(".")) return false;
  const abs = resolve(dirname(join(REPO_ROOT, fromRel)), spec);
  return relative(REPO_ROOT, abs) === targetRel.replace(/\.ts$/, "");
}

describe("decision memory reachability", () => {
  it("the detector is not vacuous and can see a point-free reference", () => {
    // Axis 1: the walk actually reaches the app.
    const files = walkProduction(SRC);
    expect(files.length).toBeGreaterThan(300);

    // Axis 2 — POSITIVE CONTROL. toDecisionSnapshot is referenced exactly once
    // in production, and ONLY point-free: `this.list(ownerId).map(toDecisionSnapshot)`.
    // If someone "simplifies" referencingFiles() back to matching `sym(`, this
    // control goes red before any zero-count assertion below can go quietly,
    // wrongly green. A detector that silently matches nothing reports "no
    // orphans" forever, and that reads exactly like a clean bill of health.
    expect(referencingFiles("toDecisionSnapshot", [WRITE_MODULE])).toEqual([STORE_MODULE]);
  });

  it("BLOCKER: the decision-memory write path has zero production callers", () => {
    // Every mutator that produces or evolves a sealed decision record.
    const writePath = [
      "sealDecision",
      "appendManagement",
      "attachOutcome",
      "attachReview",
      "amendDecision",
      "scopeToOwner",
    ];
    const wired: Record<string, string[]> = {};
    for (const sym of writePath) {
      const hits = referencingFiles(sym, [WRITE_MODULE]);
      if (hits.length > 0) wired[sym] = hits;
    }

    // Asserted as the CURRENT state, on purpose. When a real decision surface
    // starts sealing, this object gains a key and this test fails ON PURPOSE —
    // that failure is the signal to move the capability out of this ledger,
    // not to loosen the assertion.
    expect(wired).toEqual({});
  });

  it("BLOCKER: the store's only ingress has no production writer, so it is provably empty", () => {
    const store = readFileSync(join(REPO_ROOT, STORE_MODULE), "utf8");

    // put() is the sole way a record enters the store. If a second ingress is
    // added, this test must be revisited before the emptiness claim holds.
    const mutators = [...store.matchAll(/^ {2}([a-zA-Z]+)\(/gm)]
      .map((m) => m[1])
      .filter((m) => ["put", "clear", "clearOwner"].includes(m));
    expect(mutators).toContain("put");

    // No production file outside the store module calls .put( on it.
    const writers = referencingFiles("decisionMemoryStore", [STORE_MODULE, HOOK_MODULE]);
    expect(writers).toEqual([]);
  });

  it("the read path IS wired — three production consumers, path-qualified", () => {
    // The other half of the truth, and what makes this a blocker worth naming
    // rather than dead code worth deleting: real surfaces already subscribe.
    // Path-qualified so wiring a fourth consumer, or dropping one, trips here.
    const consumers = walkProduction(SRC)
      .map((abs) => relative(REPO_ROOT, abs))
      .filter((rel) => rel !== HOOK_MODULE)
      .filter((rel) =>
        /from "@\/lib\/traderMemory\/useDecisionMemory"/.test(
          readFileSync(join(REPO_ROOT, rel), "utf8"),
        ),
      )
      .sort();

    expect(consumers).toEqual([
      "src/app/command-deck/page.tsx",
      "src/app/profile/page.tsx",
      "src/lib/marketData/viewModels/useMarketCanvasVM.ts",
    ]);
  });

  it("RESOLVED: the two schema-version constants can never collide again", () => {
    const orphan = readFileSync(join(REPO_ROOT, ORPHAN_MODULE), "utf8");
    const live = readFileSync(join(REPO_ROOT, WRITE_MODULE), "utf8");

    const versionOf = (code: string): string | null =>
      code.match(/DECISION_MEMORY_SCHEMA_VERSION = "([^"]+)"/)?.[1] ?? null;

    // POSITIVE CONTROL. The extractor must genuinely read a version out of a
    // declaration AND return null when there is none. Without both halves, a
    // regex that quietly stopped matching would make every assertion below
    // compare null to null — and `expect(null).not.toEqual(null)` is exactly
    // the shape of test that looks like proof and proves nothing.
    expect(versionOf('export const DECISION_MEMORY_SCHEMA_VERSION = "probe.v9" as const;'))
      .toBe("probe.v9");
    expect(versionOf("export const SOMETHING_ELSE = 1;")).toBeNull();

    const orphanVersion = versionOf(orphan);
    const liveVersion = versionOf(live);
    expect(orphanVersion).not.toBeNull();
    expect(liveVersion).not.toBeNull();

    // The record shapes are still different. That was never the bug and is not
    // what got fixed — two modules are allowed to model different things.
    expect(orphan).toContain("interface SealedDecisionMemory");
    expect(live).toContain("interface DecisionMemoryRecord");

    // THE FIX: they no longer carry the identical version tag. Before
    // 2026-09-04 both read "wm.decision-memory.v1", so two incompatible
    // payloads could present the same version and no reader could tell them
    // apart — a migration gate that cannot gate. The hazard was latent only
    // because ORPHAN_MODULE is reachable from nothing in production; the
    // moment it gained a production importer it would have become real.
    expect(orphanVersion).not.toEqual(liveVersion);

    // Pinned by exact value, not merely by inequality. "They differ" is
    // satisfiable by renaming the LIVE tag, which is the one three production
    // surfaces read and therefore the one that must not move.
    expect(liveVersion).toBe("wm.decision-memory.v1");
    expect(orphanVersion).toBe("wm.decision-seal.v1");
  });

  it("BLOCKER: the orphan module still has zero production importers", () => {
    // The rename removed the collision's TEETH, not the orphan itself. This
    // module is still dead weight in production and is still tracked as such.
    const importers = walkProduction(SRC)
      .map((abs) => relative(REPO_ROOT, abs))
      .filter((rel) => rel !== ORPHAN_MODULE)
      .filter((rel) => {
        const code = readFileSync(join(REPO_ROOT, rel), "utf8");
        return [...code.matchAll(/from\s*["']([^"']+)["']/g)].some(
          (m) =>
            resolvesTo(rel, m[1], ORPHAN_MODULE) ||
            m[1] === "@/lib/decisionMemory",
        );
      })
      .sort();

    expect(importers).toEqual([]);
  });
});
