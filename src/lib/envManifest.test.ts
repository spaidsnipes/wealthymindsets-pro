import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { describe, it, expect } from "vitest";
import { stripComments } from "@/lib/sourceScan";

/**
 * ENV MANIFEST GATE — platform-independence / Cloudflare migration.
 *
 * Founder canon (Hosting Independence Runbook + Master Env Registry, 2026-08-23):
 * "CI must scan process.env references and fail when an active name is absent
 * from .env.example." A missing name is a MIGRATION_BLOCKER — a host cutover can
 * produce a green build with dead capabilities because a required variable was
 * never installed on the new runtime.
 *
 * This test is that gate: every process.env.NAME referenced by shipping code
 * must be declared (NAME=) in the code-owned, NAME-ONLY .env.example. It also
 * flags orphans (declared but unreferenced) as an informational warning so the
 * manifest cannot silently rot. NAMES ONLY — this test never reads secret values.
 *
 * HARDENED (K-Bkt 5B, 2026-09-22) after review found two vacuity holes:
 *   1. If `walk()` ever returned zero files (renamed src/, broken glob, a
 *      refactor to a typed env accessor), the "missing" list would be empty
 *      and the gate would pass while guarding NOTHING. The NOT-VACUOUS spec
 *      below pins scan volume: > 0 files scanned and > 0 env names found.
 *   2. Only dot-form `process.env.NAME` was scanned. Literal bracket form
 *      `process.env["NAME"]` compiles identically and would have slipped a
 *      new name past the manifest. Dynamic `process.env[expr]` cannot be
 *      statically resolved; those sites route through resolver tables that
 *      are guarded by their own enforcement tests (providerReadiness et al).
 *
 * GRANDFATHERED violations: NONE as of 2026-09-22 — measured 47 distinct
 * dot-form names in src (comments included), all shipping-code references
 * resolve against the 58 declared .env.example keys. If this gate ever needs
 * a grandfather list, new entries are FORBIDDEN; only deletions are allowed.
 */

const REPO_ROOT = resolve(__dirname, "..", "..");
const SRC = join(REPO_ROOT, "src");

// ALLOWLIST — runtime-provided by the platform / Node / the test runner
// itself, not user-configured secrets, so they are intentionally NOT required
// to appear in .env.example. Keep this list SHORT and each entry justified:
//   NODE_ENV     — set by Next/Node build+runtime
//   NEXT_RUNTIME — set by Next.js per-runtime ("edge" | "nodejs")
//   TZ           — process timezone, host-provided (tests set it as fixture)
//   CI / VITEST  — set by the CI runner / test runner, never by an installer
const RUNTIME_PROVIDED = new Set(["NODE_ENV", "NEXT_RUNTIME", "TZ", "CI", "VITEST"]);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      out.push(...walk(p));
    } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

/** Env names referenced by shipping code — excludes test files (which set up
 *  fixture env) so the gate reflects real runtime requirements. */
function referencedEnvNames(): { names: Set<string>; filesScanned: number } {
  const names = new Set<string>();
  const dotRe = /process\.env\.([A-Za-z_][A-Za-z0-9_]*)/g;
  // Literal bracket form — `process.env["NAME"]` / `process.env['NAME']`.
  // Dynamic `process.env[expr]` is unresolvable statically and excluded.
  const bracketRe = /process\.env\[["']([A-Za-z_][A-Za-z0-9_]*)["']\]/g;
  let filesScanned = 0;
  for (const file of walk(SRC)) {
    if (/\.test\.(ts|tsx|js|jsx)$/.test(file)) continue;
    filesScanned += 1;
    // Scan CODE, not commentary: a comment naming process.env.VERCEL must not
    // be reported as a variable this app actually reads. See src/lib/sourceScan.ts.
    const src = stripComments(readFileSync(file, "utf8"));
    let m: RegExpExecArray | null;
    while ((m = dotRe.exec(src)) !== null) names.add(m[1]);
    while ((m = bracketRe.exec(src)) !== null) names.add(m[1]);
  }
  return { names, filesScanned };
}

function declaredEnvNames(): Set<string> {
  const example = readFileSync(join(REPO_ROOT, ".env.example"), "utf8");
  const names = new Set<string>();
  for (const line of example.split("\n")) {
    const m = line.match(/^\s*#?\s*([A-Z_][A-Z0-9_]*)\s*=/);
    if (m) names.add(m[1]);
  }
  return names;
}

describe("env manifest gate — code references ↔ .env.example (migration blocker guard)", () => {
  it("is NOT VACUOUS: the scan actually found source files and env references", () => {
    const { names, filesScanned } = referencedEnvNames();
    // If either number hits zero the gate is guarding an empty room — that is
    // a broken scanner (moved src/, glob typo, typed-accessor refactor), not
    // a clean codebase. Fail loudly instead of passing silently.
    expect(filesScanned, "scanner found no source files under src/").toBeGreaterThan(0);
    expect(names.size, "scanner found no process.env references — rewire the scan").toBeGreaterThan(0);
  });

  it("declares every process.env name referenced by shipping code", () => {
    const referenced = referencedEnvNames().names;
    const declared = declaredEnvNames();
    const missing = [...referenced]
      .filter((n) => !RUNTIME_PROVIDED.has(n))
      .filter((n) => !declared.has(n))
      .sort();
    expect(
      missing,
      `MIGRATION_BLOCKER: these process.env names are read by code but NOT declared in ` +
        `.env.example — add them (NAME= , no value) so the migration installer can't miss them:\n  ${missing.join("\n  ")}`,
    ).toEqual([]);
  });

  it("has a non-trivial, self-consistent manifest (sanity)", () => {
    const declared = declaredEnvNames();
    expect(declared.size).toBeGreaterThanOrEqual(20); // guards against an emptied/renamed file
    // .env.example must never carry a value (NAMES ONLY law).
    const example = readFileSync(join(REPO_ROOT, ".env.example"), "utf8");
    const withValue = example
      .split("\n")
      .filter((l) => /^\s*[A-Z_][A-Z0-9_]*\s*=\s*\S/.test(l));
    expect(withValue, `NAMES ONLY: .env.example must not contain values:\n  ${withValue.join("\n  ")}`).toEqual([]);
  });
});
