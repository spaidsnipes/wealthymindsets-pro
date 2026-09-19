import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import { describe, it, expect } from "vitest";

/**
 * BUILD-SAFETY LAW — platform-independence / Cloudflare migration
 * (Master Env Registry, Weakness #5, 2026-08-23):
 *
 *   "No route may instantiate a privileged external client at module scope
 *    unless the build is guaranteed to have that configuration. Prefer
 *    getSupabaseAdmin() / lazy factories with explicit validation and typed
 *    errors."
 *
 * Module-scope `createClient(URL!, KEY!)` evaluates env at import time; under
 * OpenNext/workerd (or any build that lacks the value) it throws and turns one
 * missing key into a full build failure that can cascade into unrelated page
 * data collection. The fix already shipped (src/lib/supabase.ts,
 * src/lib/supabaseAdmin.ts are guarded lazy factories). This test LOCKS it so a
 * future edit cannot silently reintroduce a module-scope privileged client.
 *
 * Invariant: the privileged `createClient` from @supabase/supabase-js may only
 * be imported by the approved lazy-factory modules, and each factory must guard
 * on missing config (return null) before constructing the client.
 */

const REPO_ROOT = resolve(__dirname, "..", "..");
const SRC = join(REPO_ROOT, "src");

// The ONLY modules permitted to import the privileged supabase client factory.
const APPROVED = new Set(["src/lib/supabase.ts", "src/lib/supabaseAdmin.ts"]);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      out.push(...walk(p));
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

/** Walked ONCE so the vacuity guard below and the rule below it agree. */
const FILES = walk(SRC);

describe("build-safety — privileged supabase client is lazy-only (migration blocker guard)", () => {
  /**
   * ANTI-VACUITY — added 2026-09-19, paying down the frozen debt recorded in
   * `src/lib/ops/sentinelsProveTheyScanned.test.ts`.
   *
   * The rule below asserts a collection is EMPTY. That shape has a silent
   * failure mode: if `walk()` ever returns nothing — a rename of `src/`, a
   * changed extension filter, a thrown `statSync` swallowed upstream — the
   * offender list is empty for the wrong reason and the gate reports green over
   * zero bytes. Green must mean "looked and found nothing", never "did not
   * look".
   *
   * Two guards, because file COUNT alone is not enough: a scan could walk a
   * thousand files and still be blind if the import string it matches on has
   * been renamed by an upstream package. So the positive control proves the
   * PATTERN still matches — the approved factories must themselves trip it.
   */
  it("ANTI-VACUITY: the scan reaches real source and the pattern still matches", () => {
    expect(
      FILES.length,
      "walk(src) found almost no TypeScript — did src/ move, or did the " +
        "extension filter stop matching? An empty scan would make the rule " +
        "below permanently green while enforcing nothing",
    ).toBeGreaterThan(200);

    // Positive control: the APPROVED factories are the known-good matches.
    // If they stop tripping the pattern, the pattern is stale and the rule
    // below would pass over a tree full of direct imports.
    const approvedThatMatch = [...APPROVED].filter((rel) =>
      readFileSync(join(REPO_ROOT, rel), "utf8").includes('from "@supabase/supabase-js"'),
    );
    expect(
      approvedThatMatch.sort(),
      "the approved lazy factories no longer import @supabase/supabase-js by " +
        "the exact string this gate scans for — the import specifier changed " +
        "and the rule below is now looking for something that does not exist",
    ).toEqual([...APPROVED].sort());
  });

  it("only the approved lazy factories import @supabase/supabase-js", () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const src = readFileSync(file, "utf8");
      if (src.includes('from "@supabase/supabase-js"')) {
        const rel = relative(REPO_ROOT, file);
        if (!APPROVED.has(rel)) offenders.push(rel);
      }
    }
    expect(
      offenders,
      `BUILD-SAFETY: these modules import the privileged supabase createClient directly. ` +
        `Route them through getSupabaseAdmin()/getSupabase() (src/lib/supabaseAdmin.ts) so no ` +
        `privileged client is constructed at module scope:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });

  it("each approved factory guards on missing config before constructing the client", () => {
    for (const rel of APPROVED) {
      const src = readFileSync(join(REPO_ROOT, rel), "utf8");
      expect(src, `${rel} must construct the client`).toContain("createClient(");
      // A null-guard on missing env must exist so a missing key degrades the
      // capability instead of crashing the build/request.
      expect(src, `${rel} must guard missing config with 'return null'`).toMatch(/return null/);
      expect(src, `${rel} must read config from process.env at call time`).toContain("process.env.");
    }
  });
});
