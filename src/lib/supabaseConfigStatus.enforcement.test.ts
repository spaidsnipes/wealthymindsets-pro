/**
 * supabaseConfigStatus enforcement — Sentinel source-tree scan.
 *
 * Monday Test 2 (2026-08-31) LAW: name the ACTUAL proven failure class. When
 * Supabase is unwired on the host, every auth route must return
 * {edge:"NOT CONFIGURED", missing:[…exact vars…]} via the shared
 * `supabaseConfigStatus` + `notConfiguredBody` helpers — not a vague
 * "account service is not configured" copy, not a stale "Vercel" instruction.
 *
 * This test walks src/app/api/auth/**\/route.ts and enforces two rules:
 *
 *  1. The FORBIDDEN vague-copy pattern must not appear.
 *     Bans: /the account service is not configured/i and near-variants that
 *     were the historic silent-truth-collapse form.
 *
 *  2. If a route emits ANY "not configured" copy for Supabase, it must import
 *     from `@/lib/supabaseConfigStatus` (the single writer). New auth routes
 *     inherit the honest surface automatically; regressions fail loud on CI.
 *
 * When it fires, either adopt the helper or provide an amendment removing
 * the ban with an explicit reason.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const AUTH_ROUTES_ROOT = resolve(__dirname, "..", "app", "api", "auth");
const API_ROOT = resolve(__dirname, "..", "app", "api");

// Copy patterns that were the historic vague form. Fail loud if they reappear.
const FORBIDDEN_PATTERNS: RegExp[] = [
  /account service is not configured/i,
  /account service could not be reached/i, // superseded by typed UPSTREAM UNREACHABLE
  // On 2026-09-05 sign-in and sign-up were both down and both blamed a paused
  // project. The project was probed directly during the outage and found alive,
  // answering JSON — the real cause was NEXT_PUBLIC_SUPABASE_URL holding a key.
  // A guess that reads like a diagnosis sends every operator to the wrong dial.
  /project (may be|might be|is|was) paused/i,
];

const HELPER_IMPORT = "@/lib/supabaseConfigStatus";

/**
 * The bans are on shipped COPY. A comment explaining why a sentence was removed
 * has to be able to quote it, or the record of the correction cannot be kept
 * next to the code it corrects.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

function isRouteFile(path: string): boolean {
  return path.endsWith("/route.ts") || path.endsWith("/route.tsx");
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      walk(p, acc);
    } else if (isRouteFile(p)) {
      acc.push(p);
    }
  }
  return acc;
}

describe("supabaseConfigStatus — single-writer enforcement across /api/auth", () => {
  const routes = walk(AUTH_ROUTES_ROOT);

  it("discovers at least the 5 known auth routes (guards against a stale walker)", () => {
    // signup, login, logout, logout-all, me, confirm, forgot-password,
    // resend-confirmation, update-profile — the walker sees them all.
    expect(routes.length).toBeGreaterThanOrEqual(5);
  });

  it("no auth route ships copy that was vague, or that was probed and disproven", () => {
    const violations: string[] = [];
    for (const path of routes) {
      const body = stripComments(readFileSync(path, "utf8"));
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(body)) {
          violations.push(`${path} matches ${pattern}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("every auth route that says 'NOT CONFIGURED' imports the shared helper", () => {
    const offenders: string[] = [];
    for (const path of routes) {
      const body = readFileSync(path, "utf8");
      if (!/NOT CONFIGURED/.test(body)) continue; // route may not need the config guard
      if (!body.includes(HELPER_IMPORT)) {
        offenders.push(`${path} emits NOT CONFIGURED but does not import from ${HELPER_IMPORT}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("api-tree NOT CONFIGURED shape — every route follows Monday Test 2 contract", () => {
  const allRoutes = walk(API_ROOT);

  it("every /api route that emits 'NOT CONFIGURED' also emits the {edge, missing} contract", () => {
    // The Monday Test 2 contract for a NOT CONFIGURED body is:
    //   { error: "...NOT CONFIGURED...", edge: "NOT CONFIGURED", missing: [...] }
    // Any route that surfaces the phrase without the two structured fields is
    // a partial adopter — an inspector/UI can't reliably render or classify it.
    //
    // Legitimate patterns the regex accepts:
    //   (a) inline literal:            edge: "NOT CONFIGURED"
    //   (b) typed error carrying it:   readonly edge = "NOT CONFIGURED"
    //   (c) shared helper:             import from @/lib/supabaseConfigStatus
    // Any of those + a missing:… field satisfies the contract.
    const offenders: string[] = [];
    for (const path of allRoutes) {
      // Strip comments so documentation that mentions the phrase is not a hit.
      const code = stripComments(readFileSync(path, "utf8"));
      if (!/NOT CONFIGURED/.test(code)) continue;
      const hasEdgeLiteral = /edge\s*[:=]\s*["']NOT CONFIGURED["']/.test(code);
      const importsHelper = /@\/lib\/supabaseConfigStatus/.test(code);
      const hasEdge = hasEdgeLiteral || importsHelper;
      const hasMissing = /missing[:\s]/.test(code) || importsHelper;
      if (!hasEdge || !hasMissing) {
        offenders.push(`${path}: hasEdge=${hasEdge} hasMissing=${hasMissing}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
