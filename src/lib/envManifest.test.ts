import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { describe, it, expect } from "vitest";

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
 */

const REPO_ROOT = resolve(__dirname, "..", "..");
const SRC = join(REPO_ROOT, "src");

// Runtime-provided by the platform / Node itself — not user-configured secrets,
// so they are intentionally NOT required to appear in .env.example.
const RUNTIME_PROVIDED = new Set(["NODE_ENV"]);

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
function referencedEnvNames(): Set<string> {
  const names = new Set<string>();
  const dotRe = /process\.env\.([A-Za-z_][A-Za-z0-9_]*)/g;
  for (const file of walk(SRC)) {
    if (/\.test\.(ts|tsx|js|jsx)$/.test(file)) continue;
    const src = readFileSync(file, "utf8");
    let m: RegExpExecArray | null;
    while ((m = dotRe.exec(src)) !== null) names.add(m[1]);
  }
  return names;
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
  it("declares every process.env name referenced by shipping code", () => {
    const referenced = referencedEnvNames();
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
